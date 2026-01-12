from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from models import SystemConfig
from auth import get_current_user, require_role
import os
from datetime import datetime

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/system", tags=["system"])

@router.get("/config")
async def get_system_config(current_user: dict = Depends(get_current_user)):
    """Retorna as configurações do sistema"""
    config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
    
    if not config:
        # Criar configuração padrão se não existir
        default_config = SystemConfig()
        await db.system_config.insert_one(default_config.model_dump())
        config = default_config.model_dump()
    
    return config

@router.put("/config")
async def update_system_config(updates: dict, current_user: dict = Depends(require_role(["admin"]))):
    """Atualiza as configurações do sistema (apenas admin)"""
    updates["updated_at"] = datetime.now().isoformat()
    
    # Verificar se existe
    existing = await db.system_config.find_one({"id": "system_config"})
    
    if existing:
        await db.system_config.update_one(
            {"id": "system_config"},
            {"$set": updates}
        )
    else:
        config = SystemConfig(**updates)
        await db.system_config.insert_one(config.model_dump())
    
    return {"message": "Configurações atualizadas com sucesso"}

@router.get("/stats")
async def get_system_stats(current_user: dict = Depends(require_role(["admin"]))):
    """Retorna estatísticas do sistema"""
    total_users = await db.users.count_documents({})
    total_licensees = await db.users.count_documents({"role": "licenciado"})
    total_supervisors = await db.users.count_documents({"role": "supervisor"})
    total_admins = await db.users.count_documents({"role": "admin"})
    total_modules = await db.modules.count_documents({})
    total_chapters = await db.chapters.count_documents({})
    total_assessments = await db.assessments.count_documents({})
    total_rewards = await db.rewards.count_documents({})
    total_badges = await db.badges.count_documents({})
    total_challenges = await db.weekly_challenges.count_documents({})
    
    # Usuários ativos (acessaram nos últimos 7 dias)
    from datetime import timedelta
    seven_days_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    active_users = await db.user_accesses.distinct("user_id", {"date": {"$gte": seven_days_ago}})
    
    return {
        "total_users": total_users,
        "total_licensees": total_licensees,
        "total_supervisors": total_supervisors,
        "total_admins": total_admins,
        "total_modules": total_modules,
        "total_chapters": total_chapters,
        "total_assessments": total_assessments,
        "total_rewards": total_rewards,
        "total_badges": total_badges,
        "total_challenges": total_challenges,
        "active_users_7d": len(active_users)
    }
