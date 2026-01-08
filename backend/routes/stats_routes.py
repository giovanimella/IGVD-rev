from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user, require_role
import os

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/leaderboard")
async def get_leaderboard(current_user: dict = Depends(get_current_user)):
    users = await db.users.find(
        {"role": "licenciado"},
        {"_id": 0, "password_hash": 0, "reset_token": 0, "reset_token_expires": 0}
    ).sort("points", -1).limit(100).to_list(100)
    
    return users

@router.get("/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") == "admin":
        total_users = await db.users.count_documents({"role": "licenciado"})
        total_modules = await db.modules.count_documents({})
        total_rewards = await db.rewards.count_documents({"active": True})
        pending_redemptions = await db.reward_redemptions.count_documents({"status": "pending"})
        
        return {
            "total_users": total_users,
            "total_modules": total_modules,
            "total_rewards": total_rewards,
            "pending_redemptions": pending_redemptions
        }
    
    elif current_user.get("role") == "supervisor":
        total_licensees = await db.users.count_documents({"role": "licenciado"})
        total_modules = await db.modules.count_documents({})
        
        licensees = await db.users.find({"role": "licenciado"}, {"_id": 0, "password_hash": 0}).to_list(1000)
        
        for licensee in licensees:
            completed = await db.user_progress.count_documents({
                "user_id": licensee["id"],
                "completed": True
            })
            licensee["completed_chapters"] = completed
        
        return {
            "total_licensees": total_licensees,
            "total_modules": total_modules,
            "licensees": licensees
        }
    
    else:
        user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "password_hash": 0})
        
        total_modules = await db.modules.count_documents({})
        completed_modules_count = 0
        
        modules = await db.modules.find({}, {"_id": 0}).to_list(1000)
        for module in modules:
            total_chapters = await db.chapters.count_documents({"module_id": module["id"]})
            completed_chapters = await db.user_progress.count_documents({
                "user_id": current_user["sub"],
                "module_id": module["id"],
                "completed": True
            })
            if total_chapters > 0 and completed_chapters == total_chapters:
                completed_modules_count += 1
        
        my_rank = await db.users.count_documents({
            "role": "licenciado",
            "points": {"$gt": user.get("points", 0)}
        }) + 1
        
        return {
            "points": user.get("points", 0),
            "level_title": user.get("level_title", "Iniciante"),
            "completed_modules": completed_modules_count,
            "total_modules": total_modules,
            "my_rank": my_rank
        }