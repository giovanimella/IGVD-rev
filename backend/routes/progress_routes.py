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

@router.post("/update")
async def update_progress(progress_data: ProgressUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.user_progress.find_one({
        "user_id": current_user["sub"],
        "chapter_id": progress_data.chapter_id
    }, {"_id": 0})
    
    if existing:
        update_data = {
            "watched_percentage": progress_data.watched_percentage
        }
        
        if progress_data.completed and not existing.get("completed", False):
            update_data["completed"] = True
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
            
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
        
        await db.user_progress.update_one(
            {"id": existing["id"]},
            {"$set": update_data}
        )
    else:
        progress = UserProgress(
            user_id=current_user["sub"],
            module_id=progress_data.module_id,
            chapter_id=progress_data.chapter_id,
            completed=progress_data.completed,
            watched_percentage=progress_data.watched_percentage
        )
        
        if progress_data.completed:
            progress.completed_at = datetime.now(timezone.utc).isoformat()
        
        await db.user_progress.insert_one(progress.model_dump())
    
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