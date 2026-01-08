from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from models import (
    Badge, BadgeCreate, UserBadge, UserStreak,
    WeeklyChallenge, WeeklyChallengeCreate, UserChallengeProgress
)
from auth import get_current_user, require_role
import os
from datetime import datetime, timedelta

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/gamification", tags=["gamification"])

# ==================== BADGES ====================

@router.get("/badges")
async def get_all_badges(current_user: dict = Depends(get_current_user)):
    """Lista todos os badges ativos"""
    badges = await db.badges.find({"active": True}, {"_id": 0}).to_list(100)
    return badges

@router.get("/badges/all")
async def get_all_badges_admin(current_user: dict = Depends(require_role(["admin"]))):
    """Lista todos os badges (admin)"""
    badges = await db.badges.find({}, {"_id": 0}).to_list(100)
    return badges

@router.post("/badges")
async def create_badge(badge_data: BadgeCreate, current_user: dict = Depends(require_role(["admin"]))):
    """Criar novo badge (admin)"""
    badge = Badge(**badge_data.model_dump())
    await db.badges.insert_one(badge.model_dump())
    return {"message": "Badge criado com sucesso", "badge": badge.model_dump()}

@router.put("/badges/{badge_id}")
async def update_badge(badge_id: str, badge_data: BadgeCreate, current_user: dict = Depends(require_role(["admin"]))):
    """Atualizar badge (admin)"""
    existing = await db.badges.find_one({"id": badge_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Badge não encontrado")
    
    await db.badges.update_one(
        {"id": badge_id},
        {"$set": badge_data.model_dump()}
    )
    return {"message": "Badge atualizado com sucesso"}

@router.delete("/badges/{badge_id}")
async def delete_badge(badge_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """Deletar badge (admin)"""
    result = await db.badges.delete_one({"id": badge_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Badge não encontrado")
    
    # Remover badges conquistados relacionados
    await db.user_badges.delete_many({"badge_id": badge_id})
    return {"message": "Badge deletado com sucesso"}

@router.get("/my-badges")
async def get_my_badges(current_user: dict = Depends(get_current_user)):
    """Lista badges conquistados pelo usuário"""
    user_id = current_user["sub"]
    
    # Buscar badges do usuário
    user_badges = await db.user_badges.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    # Enriquecer com dados dos badges
    badges_with_info = []
    for ub in user_badges:
        badge = await db.badges.find_one({"id": ub["badge_id"]}, {"_id": 0})
        if badge:
            badges_with_info.append({
                **badge,
                "earned_at": ub["earned_at"]
            })
    
    return badges_with_info

@router.post("/badges/{badge_id}/award/{user_id}")
async def award_badge_manually(badge_id: str, user_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """Conceder badge manualmente a um usuário (admin)"""
    # Verificar se o badge existe
    badge = await db.badges.find_one({"id": badge_id})
    if not badge:
        raise HTTPException(status_code=404, detail="Badge não encontrado")
    
    # Verificar se usuário existe
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar se já tem o badge
    existing = await db.user_badges.find_one({"user_id": user_id, "badge_id": badge_id})
    if existing:
        raise HTTPException(status_code=400, detail="Usuário já possui este badge")
    
    # Conceder badge
    user_badge = UserBadge(user_id=user_id, badge_id=badge_id)
    await db.user_badges.insert_one(user_badge.model_dump())
    
    # Dar pontos se houver
    if badge.get("points_reward", 0) > 0:
        await db.users.update_one(
            {"id": user_id},
            {"$inc": {"points": badge["points_reward"]}}
        )
    
    return {"message": f"Badge '{badge['name']}' concedido com sucesso"}

# ==================== STREAKS ====================

@router.get("/streak")
async def get_my_streak(current_user: dict = Depends(get_current_user)):
    """Retorna o streak atual do usuário"""
    user_id = current_user["sub"]
    
    streak = await db.user_streaks.find_one({"user_id": user_id}, {"_id": 0})
    if not streak:
        # Criar streak inicial
        streak = UserStreak(user_id=user_id).model_dump()
        await db.user_streaks.insert_one(streak)
    
    return streak

@router.post("/streak/update")
async def update_streak(current_user: dict = Depends(get_current_user)):
    """Atualiza o streak do usuário ao acessar a plataforma"""
    user_id = current_user["sub"]
    today = datetime.now().strftime("%Y-%m-%d")
    
    streak = await db.user_streaks.find_one({"user_id": user_id})
    
    if not streak:
        # Criar streak inicial
        streak_obj = UserStreak(user_id=user_id, current_streak=1, longest_streak=1, last_access_date=today)
        await db.user_streaks.insert_one(streak_obj.model_dump())
        return {"current_streak": 1, "longest_streak": 1, "message": "Streak iniciado!"}
    
    last_date = streak.get("last_access_date", "")
    
    # Se já acessou hoje, não faz nada
    if last_date == today:
        return {
            "current_streak": streak["current_streak"],
            "longest_streak": streak["longest_streak"],
            "message": "Já acessou hoje"
        }
    
    # Verificar se é dia consecutivo
    try:
        last_dt = datetime.strptime(last_date, "%Y-%m-%d")
        today_dt = datetime.strptime(today, "%Y-%m-%d")
        diff = (today_dt - last_dt).days
    except:
        diff = 999  # Se der erro, reseta o streak
    
    if diff == 1:
        # Dia consecutivo - incrementa streak
        new_streak = streak["current_streak"] + 1
        longest = max(new_streak, streak.get("longest_streak", 0))
        
        await db.user_streaks.update_one(
            {"user_id": user_id},
            {"$set": {
                "current_streak": new_streak,
                "longest_streak": longest,
                "last_access_date": today,
                "updated_at": datetime.now().isoformat()
            }}
        )
        return {
            "current_streak": new_streak,
            "longest_streak": longest,
            "message": f"Streak de {new_streak} dias! 🔥"
        }
    else:
        # Perdeu o streak - reseta
        await db.user_streaks.update_one(
            {"user_id": user_id},
            {"$set": {
                "current_streak": 1,
                "last_access_date": today,
                "updated_at": datetime.now().isoformat()
            }}
        )
        return {
            "current_streak": 1,
            "longest_streak": streak.get("longest_streak", 1),
            "message": "Streak resetado. Comece novamente!"
        }

# ==================== DESAFIOS SEMANAIS ====================

@router.get("/challenges")
async def get_active_challenges(current_user: dict = Depends(get_current_user)):
    """Lista desafios ativos"""
    today = datetime.now().strftime("%Y-%m-%d")
    
    challenges = await db.weekly_challenges.find({
        "active": True,
        "start_date": {"$lte": today},
        "end_date": {"$gte": today}
    }, {"_id": 0}).to_list(100)
    
    return challenges

@router.get("/challenges/all")
async def get_all_challenges(current_user: dict = Depends(require_role(["admin"]))):
    """Lista todos os desafios (admin)"""
    challenges = await db.weekly_challenges.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return challenges

@router.post("/challenges")
async def create_challenge(challenge_data: WeeklyChallengeCreate, current_user: dict = Depends(require_role(["admin"]))):
    """Criar novo desafio (admin)"""
    challenge = WeeklyChallenge(
        **challenge_data.model_dump(),
        created_by=current_user["sub"]
    )
    await db.weekly_challenges.insert_one(challenge.model_dump())
    return {"message": "Desafio criado com sucesso", "challenge": challenge.model_dump()}

@router.put("/challenges/{challenge_id}")
async def update_challenge(challenge_id: str, challenge_data: WeeklyChallengeCreate, current_user: dict = Depends(require_role(["admin"]))):
    """Atualizar desafio (admin)"""
    existing = await db.weekly_challenges.find_one({"id": challenge_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Desafio não encontrado")
    
    await db.weekly_challenges.update_one(
        {"id": challenge_id},
        {"$set": challenge_data.model_dump()}
    )
    return {"message": "Desafio atualizado com sucesso"}

@router.delete("/challenges/{challenge_id}")
async def delete_challenge(challenge_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """Deletar desafio (admin)"""
    result = await db.weekly_challenges.delete_one({"id": challenge_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Desafio não encontrado")
    
    # Remover progresso relacionado
    await db.user_challenge_progress.delete_many({"challenge_id": challenge_id})
    return {"message": "Desafio deletado com sucesso"}

@router.get("/challenges/my-progress")
async def get_my_challenge_progress(current_user: dict = Depends(get_current_user)):
    """Retorna progresso do usuário nos desafios ativos"""
    user_id = current_user["sub"]
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Buscar desafios ativos
    active_challenges = await db.weekly_challenges.find({
        "active": True,
        "start_date": {"$lte": today},
        "end_date": {"$gte": today}
    }, {"_id": 0}).to_list(100)
    
    result = []
    for challenge in active_challenges:
        # Buscar progresso do usuário
        progress = await db.user_challenge_progress.find_one({
            "user_id": user_id,
            "challenge_id": challenge["id"]
        }, {"_id": 0})
        
        if not progress:
            # Criar progresso inicial
            progress = UserChallengeProgress(
                user_id=user_id,
                challenge_id=challenge["id"]
            ).model_dump()
            await db.user_challenge_progress.insert_one(progress)
        
        result.append({
            **challenge,
            "user_progress": progress["current_progress"],
            "user_completed": progress["completed"]
        })
    
    return result

@router.post("/challenges/{challenge_id}/update-progress")
async def update_challenge_progress(challenge_id: str, progress_value: int, current_user: dict = Depends(require_role(["admin"]))):
    """Atualizar progresso de todos os usuários em um desafio (admin manual)"""
    # Esta função pode ser chamada manualmente pelo admin ou automaticamente pelo sistema
    pass

# ==================== VERIFICAÇÃO AUTOMÁTICA DE BADGES ====================

async def check_and_award_badges(user_id: str):
    """Verifica e concede badges automaticamente baseado nos critérios"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        return
    
    # Buscar todos os badges ativos
    badges = await db.badges.find({"active": True}, {"_id": 0}).to_list(100)
    
    for badge in badges:
        # Verificar se já tem o badge
        has_badge = await db.user_badges.find_one({"user_id": user_id, "badge_id": badge["id"]})
        if has_badge:
            continue
        
        criteria_type = badge.get("criteria_type", "")
        criteria_value = badge.get("criteria_value", 0)
        should_award = False
        
        if criteria_type == "modules_completed":
            # Contar módulos completos
            modules = await db.modules.find({}, {"_id": 0}).to_list(1000)
            completed_count = 0
            for module in modules:
                total_chapters = await db.chapters.count_documents({"module_id": module["id"]})
                completed_chapters = await db.user_progress.count_documents({
                    "user_id": user_id,
                    "module_id": module["id"],
                    "completed": True
                })
                if total_chapters > 0 and completed_chapters == total_chapters:
                    completed_count += 1
            
            if completed_count >= criteria_value:
                should_award = True
        
        elif criteria_type == "first_module":
            # Verificar se completou pelo menos 1 módulo
            modules = await db.modules.find({}, {"_id": 0}).to_list(1000)
            for module in modules:
                total_chapters = await db.chapters.count_documents({"module_id": module["id"]})
                completed_chapters = await db.user_progress.count_documents({
                    "user_id": user_id,
                    "module_id": module["id"],
                    "completed": True
                })
                if total_chapters > 0 and completed_chapters == total_chapters:
                    should_award = True
                    break
        
        elif criteria_type == "points_reached":
            if user.get("points", 0) >= criteria_value:
                should_award = True
        
        elif criteria_type == "days_streak":
            streak = await db.user_streaks.find_one({"user_id": user_id})
            if streak and streak.get("longest_streak", 0) >= criteria_value:
                should_award = True
        
        elif criteria_type == "all_modules":
            # Verificar se completou TODOS os módulos
            modules = await db.modules.find({}, {"_id": 0}).to_list(1000)
            if modules:
                all_completed = True
                for module in modules:
                    total_chapters = await db.chapters.count_documents({"module_id": module["id"]})
                    completed_chapters = await db.user_progress.count_documents({
                        "user_id": user_id,
                        "module_id": module["id"],
                        "completed": True
                    })
                    if total_chapters == 0 or completed_chapters < total_chapters:
                        all_completed = False
                        break
                
                if all_completed:
                    should_award = True
        
        # Conceder badge se atingiu o critério
        if should_award:
            user_badge = UserBadge(user_id=user_id, badge_id=badge["id"])
            await db.user_badges.insert_one(user_badge.model_dump())
            
            # Dar pontos se houver
            if badge.get("points_reward", 0) > 0:
                await db.users.update_one(
                    {"id": user_id},
                    {"$inc": {"points": badge["points_reward"]}}
                )
            
            # Criar notificação
            from routes.notification_routes import create_notification
            await create_notification(
                user_id,
                f"Novo Badge Conquistado! 🏆",
                f"Parabéns! Você conquistou o badge '{badge['name']}'!",
                "badge_earned",
                badge["id"]
            )

# ==================== GAMIFICATION STATS ====================

@router.get("/stats")
async def get_gamification_stats(current_user: dict = Depends(get_current_user)):
    """Retorna estatísticas de gamificação do usuário"""
    user_id = current_user["sub"]
    
    # Badges conquistados
    badges_count = await db.user_badges.count_documents({"user_id": user_id})
    total_badges = await db.badges.count_documents({"active": True})
    
    # Streak
    streak = await db.user_streaks.find_one({"user_id": user_id}, {"_id": 0})
    if not streak:
        streak = {"current_streak": 0, "longest_streak": 0}
    
    # Desafios completados
    challenges_completed = await db.user_challenge_progress.count_documents({
        "user_id": user_id,
        "completed": True
    })
    
    return {
        "badges_earned": badges_count,
        "total_badges": total_badges,
        "current_streak": streak.get("current_streak", 0),
        "longest_streak": streak.get("longest_streak", 0),
        "challenges_completed": challenges_completed
    }
