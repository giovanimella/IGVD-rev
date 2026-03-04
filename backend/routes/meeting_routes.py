"""
Rotas de API para Sistema de Reuniões
Licenciados cadastram reuniões e participantes para ganhar pontos
"""
from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from typing import Optional, List
import logging
import os

from auth import get_current_user, require_role
from models_meetings import (
    MeetingSettings,
    MeetingSettingsUpdate,
    Meeting,
    CreateMeetingRequest,
    UpdateMeetingRequest,
    MeetingParticipant,
    AddParticipantRequest,
    BulkAddParticipantsRequest,
    MeetingResponse,
    CloseMeetingResponse,
    MeetingStats,
    MeetingStatus
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/meetings", tags=["meetings"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


# ==================== HELPERS ====================

async def get_meeting_settings():
    """Obtém as configurações de reuniões"""
    settings = await db.meeting_settings.find_one({}, {"_id": 0})
    if not settings:
        # Criar configuração padrão
        settings = MeetingSettings().model_dump()
        await db.meeting_settings.insert_one(settings.copy())
    return settings


async def check_subscription_status(user_id: str) -> bool:
    """Verifica se usuário tem assinatura ativa (não está bloqueado)"""
    subscription = await db.user_subscriptions.find_one({"user_id": user_id})
    
    # Se não tem assinatura ainda (onboarding), permitir acesso
    if not subscription:
        return True
    
    # Status que bloqueiam acesso
    blocked_statuses = ["overdue", "suspended", "cancelled"]
    
    return subscription.get("status") not in blocked_statuses


# ==================== CONFIGURAÇÕES (ADMIN) ====================

@router.get("/settings")
async def get_settings(current_user: dict = Depends(get_current_user)):
    """Obtém as configurações de reuniões (Admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    settings = await get_meeting_settings()
    return settings


@router.put("/settings")
async def update_settings(
    updates: MeetingSettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Atualiza as configurações de reuniões (Admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.meeting_settings.update_one(
        {},
        {"$set": update_dict},
        upsert=True
    )
    
    return {"message": "Configurações atualizadas com sucesso"}


# ==================== REUNIÕES (LICENCIADO) ====================

@router.post("/")
async def create_meeting(
    meeting_request: CreateMeetingRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cria uma nova reunião"""
    user_id = current_user["sub"]
    
    # Verificar assinatura
    has_access = await check_subscription_status(user_id)
    if not has_access:
        raise HTTPException(
            status_code=403,
            detail="Acesso bloqueado. Regularize sua mensalidade para continuar usando o sistema."
        )
    
    # Buscar nome do usuário
    user = await db.users.find_one({"id": user_id}, {"full_name": 1, "_id": 0})
    user_name = user.get("full_name", current_user.get("email", "Usuário")) if user else current_user.get("email", "Usuário")
    
    # Criar reunião
    meeting = Meeting(
        user_id=user_id,
        user_name=user_name,
        title=meeting_request.title,
        description=meeting_request.description,
        location=meeting_request.location,
        meeting_date=meeting_request.meeting_date,
        meeting_time=meeting_request.meeting_time
    )
    
    await db.meetings.insert_one(meeting.model_dump())
    
    return MeetingResponse(
        success=True,
        message="Reunião criada com sucesso! Agora você pode adicionar participantes.",
        meeting=meeting.model_dump()
    )


@router.get("/my")
async def get_my_meetings(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Lista as reuniões do usuário"""
    user_id = current_user["sub"]
    
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    
    meetings = await db.meetings.find(
        query,
        {"_id": 0}
    ).sort("meeting_date", -1).to_list(1000)
    
    return meetings


# ==================== ADMIN - LISTAGEM (SPECIFIC ROUTES BEFORE DYNAMIC) ====================

@router.get("/all")
async def list_all_meetings(
    current_user: dict = Depends(require_role(["admin", "supervisor"]))
):
    """Lista todas as reuniões (Admin/Supervisor)"""
    meetings = await db.meetings.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return meetings


@router.get("/all/stats")
async def get_all_stats(current_user: dict = Depends(get_current_user)):
    """Estatísticas gerais de reuniões (Admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    total_meetings = await db.meetings.count_documents({})
    total_closed = await db.meetings.count_documents({"status": MeetingStatus.CLOSED})
    total_participants = await db.meeting_participants.count_documents({})
    
    # Total de pontos distribuídos
    pipeline = [
        {"$match": {"status": MeetingStatus.CLOSED}},
        {"$group": {"_id": None, "total_points": {"$sum": "$points_awarded"}}}
    ]
    
    result = await db.meetings.aggregate(pipeline).to_list(1)
    total_points_distributed = result[0]["total_points"] if result else 0
    
    return {
        "total_meetings": total_meetings,
        "total_closed_meetings": total_closed,
        "total_participants": total_participants,
        "total_points_distributed": total_points_distributed
    }


@router.get("/{meeting_id}")
async def get_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtém detalhes de uma reunião com seus participantes"""
    user_id = current_user["sub"]
    
    # Buscar reunião
    meeting = await db.meetings.find_one(
        {"id": meeting_id},
        {"_id": 0}
    )
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunião não encontrada")
    
    # Verificar permissão (apenas admin, supervisor ou dono)
    if current_user.get("role") not in ["admin", "supervisor"]:
        if meeting["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Buscar participantes
    participants = await db.meeting_participants.find(
        {"meeting_id": meeting_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    return MeetingResponse(
        success=True,
        message="Reunião encontrada",
        meeting=meeting,
        participants=participants
    )


@router.put("/{meeting_id}")
async def update_meeting(
    meeting_id: str,
    update_request: UpdateMeetingRequest,
    current_user: dict = Depends(get_current_user)
):
    """Atualiza dados de uma reunião (apenas se ainda em DRAFT)"""
    user_id = current_user["sub"]
    
    # Buscar reunião
    meeting = await db.meetings.find_one({
        "id": meeting_id,
        "user_id": user_id
    })
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunião não encontrada")
    
    if meeting["status"] != MeetingStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Só é possível editar reuniões em rascunho")
    
    # Atualizar
    update_dict = {k: v for k, v in update_request.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": update_dict}
    )
    
    return {"message": "Reunião atualizada com sucesso"}


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Exclui uma reunião (apenas se ainda em DRAFT)"""
    user_id = current_user["sub"]
    
    # Buscar reunião
    meeting = await db.meetings.find_one({
        "id": meeting_id,
        "user_id": user_id
    })
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunião não encontrada")
    
    if meeting["status"] != MeetingStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Só é possível excluir reuniões em rascunho")
    
    # Excluir reunião e participantes
    await db.meetings.delete_one({"id": meeting_id})
    await db.meeting_participants.delete_many({"meeting_id": meeting_id})
    
    return {"message": "Reunião excluída com sucesso"}


# ==================== PARTICIPANTES ====================

@router.post("/{meeting_id}/participants")
async def add_participant(
    meeting_id: str,
    participant_request: AddParticipantRequest,
    current_user: dict = Depends(get_current_user)
):
    """Adiciona um participante à reunião"""
    user_id = current_user["sub"]
    
    # Verificar assinatura
    has_access = await check_subscription_status(user_id)
    if not has_access:
        raise HTTPException(
            status_code=403,
            detail="Acesso bloqueado. Regularize sua mensalidade para continuar usando o sistema."
        )
    
    # Buscar reunião
    meeting = await db.meetings.find_one({
        "id": meeting_id,
        "user_id": user_id
    })
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunião não encontrada")
    
    if meeting["status"] != MeetingStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Não é possível adicionar participantes após fechar a lista")
    
    # Verificar limite
    settings = await get_meeting_settings()
    max_participants = settings.get("max_participants_per_meeting", 100)
    
    current_count = await db.meeting_participants.count_documents({"meeting_id": meeting_id})
    if current_count >= max_participants:
        raise HTTPException(status_code=400, detail=f"Limite de {max_participants} participantes atingido")
    
    # Verificar duplicata de CPF (se configurado)
    if participant_request.cpf and not settings.get("allow_duplicate_participants", False):
        existing = await db.meeting_participants.find_one({
            "user_id": user_id,
            "cpf": participant_request.cpf
        })
        if existing:
            raise HTTPException(status_code=400, detail="Este CPF já foi cadastrado em uma de suas reuniões")
    
    # Criar participante
    participant = MeetingParticipant(
        meeting_id=meeting_id,
        user_id=user_id,
        name=participant_request.name,
        email=participant_request.email,
        phone=participant_request.phone,
        cpf=participant_request.cpf,
        notes=participant_request.notes
    )
    
    await db.meeting_participants.insert_one(participant.model_dump())
    
    # Atualizar contagem na reunião
    new_count = current_count + 1
    await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": {
            "participants_count": new_count,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Participante adicionado com sucesso",
        "participant": participant.model_dump(),
        "total_participants": new_count
    }


@router.post("/{meeting_id}/participants/bulk")
async def add_participants_bulk(
    meeting_id: str,
    bulk_request: BulkAddParticipantsRequest,
    current_user: dict = Depends(get_current_user)
):
    """Adiciona múltiplos participantes de uma vez"""
    user_id = current_user["sub"]
    
    # Verificar assinatura
    has_access = await check_subscription_status(user_id)
    if not has_access:
        raise HTTPException(
            status_code=403,
            detail="Acesso bloqueado. Regularize sua mensalidade para continuar usando o sistema."
        )
    
    # Buscar reunião
    meeting = await db.meetings.find_one({
        "id": meeting_id,
        "user_id": user_id
    })
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunião não encontrada")
    
    if meeting["status"] != MeetingStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Não é possível adicionar participantes após fechar a lista")
    
    # Adicionar todos os participantes
    added_count = 0
    for p_request in bulk_request.participants:
        try:
            participant = MeetingParticipant(
                meeting_id=meeting_id,
                user_id=user_id,
                name=p_request.name,
                email=p_request.email,
                phone=p_request.phone,
                cpf=p_request.cpf,
                notes=p_request.notes
            )
            await db.meeting_participants.insert_one(participant.model_dump())
            added_count += 1
        except Exception as e:
            logger.error(f"Erro ao adicionar participante {p_request.name}: {e}")
    
    # Atualizar contagem
    total_participants = await db.meeting_participants.count_documents({"meeting_id": meeting_id})
    await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": {
            "participants_count": total_participants,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": f"{added_count} participantes adicionados com sucesso",
        "total_participants": total_participants
    }


@router.delete("/{meeting_id}/participants/{participant_id}")
async def remove_participant(
    meeting_id: str,
    participant_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove um participante da reunião"""
    user_id = current_user["sub"]
    
    # Buscar reunião
    meeting = await db.meetings.find_one({
        "id": meeting_id,
        "user_id": user_id
    })
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunião não encontrada")
    
    if meeting["status"] != MeetingStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Não é possível remover participantes após fechar a lista")
    
    # Remover participante
    result = await db.meeting_participants.delete_one({
        "id": participant_id,
        "meeting_id": meeting_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Participante não encontrado")
    
    # Atualizar contagem
    new_count = await db.meeting_participants.count_documents({"meeting_id": meeting_id})
    await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": {
            "participants_count": new_count,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Participante removido com sucesso",
        "total_participants": new_count
    }


# ==================== FECHAR LISTA E CREDITAR PONTOS ====================

@router.post("/{meeting_id}/close")
async def close_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Fecha a lista de participantes e credita pontos ao licenciado"""
    user_id = current_user["sub"]
    
    # Verificar assinatura
    has_access = await check_subscription_status(user_id)
    if not has_access:
        raise HTTPException(
            status_code=403,
            detail="Acesso bloqueado. Regularize sua mensalidade para continuar usando o sistema."
        )
    
    # Buscar reunião
    meeting = await db.meetings.find_one({
        "id": meeting_id,
        "user_id": user_id
    })
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunião não encontrada")
    
    if meeting["status"] != MeetingStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Esta reunião já foi fechada")
    
    # Verificar mínimo de participantes
    settings = await get_meeting_settings()
    min_participants = settings.get("min_participants", 1)
    participants_count = meeting.get("participants_count", 0)
    
    if participants_count < min_participants:
        raise HTTPException(
            status_code=400,
            detail=f"É necessário ter no mínimo {min_participants} participante(s) para fechar a lista"
        )
    
    # Calcular pontos
    points_per_participant = settings.get("points_per_participant", 1)
    points_awarded = participants_count * points_per_participant
    
    # Atualizar reunião
    await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": {
            "status": MeetingStatus.CLOSED,
            "points_awarded": points_awarded,
            "points_per_participant": points_per_participant,
            "closed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Creditar pontos ao usuário
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"points": points_awarded}}
    )
    
    # Buscar novo total de pontos
    user = await db.users.find_one({"id": user_id}, {"points": 1, "_id": 0})
    new_total_points = user.get("points", 0)
    
    logger.info(f"Reunião {meeting_id} fechada. {points_awarded} pontos creditados ao usuário {user_id}")
    
    return CloseMeetingResponse(
        success=True,
        message=f"Lista fechada! Você ganhou {points_awarded} pontos!",
        meeting_id=meeting_id,
        participants_count=participants_count,
        points_awarded=points_awarded,
        new_total_points=new_total_points
    )


