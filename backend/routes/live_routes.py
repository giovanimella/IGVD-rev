"""
Rotas para o sistema de Lives com Sessões
"""
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from auth import get_current_user
from models_live import LiveSettings, LiveSettingsUpdate, LiveSession, LiveParticipation
import os
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
    
    # Contar participações da sessão atual
    current_session_id = settings.get("current_session_id")
    if current_session_id:
        current_participations = await db.live_participations.count_documents({
            "session_id": current_session_id
        })
        settings["current_session_participations"] = current_participations
    else:
        settings["current_session_participations"] = 0
    
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


@router.post("/admin/start")
async def start_live(current_user: dict = Depends(get_current_user)):
    """Inicia uma nova sessão de live (admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    settings = await get_live_settings()
    
    # Verificar se já há uma live ativa
    if settings.get("is_active"):
        raise HTTPException(status_code=400, detail="Já existe uma live ativa. Encerre-a primeiro.")
    
    # Criar nova sessão
    session = LiveSession(
        title=settings.get("title", "Live Semanal"),
        description=settings.get("description"),
        points_reward=settings.get("points_reward", 10)
    )
    
    await db.live_sessions.insert_one(session.model_dump())
    
    # Atualizar settings com a sessão ativa
    await db.live_settings.update_one(
        {},
        {"$set": {
            "is_active": True,
            "current_session_id": session.id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"[Live] Nova sessão iniciada: {session.id}")
    
    return {
        "success": True,
        "message": "Live iniciada com sucesso!",
        "session_id": session.id
    }


@router.post("/admin/end")
async def end_live(current_user: dict = Depends(get_current_user)):
    """Encerra a sessão de live atual (admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    settings = await get_live_settings()
    
    if not settings.get("is_active"):
        raise HTTPException(status_code=400, detail="Não há live ativa no momento")
    
    current_session_id = settings.get("current_session_id")
    
    # Contar participantes da sessão
    participants_count = await db.live_participations.count_documents({
        "session_id": current_session_id
    })
    
    # Atualizar sessão como encerrada
    if current_session_id:
        await db.live_sessions.update_one(
            {"id": current_session_id},
            {"$set": {
                "is_active": False,
                "ended_at": datetime.now(timezone.utc).isoformat(),
                "participants_count": participants_count
            }}
        )
    
    # Desativar live nas settings
    await db.live_settings.update_one(
        {},
        {"$set": {
            "is_active": False,
            "current_session_id": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"[Live] Sessão encerrada: {current_session_id}, {participants_count} participantes")
    
    return {
        "success": True,
        "message": f"Live encerrada! {participants_count} participante(s)",
        "participants_count": participants_count
    }


@router.get("/admin/sessions")
async def get_live_sessions(current_user: dict = Depends(get_current_user)):
    """Lista todas as sessões de live (admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    sessions = await db.live_sessions.find(
        {},
        {"_id": 0}
    ).sort("started_at", -1).limit(50).to_list(50)
    
    return sessions


@router.get("/admin/sessions/{session_id}")
async def get_session_details(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtém detalhes de uma sessão específica com lista de participantes (admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Buscar sessão
    session = await db.live_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    # Buscar participantes
    participants = await db.live_participations.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("participated_at", 1).to_list(500)
    
    return {
        "session": session,
        "participants": participants,
        "total_participants": len(participants),
        "total_points_distributed": sum(p.get("points_earned", 0) for p in participants)
    }


@router.get("/admin/sessions/{session_id}/export")
async def export_session_participants(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Exporta lista de participantes de uma sessão (formato para copiar)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    session = await db.live_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")
    
    participants = await db.live_participations.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("participated_at", 1).to_list(500)
    
    # Formatar para CSV
    csv_lines = ["Nome,Email,Pontos,Data/Hora"]
    for p in participants:
        csv_lines.append(f"{p['user_name']},{p['user_email']},{p['points_earned']},{p['participated_at']}")
    
    return {
        "session_title": session.get("title"),
        "session_date": session.get("started_at"),
        "total_participants": len(participants),
        "csv_content": "\n".join(csv_lines),
        "participants": participants
    }


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
    
    # Verificar se o usuário já participou nesta sessão
    user_id = current_user["sub"]
    current_session_id = settings.get("current_session_id")
    
    already_participated = None
    if current_session_id:
        already_participated = await db.live_participations.find_one({
            "user_id": user_id,
            "session_id": current_session_id
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
    """Registra a participação na live e dá pontos ao usuário"""
    user_id = current_user["sub"]
    
    settings = await get_live_settings()
    
    if not settings.get("is_active"):
        raise HTTPException(status_code=400, detail="Não há live ativa no momento")
    
    if not settings.get("meeting_link"):
        raise HTTPException(status_code=400, detail="Link da live não configurado")
    
    current_session_id = settings.get("current_session_id")
    if not current_session_id:
        raise HTTPException(status_code=400, detail="Sessão da live não encontrada")
    
    # Verificar se o usuário já participou nesta sessão
    already_participated = await db.live_participations.find_one({
        "user_id": user_id,
        "session_id": current_session_id
    })
    
    points_earned = 0
    
    if not already_participated:
        points_earned = settings.get("points_reward", 10)
        
        participation = LiveParticipation(
            session_id=current_session_id,
            user_id=user_id,
            user_email=current_user.get("email", ""),
            user_name=current_user.get("full_name", ""),
            points_earned=points_earned
        )
        
        await db.live_participations.insert_one(participation.model_dump())
        
        # Adicionar pontos ao usuário
        await db.users.update_one(
            {"id": user_id},
            {"$inc": {"points": points_earned}}
        )
        
        # Atualizar contador da sessão
        await db.live_sessions.update_one(
            {"id": current_session_id},
            {"$inc": {"participants_count": 1}}
        )
        
        logger.info(f"[Live] Participação: user={user_id}, session={current_session_id}, points={points_earned}")
    
    return {
        "success": True,
        "meeting_link": settings.get("meeting_link"),
        "points_earned": points_earned,
        "already_participated": already_participated is not None,
        "message": f"Você ganhou {points_earned} pontos!" if points_earned > 0 else "Você já participou desta live!"
    }
