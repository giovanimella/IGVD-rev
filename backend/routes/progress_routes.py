from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from models import UserProgress, ProgressUpdate
from auth import get_current_user
import os
from datetime import datetime, timezone

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/progress", tags=["progress"])

# Porcentagem mínima para marcar como completo
MIN_WATCH_PERCENTAGE = 90

async def update_challenge_progress(user_id: str):
    """Atualiza o progresso dos desafios semanais ativos"""
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Buscar desafios ativos
    active_challenges = await db.weekly_challenges.find({
        "active": True,
        "start_date": {"$lte": today},
        "end_date": {"$gte": today}
    }, {"_id": 0}).to_list(100)
    
    for challenge in active_challenges:
        challenge_type = challenge.get("challenge_type", "")
        target_value = challenge.get("target_value", 0)
        
        # Calcular progresso baseado no tipo de desafio
        current_progress = 0
        
        if challenge_type == "complete_chapters":
            # Contar capítulos completos nesta semana
            week_start = challenge.get("start_date")
            completed_count = await db.user_progress.count_documents({
                "user_id": user_id,
                "completed": True,
                "completed_at": {"$gte": week_start}
            })
            current_progress = completed_count
            
        elif challenge_type == "complete_modules":
            # Contar módulos completos
            modules = await db.modules.find({}, {"_id": 0, "id": 1}).to_list(1000)
            completed_modules = 0
            for module in modules:
                total_chapters = await db.chapters.count_documents({"module_id": module["id"]})
                if total_chapters == 0:
                    continue
                completed_chapters = await db.user_progress.count_documents({
                    "user_id": user_id,
                    "module_id": module["id"],
                    "completed": True
                })
                if completed_chapters >= total_chapters:
                    completed_modules += 1
            current_progress = completed_modules
            
        elif challenge_type == "earn_points":
            # Verificar pontos do usuário
            user = await db.users.find_one({"id": user_id}, {"_id": 0, "points": 1})
            current_progress = user.get("points", 0) if user else 0
            
        elif challenge_type == "daily_access":
            # Contar dias de acesso na semana (baseado em streak)
            user = await db.users.find_one({"id": user_id}, {"_id": 0, "current_streak": 1})
            current_progress = user.get("current_streak", 0) if user else 0
        
        # Verificar se completou o desafio
        is_completed = current_progress >= target_value
        
        # Buscar progresso existente
        existing_progress = await db.user_challenge_progress.find_one({
            "user_id": user_id,
            "challenge_id": challenge["id"]
        })
        
        if existing_progress:
            # Só atualizar se não estava completo antes
            if not existing_progress.get("completed", False):
                update_data = {"current_progress": current_progress}
                
                if is_completed:
                    update_data["completed"] = True
                    update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
                    
                    # Dar pontos de recompensa
                    await db.users.update_one(
                        {"id": user_id},
                        {"$inc": {"points": challenge.get("points_reward", 0)}}
                    )
                
                await db.user_challenge_progress.update_one(
                    {"id": existing_progress["id"]},
                    {"$set": update_data}
                )
        else:
            # Criar novo progresso
            from models import UserChallengeProgress
            new_progress = UserChallengeProgress(
                user_id=user_id,
                challenge_id=challenge["id"],
                current_progress=current_progress,
                completed=is_completed,
                completed_at=datetime.now(timezone.utc).isoformat() if is_completed else None
            )
            await db.user_challenge_progress.insert_one(new_progress.model_dump())
            
            if is_completed:
                await db.users.update_one(
                    {"id": user_id},
                    {"$inc": {"points": challenge.get("points_reward", 0)}}
                )

