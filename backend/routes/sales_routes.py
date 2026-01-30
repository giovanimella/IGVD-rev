"""
Rotas para gerenciamento de links de pagamento (10 vendas)
"""
from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from datetime import datetime, timedelta
import os
import uuid

from auth import get_current_user
from models_payment import PaymentLink, CreatePaymentLinkRequest, PaymentGateway

router = APIRouter(prefix="/sales", tags=["sales"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


@router.get("/my-links")
async def get_my_links(current_user: dict = Depends(get_current_user)):
    """Obtém os links de pagamento do usuário"""
    links = await db.payment_links.find(
        {"user_id": current_user["sub"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return links


@router.get("/my-progress")
async def get_my_progress(current_user: dict = Depends(get_current_user)):
    """Obtém o progresso das 10 vendas do usuário"""
    # Contar transações aprovadas/pagas do usuário
    completed_sales = await db.transactions.count_documents({
        "user_id": current_user["sub"],
        "purpose": "sales_link",
        "status": {"$in": ["approved", "paid"]}
    })
    
    # Obter configuração do sistema
    config = await db.system_config.find_one({}, {"_id": 0})
    total_required = config.get("required_sales", 10) if config else 10
    
    return {
        "completed": completed_sales,
        "total": total_required
    }


@router.post("/create-link")
async def create_payment_link(
    request: CreatePaymentLinkRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cria um novo link de pagamento"""
    # Obter configurações de pagamento
    settings = await db.payment_settings.find_one({}, {"_id": 0})
    active_gateway = settings.get("active_gateway", "mercadopago") if settings else "mercadopago"
    
    # Calcular data de expiração se fornecida
    expires_at = None
    if request.expires_in_days:
        expires_at = (datetime.now() + timedelta(days=request.expires_in_days)).isoformat()
    
    # Criar link
    link = PaymentLink(
        user_id=current_user["sub"],
        title=request.title,
        description=request.description,
        amount=request.amount,
        gateway=PaymentGateway(active_gateway),
        max_uses=request.max_uses,
        expires_at=expires_at
    )
    
    # Gerar URL do link
    # Em produção, você integraria com o gateway para criar um link de checkout
    link.gateway_link_url = f"{os.environ.get('FRONTEND_URL', '')}/pay/{link.id}"
    
    await db.payment_links.insert_one(link.model_dump())
    
    return {
        "message": "Link criado com sucesso",
        "link": link.model_dump()
    }


@router.get("/links/{link_id}")
async def get_link(link_id: str):
    """Obtém um link de pagamento pelo ID (público)"""
    link = await db.payment_links.find_one({"id": link_id}, {"_id": 0})
    
    if not link:
        raise HTTPException(status_code=404, detail="Link não encontrado")
    
    if not link.get("is_active"):
        raise HTTPException(status_code=400, detail="Link inativo")
    
    # Verificar se expirou
    if link.get("expires_at"):
        expires_at = datetime.fromisoformat(link["expires_at"])
        if datetime.now() > expires_at:
            raise HTTPException(status_code=400, detail="Link expirado")
    
    # Verificar limite de usos
    if link.get("max_uses") and link.get("uses_count", 0) >= link["max_uses"]:
        raise HTTPException(status_code=400, detail="Limite de usos atingido")
    
    return link


@router.delete("/links/{link_id}")
async def delete_link(link_id: str, current_user: dict = Depends(get_current_user)):
    """Exclui um link de pagamento"""
    link = await db.payment_links.find_one({"id": link_id}, {"_id": 0})
    
    if not link:
        raise HTTPException(status_code=404, detail="Link não encontrado")
    
    if link["user_id"] != current_user["sub"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    await db.payment_links.delete_one({"id": link_id})
    
    return {"message": "Link excluído com sucesso"}


@router.put("/links/{link_id}/toggle")
async def toggle_link(link_id: str, current_user: dict = Depends(get_current_user)):
    """Ativa/desativa um link de pagamento"""
    link = await db.payment_links.find_one({"id": link_id}, {"_id": 0})
    
    if not link:
        raise HTTPException(status_code=404, detail="Link não encontrado")
    
    if link["user_id"] != current_user["sub"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    new_status = not link.get("is_active", True)
    
    await db.payment_links.update_one(
        {"id": link_id},
        {"$set": {"is_active": new_status, "updated_at": datetime.now().isoformat()}}
    )
    
    return {"message": f"Link {'ativado' if new_status else 'desativado'}", "is_active": new_status}


@router.post("/links/{link_id}/use")
async def increment_link_usage(link_id: str):
    """Incrementa o contador de uso do link (chamado após pagamento bem-sucedido)"""
    result = await db.payment_links.update_one(
        {"id": link_id},
        {
            "$inc": {"uses_count": 1},
            "$set": {"updated_at": datetime.now().isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Link não encontrado")
    
    return {"message": "Uso registrado"}


@router.get("/all-links")
async def get_all_links(
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Obtém todos os links (admin apenas)"""
    if current_user.get("role") not in ["admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    links = await db.payment_links.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    # Adicionar nome do usuário a cada link
    for link in links:
        user = await db.users.find_one({"id": link["user_id"]}, {"_id": 0, "full_name": 1})
        link["user_name"] = user.get("full_name", "Desconhecido") if user else "Desconhecido"
    
    return links


@router.get("/leaderboard")
async def get_sales_leaderboard(current_user: dict = Depends(get_current_user)):
    """Obtém o ranking de vendas"""
    # Agregar vendas por usuário
    pipeline = [
        {
            "$match": {
                "purpose": "sales_link",
                "status": {"$in": ["approved", "paid"]}
            }
        },
        {
            "$group": {
                "_id": "$user_id",
                "total_sales": {"$sum": 1},
                "total_amount": {"$sum": "$amount"}
            }
        },
        {"$sort": {"total_sales": -1}},
        {"$limit": 10}
    ]
    
    results = await db.transactions.aggregate(pipeline).to_list(10)
    
    # Adicionar nomes dos usuários
    leaderboard = []
    for i, result in enumerate(results):
        user = await db.users.find_one({"id": result["_id"]}, {"_id": 0, "full_name": 1})
        leaderboard.append({
            "rank": i + 1,
            "user_id": result["_id"],
            "user_name": user.get("full_name", "Anônimo") if user else "Anônimo",
            "total_sales": result["total_sales"],
            "total_amount": result["total_amount"]
        })
    
    return leaderboard
