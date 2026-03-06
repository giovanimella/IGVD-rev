"""
Sistema de Pontos com Validade
- Registra cada transação de pontos com data/hora
- Calcula pontos válidos (não expirados)
- Processa expiração de pontos automaticamente
"""

from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
import os
import uuid

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'uniozoxx')]

router = APIRouter(prefix="/points", tags=["points"])


# ==================== FUNÇÕES AUXILIARES ====================

async def get_points_expiration_months() -> int:
    """Busca a configuração de meses de validade dos pontos"""
    config = await db.system_config.find_one({"id": "system_config"})
    return config.get("points_expiration_months", 12) if config else 12


async def calculate_expiration_date() -> Optional[str]:
    """Calcula a data de expiração baseado na configuração"""
    months = await get_points_expiration_months()
    if months <= 0:
        return None  # Nunca expira
    
    expiration = datetime.now(timezone.utc) + relativedelta(months=months)
    return expiration.isoformat()


async def add_points(
    user_id: str,
    points: int,
    reason: str,
    description: str,
    reference_id: Optional[str] = None,
    reference_type: Optional[str] = None
) -> dict:
    """
    Função centralizada para adicionar pontos ao usuário.
    Registra a transação com data de expiração.
    
    Reasons válidos:
    - module_completion: Completou módulo
    - badge: Ganhou badge
    - meeting: Fechou reunião
    - live: Participou de live
    - challenge: Completou desafio
    - manual: Adicionado manualmente pelo admin
    - redemption: Resgatou recompensa (pontos negativos)
    - expiration: Pontos expiraram (pontos negativos)
    """
    
    # Calcular data de expiração (apenas para pontos positivos)
    expires_at = None
    if points > 0:
        expires_at = await calculate_expiration_date()
    
    # Criar registro da transação
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "points": points,
        "reason": reason,
        "description": description,
        "reference_id": reference_id,
        "reference_type": reference_type,
        "expires_at": expires_at,
        "expired": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.points_history.insert_one(transaction)
    
    # Atualizar pontos totais do usuário
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"points": points}}
    )
    
    return transaction


async def get_valid_points(user_id: str) -> int:
    """
    Calcula os pontos válidos (não expirados) de um usuário.
    """
    now = datetime.now(timezone.utc).isoformat()
    
    # Buscar todas as transações não expiradas
    pipeline = [
        {
            "$match": {
                "user_id": user_id,
                "expired": False,
                "$or": [
                    {"expires_at": None},  # Nunca expira
                    {"expires_at": {"$gt": now}},  # Ainda não expirou
                    {"points": {"$lt": 0}}  # Transações negativas (resgates) não expiram
                ]
            }
        },
        {
            "$group": {
                "_id": None,
                "total": {"$sum": "$points"}
            }
        }
    ]
    
    result = await db.points_history.aggregate(pipeline).to_list(1)
    return result[0]["total"] if result else 0


async def process_expired_points(user_id: Optional[str] = None):
    """
    Processa pontos expirados e marca como expirados.
    Se user_id for fornecido, processa apenas para esse usuário.
    """
    now = datetime.now(timezone.utc).isoformat()
    
    query = {
        "expired": False,
        "expires_at": {"$ne": None, "$lte": now},
        "points": {"$gt": 0}  # Apenas transações positivas
    }
    
    if user_id:
        query["user_id"] = user_id
    
    # Buscar transações expiradas
    expired_transactions = await db.points_history.find(query).to_list(10000)
    
    expired_count = 0
    for transaction in expired_transactions:
        # Marcar como expirado
        await db.points_history.update_one(
            {"id": transaction["id"]},
            {"$set": {"expired": True}}
        )
        
        # Subtrair pontos do usuário
        await db.users.update_one(
            {"id": transaction["user_id"]},
            {"$inc": {"points": -transaction["points"]}}
        )
        
        # Registrar transação de expiração
        await db.points_history.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": transaction["user_id"],
            "points": -transaction["points"],
            "reason": "expiration",
            "description": f"Pontos expiraram (ref: {transaction['description']})",
            "reference_id": transaction["id"],
            "reference_type": "expiration",
            "expires_at": None,
            "expired": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        expired_count += 1
    
    return expired_count


async def get_expiring_points(user_id: str, days: int = 30) -> List[dict]:
    """
    Retorna pontos que vão expirar nos próximos X dias.
    """
    now = datetime.now(timezone.utc)
    future = (now + relativedelta(days=days)).isoformat()
    now_str = now.isoformat()
    
    transactions = await db.points_history.find({
        "user_id": user_id,
        "expired": False,
        "points": {"$gt": 0},
        "expires_at": {"$ne": None, "$gt": now_str, "$lte": future}
    }).sort("expires_at", 1).to_list(100)
    
    return transactions


# ==================== ENDPOINTS ====================

@router.get("/my-balance")
async def get_my_points_balance(current_user: dict = Depends(lambda: None)):
    """Retorna o saldo de pontos do usuário com detalhes de expiração"""
    from auth import get_current_user
    current_user = await get_current_user()
    user_id = current_user["sub"]
    
    # Processar pontos expirados primeiro
    await process_expired_points(user_id)
    
    # Buscar usuário
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "points": 1})
    total_points = user.get("points", 0) if user else 0
    
    # Pontos válidos (não expirados)
    valid_points = await get_valid_points(user_id)
    
    # Pontos expirando nos próximos 30 dias
    expiring_soon = await get_expiring_points(user_id, 30)
    expiring_total = sum(t["points"] for t in expiring_soon)
    
    # Configuração de expiração
    expiration_months = await get_points_expiration_months()
    
    return {
        "total_points": total_points,
        "valid_points": valid_points,
        "expiring_in_30_days": expiring_total,
        "expiring_transactions": [
            {
                "points": t["points"],
                "description": t["description"],
                "expires_at": t["expires_at"]
            }
            for t in expiring_soon[:5]  # Mostrar apenas os 5 primeiros
        ],
        "expiration_months": expiration_months
    }


