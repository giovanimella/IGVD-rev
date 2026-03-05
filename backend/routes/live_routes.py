"""
Rotas para o sistema de Lives
"""
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from auth import get_current_user
from models_live import LiveSettings, LiveSettingsUpdate, LiveParticipation
import os
import uuid
import logging

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/live", tags=["Live"])


async def get_live_settings():
    """Obtém as configurações da live"""
    settings = await db.live_settings.find_one({}, {"_id": 0})
    if not settings:
        # Criar configurações padrão
        default = LiveSettings()
        await db.live_settings.insert_one(default.model_dump())
        return default.model_dump()
    return settings


# ==================== ADMIN ====================

@router.get("/admin/settings")
async def get_admin_live_settings(current_user: dict = Depends(get_current_user)):
    """Obtém as configurações da live (admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    settings = await get_live_settings()
    
    # Contar participações de hoje
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_participations = await db.live_participations.count_documents({
        "participated_at": {"$gte": today_start.isoformat()}
    })
    
    settings["today_participations"] = today_participations
    
    return settings


@router.put("/admin/settings")
async def update_live_settings(
    updates: LiveSettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Atualiza as configurações da live (admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.live_settings.update_one(
        {},
        {"$set": update_dict},
        upsert=True
    )
    
    return {"success": True, "message": "Configurações atualizadas com sucesso"}


@router.post("/admin/toggle")
async def toggle_live(current_user: dict = Depends(get_current_user)):
    """Ativa/desativa a live (admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    settings = await get_live_settings()
    new_status = not settings.get("is_active", False)
    
    await db.live_settings.update_one(
        {},
        {"$set": {
            "is_active": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "is_active": new_status,
        "message": "Live ativada!" if new_status else "Live desativada!"
    }


@router.get("/admin/participations")
async def get_live_participations(current_user: dict = Depends(get_current_user)):
    """Lista as participações em lives (admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    participations = await db.live_participations.find(
        {},
        {"_id": 0}
    ).sort("participated_at", -1).limit(100).to_list(100)
    
    return participations


# ==================== USUÁRIO ====================

@router.get("/current")
async def get_current_live(current_user: dict = Depends(get_current_user)):
    """Obtém a live atual (se ativa)"""
    settings = await get_live_settings()
    
    if not settings.get("is_active"):
        return {
            "has_active_live": False,
            "live": None
        }
    
    # Verificar se o usuário já participou hoje
    user_id = current_user["sub"]
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    already_participated = await db.live_participations.find_one({
        "user_id": user_id,
        "participated_at": {"$gte": today_start.isoformat()}
    })
    
    return {
        "has_active_live": True,
        "live": {
            "title": settings.get("title", "Live Semanal"),
            "description": settings.get("description"),
            "meeting_link": settings.get("meeting_link"),
            "points_reward": settings.get("points_reward", 10)
        },
        "already_participated": already_participated is not None,
        "participated_at": already_participated.get("participated_at") if already_participated else None
    }


@router.post("/join")
async def join_live(current_user: dict = Depends(get_current_user)):
    """
    Registra a participação na live e dá pontos ao usuário
    Chamado quando o usuário clica no link da live
    """
    user_id = current_user["sub"]
    
    # Verificar se há live ativa
    settings = await get_live_settings()
    
    if not settings.get("is_active"):
        raise HTTPException(status_code=400, detail="Não há live ativa no momento")
    
    if not settings.get("meeting_link"):
        raise HTTPException(status_code=400, detail="Link da live não configurado")
    
    # Verificar se o usuário já participou hoje
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    already_participated = await db.live_participations.find_one({
        "user_id": user_id,
        "participated_at": {"$gte": today_start.isoformat()}
    })
    
    points_earned = 0
    
    if not already_participated:
        # Registrar participação
        points_earned = settings.get("points_reward", 10)
        
        participation = LiveParticipation(
            user_id=user_id,
            user_email=current_user.get("email", ""),
            user_name=current_user.get("full_name", ""),
            live_id=settings.get("id", ""),
            points_earned=points_earned
        )
        
        await db.live_participations.insert_one(participation.model_dump())
        
        # Adicionar pontos ao usuário
        await db.users.update_one(
            {"id": user_id},
            {"$inc": {"points": points_earned}}
        )
        
        logger.info(f"[Live] Participação registrada: user={user_id}, points={points_earned}")
    
    return {
        "success": True,
        "meeting_link": settings.get("meeting_link"),
        "points_earned": points_earned,
        "already_participated": already_participated is not None,
        "message": f"Você ganhou {points_earned} pontos!" if points_earned > 0 else "Você já participou da live hoje!"
    }