@router.post("/update")
async def update_progress(progress_data: ProgressUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.user_progress.find_one({
        "user_id": current_user["sub"],
        "chapter_id": progress_data.chapter_id
    }, {"_id": 0})
    
    # Validação: só pode marcar como completo se assistiu pelo menos MIN_WATCH_PERCENTAGE%
    can_complete = progress_data.watched_percentage >= MIN_WATCH_PERCENTAGE
    should_complete = progress_data.completed and can_complete
    
    if progress_data.completed and not can_complete:
        raise HTTPException(
            status_code=400, 
            detail=f"Você precisa assistir pelo menos {MIN_WATCH_PERCENTAGE}% do conteúdo para marcar como completo. Progresso atual: {progress_data.watched_percentage}%"
        )
    
    if existing:
        update_data = {
            "watched_percentage": progress_data.watched_percentage
        }
        
        if should_complete and not existing.get("completed", False):
            update_data["completed"] = True
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
            
            # Atualizar progresso dos desafios semanais
            await update_challenge_progress(current_user["sub"])
            
            module_chapters = await db.chapters.find({"module_id": progress_data.module_id}, {"_id": 0}).to_list(1000)
            all_completed = True
            for chapter in module_chapters:
                if chapter["id"] == progress_data.chapter_id:
                    continue
                chapter_progress = await db.user_progress.find_one({
                    "user_id": current_user["sub"],
                    "chapter_id": chapter["id"]
                })
                if not chapter_progress or not chapter_progress.get("completed", False):
                    all_completed = False
                    break
            
            if all_completed:
                module = await db.modules.find_one({"id": progress_data.module_id}, {"_id": 0})
                if module and module.get("points_reward", 0) > 0:
                    await db.users.update_one(
                        {"id": current_user["sub"]},
                        {"$inc": {"points": module["points_reward"]}}
                    )
                
                # Criar notificação para o usuário
                user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
                from routes.notification_routes import create_notification, notify_admins
                
                await create_notification(
                    current_user["sub"],
                    "Módulo Concluído! 🎉",
                    f"Parabéns! Você concluiu o módulo '{module['title']}' e ganhou {module.get('points_reward', 0)} pontos!",
                    "module_completed",
                    module["id"]
                )
                
                # Notificar admins
                await notify_admins(
                    "Licenciado completou módulo",
                    f"{user['full_name']} concluiu o módulo '{module['title']}'",
                    "admin_notification",
                    module["id"]
                )
                
                # Verificar se precisa avançar o estágio do onboarding
                if user.get("current_stage") == "acolhimento" and module.get("is_acolhimento"):
                    # Verificar se todos os módulos de acolhimento foram concluídos
                    acolhimento_modules = await db.modules.find({"is_acolhimento": True}, {"_id": 0, "id": 1}).to_list(100)
                    all_acolhimento_completed = True
                    
                    for acolh_module in acolhimento_modules:
                        module_chapters = await db.chapters.find({"module_id": acolh_module["id"]}, {"_id": 0, "id": 1}).to_list(100)
                        for chapter in module_chapters:
                            chapter_progress = await db.user_progress.find_one({
                                "user_id": current_user["sub"],
                                "chapter_id": chapter["id"],
                                "completed": True
                            })
                            if not chapter_progress:
                                all_acolhimento_completed = False
                                break
                        if not all_acolhimento_completed:
                            break
                    
                    if all_acolhimento_completed:
                        # Avançar para próxima etapa do onboarding (treinamento presencial)
                        await db.users.update_one(
                            {"id": current_user["sub"]},
                            {"$set": {"current_stage": "treinamento_presencial"}}
                        )
                        
                        await create_notification(
                            current_user["sub"],
                            "Acolhimento Concluído! 🎓",
                            "Parabéns! Você concluiu todos os módulos de acolhimento. Agora você pode se inscrever no treinamento presencial.",
                            "onboarding_stage",
                            "treinamento_presencial"
                        )
        
        await db.user_progress.update_one(
            {"id": existing["id"]},
            {"$set": update_data}
        )
    else:
        # Validação para novo progresso
        can_complete = progress_data.watched_percentage >= MIN_WATCH_PERCENTAGE
        should_complete = progress_data.completed and can_complete
        
        if progress_data.completed and not can_complete:
            raise HTTPException(
                status_code=400, 
                detail=f"Você precisa assistir pelo menos {MIN_WATCH_PERCENTAGE}% do conteúdo para marcar como completo. Progresso atual: {progress_data.watched_percentage}%"
            )
        
        progress = UserProgress(
            user_id=current_user["sub"],
            module_id=progress_data.module_id,
            chapter_id=progress_data.chapter_id,
            completed=should_complete,
            watched_percentage=progress_data.watched_percentage
        )
        
        if should_complete:
            progress.completed_at = datetime.now(timezone.utc).isoformat()
            # Atualizar progresso dos desafios semanais
            await update_challenge_progress(current_user["sub"])
        
        await db.user_progress.insert_one(progress.model_dump())
        
        # Verificar se completou o módulo (mesmo lógica do bloco existing)
        if should_complete:
            module_chapters = await db.chapters.find({"module_id": progress_data.module_id}, {"_id": 0}).to_list(1000)
            all_completed = True
            for chapter in module_chapters:
                if chapter["id"] == progress_data.chapter_id:
                    continue  # Já sabemos que este está completo
                chapter_progress = await db.user_progress.find_one({
                    "user_id": current_user["sub"],
                    "chapter_id": chapter["id"]
                })
                if not chapter_progress or not chapter_progress.get("completed", False):
                    all_completed = False
                    break
            
            if all_completed:
                module = await db.modules.find_one({"id": progress_data.module_id}, {"_id": 0})
                if module and module.get("points_reward", 0) > 0:
                    await db.users.update_one(
                        {"id": current_user["sub"]},
                        {"$inc": {"points": module["points_reward"]}}
                    )
                
                # Criar notificação para o usuário
                user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
                from routes.notification_routes import create_notification, notify_admins
                
                await create_notification(
                    current_user["sub"],
                    "Módulo Concluído! 🎉",
                    f"Parabéns! Você concluiu o módulo '{module['title']}' e ganhou {module.get('points_reward', 0)} pontos!",
                    "module_completed",
                    module["id"]
                )
                
                # Notificar admins
                await notify_admins(
                    "Licenciado completou módulo",
                    f"{user['full_name']} concluiu o módulo '{module['title']}'",
                    "admin_notification",
                    module["id"]
                )
                
                # Verificar se precisa avançar o estágio do onboarding
                if user.get("current_stage") == "acolhimento" and module.get("is_acolhimento"):
                    # Verificar se todos os módulos de acolhimento foram concluídos
                    acolhimento_modules = await db.modules.find({"is_acolhimento": True}, {"_id": 0, "id": 1}).to_list(100)
                    all_acolhimento_completed = True
                    
                    for acolh_module in acolhimento_modules:
                        acolh_chapters = await db.chapters.find({"module_id": acolh_module["id"]}, {"_id": 0, "id": 1}).to_list(100)
                        for acolh_chapter in acolh_chapters:
                            chapter_prog = await db.user_progress.find_one({
                                "user_id": current_user["sub"],
                                "chapter_id": acolh_chapter["id"],
                                "completed": True
                            })
                            if not chapter_prog:
                                all_acolhimento_completed = False
                                break
                        if not all_acolhimento_completed:
                            break
                    
                    if all_acolhimento_completed:
                        # Avançar para próxima etapa do onboarding (treinamento presencial)
                        await db.users.update_one(
                            {"id": current_user["sub"]},
                            {"$set": {"current_stage": "treinamento_presencial"}}
                        )
                        
                        await create_notification(
                            current_user["sub"],
                            "Acolhimento Concluído! 🎓",
                            "Parabéns! Você concluiu todos os módulos de acolhimento. Agora você pode se inscrever no treinamento presencial.",
                            "onboarding_stage",
                            "treinamento_presencial"
                        )
    
    return {"message": "Progresso atualizado com sucesso"}

@router.get("/my-progress")
async def get_my_progress(current_user: dict = Depends(get_current_user)):
    progress = await db.user_progress.find({"user_id": current_user["sub"]}, {"_id": 0}).to_list(1000)
    return progress

@router.get("/module/{module_id}")
async def get_module_progress(module_id: str, current_user: dict = Depends(get_current_user)):
    progress = await db.user_progress.find({
        "user_id": current_user["sub"],
        "module_id": module_id
    }, {"_id": 0}).to_list(1000)
    
    total_chapters = await db.chapters.count_documents({"module_id": module_id})
    completed_chapters = sum(1 for p in progress if p.get("completed", False))
    
    return {
        "progress": progress,
        "total_chapters": total_chapters,
        "completed_chapters": completed_chapters,
        "percentage": (completed_chapters / total_chapters * 100) if total_chapters > 0 else 0
    }