@router.get("/my-history")
async def get_my_points_history(
    limit: int = 50,
    current_user: dict = Depends(lambda: None)
):
    """Retorna o histórico de pontos do usuário"""
    from auth import get_current_user
    current_user = await get_current_user()
    user_id = current_user["sub"]
    
    transactions = await db.points_history.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return transactions


@router.get("/user/{user_id}/balance")
async def get_user_points_balance(user_id: str):
    """Admin: Retorna o saldo de pontos de um usuário específico"""
    from auth import require_role
    
    # Processar pontos expirados primeiro
    await process_expired_points(user_id)
    
    # Buscar usuário
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "points": 1, "full_name": 1})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    total_points = user.get("points", 0)
    valid_points = await get_valid_points(user_id)
    expiring_soon = await get_expiring_points(user_id, 30)
    expiring_total = sum(t["points"] for t in expiring_soon)
    
    return {
        "user_id": user_id,
        "full_name": user.get("full_name"),
        "total_points": total_points,
        "valid_points": valid_points,
        "expiring_in_30_days": expiring_total
    }


@router.get("/user/{user_id}/history")
async def get_user_points_history(user_id: str, limit: int = 100):
    """Admin: Retorna o histórico de pontos de um usuário"""
    from auth import require_role
    
    transactions = await db.points_history.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return transactions


@router.post("/admin/add")
async def admin_add_points(data: dict):
    """Admin: Adiciona pontos manualmente a um usuário"""
    from auth import require_role
    
    user_id = data.get("user_id")
    points = data.get("points", 0)
    description = data.get("description", "Pontos adicionados manualmente")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id é obrigatório")
    
    if points == 0:
        raise HTTPException(status_code=400, detail="points deve ser diferente de zero")
    
    # Verificar se usuário existe
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Adicionar pontos
    transaction = await add_points(
        user_id=user_id,
        points=points,
        reason="manual",
        description=description,
        reference_type="manual"
    )
    
    return {
        "success": True,
        "message": f"{points} pontos {'adicionados' if points > 0 else 'removidos'}",
        "transaction": transaction
    }


@router.post("/admin/process-expired")
async def admin_process_expired():
    """Admin: Processa todos os pontos expirados no sistema"""
    from auth import require_role
    
    expired_count = await process_expired_points()
    
    return {
        "success": True,
        "message": f"{expired_count} transações de pontos expiradas processadas"
    }


@router.get("/admin/expiring-summary")
async def admin_get_expiring_summary(days: int = 30):
    """Admin: Resumo de pontos que vão expirar nos próximos X dias"""
    from auth import require_role
    
    now = datetime.now(timezone.utc)
    future = (now + relativedelta(days=days)).isoformat()
    now_str = now.isoformat()
    
    pipeline = [
        {
            "$match": {
                "expired": False,
                "points": {"$gt": 0},
                "expires_at": {"$ne": None, "$gt": now_str, "$lte": future}
            }
        },
        {
            "$group": {
                "_id": "$user_id",
                "total_expiring": {"$sum": "$points"},
                "count": {"$sum": 1}
            }
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "_id",
                "foreignField": "id",
                "as": "user"
            }
        },
        {
            "$unwind": "$user"
        },
        {
            "$project": {
                "user_id": "$_id",
                "full_name": "$user.full_name",
                "email": "$user.email",
                "total_expiring": 1,
                "count": 1
            }
        },
        {
            "$sort": {"total_expiring": -1}
        },
        {
            "$limit": 50
        }
    ]
    
    results = await db.points_history.aggregate(pipeline).to_list(50)
    
    # Total geral
    total_pipeline = [
        {
            "$match": {
                "expired": False,
                "points": {"$gt": 0},
                "expires_at": {"$ne": None, "$gt": now_str, "$lte": future}
            }
        },
        {
            "$group": {
                "_id": None,
                "total": {"$sum": "$points"},
                "users": {"$addToSet": "$user_id"}
            }
        }
    ]
    
    total_result = await db.points_history.aggregate(total_pipeline).to_list(1)
    
    return {
        "period_days": days,
        "total_points_expiring": total_result[0]["total"] if total_result else 0,
        "total_users_affected": len(total_result[0]["users"]) if total_result else 0,
        "users": results
    }


@router.get("/settings")
async def get_points_settings():
    """Retorna as configurações de pontos"""
    config = await db.system_config.find_one({"id": "system_config"})
    
    return {
        "expiration_months": config.get("points_expiration_months", 12) if config else 12
    }


@router.put("/settings")
async def update_points_settings(data: dict):
    """Admin: Atualiza as configurações de pontos"""
    from auth import require_role
    
    expiration_months = data.get("points_expiration_months")
    
    if expiration_months is not None:
        if expiration_months < 0:
            raise HTTPException(status_code=400, detail="Meses de expiração não pode ser negativo")
        
        await db.system_config.update_one(
            {"id": "system_config"},
            {"$set": {
                "points_expiration_months": expiration_months,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
    
    return {
        "success": True,
        "message": "Configurações atualizadas",
        "expiration_months": expiration_months
    }