# ==================== ESTATÍSTICAS ====================

@router.get("/my/stats")
async def get_my_stats(current_user: dict = Depends(get_current_user)):
    """Obtém estatísticas de reuniões do usuário"""
    user_id = current_user["sub"]
    
    # Total de reuniões
    total_meetings = await db.meetings.count_documents({"user_id": user_id})
    total_closed = await db.meetings.count_documents({
        "user_id": user_id,
        "status": MeetingStatus.CLOSED
    })
    
    # Total de participantes
    total_participants = await db.meeting_participants.count_documents({"user_id": user_id})
    
    # Somar pontos ganhos
    pipeline = [
        {"$match": {"user_id": user_id, "status": MeetingStatus.CLOSED}},
        {"$group": {"_id": None, "total_points": {"$sum": "$points_awarded"}}}
    ]
    
    result = await db.meetings.aggregate(pipeline).to_list(1)
    total_points_earned = result[0]["total_points"] if result else 0
    
    # Reuniões do mês atual
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1).isoformat()
    
    current_month_meetings = await db.meetings.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": month_start}
    })
    
    current_month_participants = await db.meeting_participants.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": month_start}
    })
    
    return MeetingStats(
        total_meetings=total_meetings,
        total_closed_meetings=total_closed,
        total_participants=total_participants,
        total_points_earned=total_points_earned,
        current_month_meetings=current_month_meetings,
        current_month_participants=current_month_participants
    )
