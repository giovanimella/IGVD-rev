"""
Rotas para gerenciamento das 5 vendas em campo
Integração com PagBank - Checkout Externo
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from datetime import datetime, timezone, timedelta
import os
import uuid

from auth import get_current_user
from models_payment import (
    PaymentLink, CreatePaymentLinkRequest, PaymentGateway,
    Sale, SaleStatus, DeviceSource, RegisterSaleRequest
)
from services.pagbank_service import PagBankService

router = APIRouter(prefix="/sales", tags=["sales"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


async def get_pagbank_service() -> PagBankService:
    """Obtém o serviço PagBank configurado"""
    settings = await db.payment_settings.find_one({}, {"_id": 0})
    
    if not settings:
        return PagBankService(token=None, email=None, is_sandbox=True)
    
    is_sandbox = settings.get("environment") == "sandbox"
    
    if is_sandbox:
        credentials = settings.get("sandbox_credentials", {})
    else:
        credentials = settings.get("production_credentials", {})
    
    token = credentials.get("pagseguro_token")
    email = credentials.get("pagseguro_email")
    
    return PagBankService(token=token, email=email, is_sandbox=is_sandbox)


def get_frontend_url(request) -> str:
    """Gera a URL base do frontend para redirecionamento"""
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', '')
    
    if backend_url:
        frontend_url = backend_url.rstrip('/')
        if frontend_url.endswith('/api'):
            frontend_url = frontend_url[:-4]
        return frontend_url
    
    host = request.headers.get("host", "localhost:3000")
    scheme = request.headers.get("x-forwarded-proto", "https")
    
    if ":8001" in host:
        host = host.replace(":8001", ":3000")
    
    return f"{scheme}://{host}"


def get_webhook_url(request) -> str:
    """Gera a URL do webhook"""
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', '')
    if backend_url:
        return f"{backend_url}/api/payments/webhooks/pagbank"
    
    host = request.headers.get("host", "localhost:8001")
    scheme = request.headers.get("x-forwarded-proto", "https")
    return f"{scheme}://{host}/api/payments/webhooks/pagbank"


# ==================== ROTAS DAS 5 VENDAS EM CAMPO ====================

@router.get("/my-sales")
async def get_my_sales(current_user: dict = Depends(get_current_user)):
    """Obtém todas as vendas do usuário logado"""
    sales = await db.sales.find(
        {"user_id": current_user["sub"]},
        {"_id": 0}
    ).sort("sale_number", 1).to_list(10)
    
    # Calcular estatísticas
    total_sales = len(sales)
    completed_sales = len([s for s in sales if s.get("status") == "paid"])
    pending_sales = len([s for s in sales if s.get("status") == "pending"])
    
    return {
        "sales": sales,
        "total_sales": total_sales,
        "completed_sales": completed_sales,
        "pending_sales": pending_sales,
        "remaining_sales": 5 - completed_sales
    }


@router.post("/register")
async def register_sale(
    request: RegisterSaleRequest,
    req: Request,
    current_user: dict = Depends(get_current_user)
):
    """Registra uma nova venda e gera link de pagamento no PagBank"""
    # Verificar se já existe venda com este número para o usuário
    existing = await db.sales.find_one({
        "user_id": current_user["sub"],
        "sale_number": request.sale_number
    })
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Já existe uma venda registrada com o número {request.sale_number}"
        )
    
    # Verificar se já completou as 5 vendas
    sales_count = await db.sales.count_documents({"user_id": current_user["sub"]})
    if sales_count >= 5:
        raise HTTPException(status_code=400, detail="Você já registrou as 5 vendas")
    
    # Criar reference_id único
    sale_id = str(uuid.uuid4())
    reference_id = f"sale_{sale_id[:12]}"
    
    # Criar venda
    sale = Sale(
        id=sale_id,
        user_id=current_user["sub"],
        sale_number=request.sale_number,
        customer_name=request.customer_name,
        customer_phone=request.customer_phone,
        customer_email=request.customer_email,
        customer_cpf=request.customer_cpf,
        device_serial=request.device_serial,
        device_source=DeviceSource(request.device_source),
        sale_value=request.sale_value,
        status=SaleStatus.PENDING
    )
    
    # Gerar link de pagamento via PagBank
    checkout_url = None
    checkout_id = None
    
    try:
        service = await get_pagbank_service()
        
        # Obter URL do frontend
        frontend_url = get_frontend_url(req)
        
        redirect_url = f"{frontend_url}/sales"
        
        # Webhook URL
        webhook_url = get_webhook_url(req)
        
        # Criar checkout
        result = await service.create_checkout(
            reference_id=reference_id,
            amount=request.sale_value,
            item_name=f"Venda {request.sale_number} - {request.customer_name}",
            customer_name=request.customer_name,
            customer_email=request.customer_email,
            customer_cpf=request.customer_cpf,
            redirect_url=redirect_url,
            notification_urls=[webhook_url]
        )
        
        if result.get("success"):
            checkout_id = result.get("checkout_id")
            checkout_url = result.get("checkout_url")
            
            sale.checkout_id = checkout_id
            sale.checkout_url = checkout_url
        else:
            # Log do erro mas continua salvando a venda
            print(f"Erro ao criar checkout: {result.get('error')}")
            
    except Exception as e:
        print(f"Erro ao criar checkout PagBank: {e}")
    
    # Salvar venda com reference_id
    sale_dict = sale.model_dump()
    sale_dict["checkout_reference_id"] = reference_id
    await db.sales.insert_one(sale_dict)
    
    # Salvar transação se checkout foi criado
    if checkout_id:
        transaction = {
            "id": str(uuid.uuid4()),
            "reference_id": reference_id,
            "checkout_id": checkout_id,
            "checkout_url": checkout_url,
            "user_id": current_user["sub"],
            "sale_id": sale_id,
            "amount": request.sale_value,
            "item_name": f"Venda {request.sale_number} - {request.customer_name}",
            "purpose": "sales_link",
            "status": "pending",
            "customer_name": request.customer_name,
            "customer_email": request.customer_email,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
    
    return {
        "message": "Venda registrada com sucesso",
        "sale": sale.model_dump(),
        "checkout_url": checkout_url
    }


@router.get("/my-progress")
async def get_my_progress(current_user: dict = Depends(get_current_user)):
    """Obtém o progresso das 5 vendas do usuário"""
    # Contar vendas pagas
    completed_sales = await db.sales.count_documents({
        "user_id": current_user["sub"],
        "status": "paid"
    })
    
    return {
        "completed": completed_sales,
        "total": 5
    }


@router.get("/{sale_id}")
async def get_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
    """Obtém uma venda específica"""
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    # Verificar permissão
    if sale["user_id"] != current_user["sub"] and current_user.get("role") not in ["admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    return sale


@router.put("/{sale_id}")
async def update_sale(
    sale_id: str,
    request: RegisterSaleRequest,
    current_user: dict = Depends(get_current_user)
):
    """Atualiza uma venda existente"""
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    # Verificar permissão
    if sale["user_id"] != current_user["sub"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Não permitir editar venda já paga
    if sale.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Não é possível editar uma venda já paga")
    
    # Verificar se o novo número da venda já existe (se mudou)
    if request.sale_number != sale.get("sale_number"):
        existing = await db.sales.find_one({
            "user_id": current_user["sub"],
            "sale_number": request.sale_number,
            "id": {"$ne": sale_id}
        })
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Já existe uma venda com o número {request.sale_number}"
            )
    
    # Atualizar venda
    update_data = {
        "sale_number": request.sale_number,
        "customer_name": request.customer_name,
        "customer_phone": request.customer_phone,
        "customer_email": request.customer_email,
        "customer_cpf": request.customer_cpf,
        "device_serial": request.device_serial,
        "device_source": request.device_source,
        "sale_value": request.sale_value,
        "updated_at": datetime.now().isoformat()
    }
    
    await db.sales.update_one({"id": sale_id}, {"$set": update_data})
    
    return {"message": "Venda atualizada com sucesso"}


@router.delete("/{sale_id}")
async def delete_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
    """Exclui uma venda"""
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    # Verificar permissão
    if sale["user_id"] != current_user["sub"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Não permitir excluir venda já paga
    if sale.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Não é possível excluir uma venda já paga")
    
    await db.sales.delete_one({"id": sale_id})
    
    return {"message": "Venda excluída com sucesso"}


@router.post("/{sale_id}/simulate-payment")
async def simulate_payment(sale_id: str, current_user: dict = Depends(get_current_user)):
    """Simula o pagamento de uma venda (para testes - apenas em sandbox)"""
    # Verificar ambiente
    settings = await db.payment_settings.find_one({}, {"_id": 0})
    if settings and settings.get("environment") != "sandbox":
        raise HTTPException(status_code=400, detail="Simulação só disponível em modo sandbox")
    
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    # Verificar permissão
    if sale["user_id"] != current_user["sub"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if sale.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Venda já está paga")
    
    # Marcar como paga
    await db.sales.update_one(
        {"id": sale_id},
        {"$set": {
            "status": "paid",
            "paid_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Verificar se completou as 5 vendas
    paid_count = await db.sales.count_documents({
        "user_id": current_user["sub"],
        "status": "paid"
    })
    
    advanced_to_next_stage = False
    if paid_count >= 5:
        # Avançar usuário para próxima etapa
        await db.users.update_one(
            {"id": current_user["sub"]},
            {"$set": {
                "current_stage": "documentos_pj",
                "field_sales_count": 5,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        advanced_to_next_stage = True
    
    return {
        "message": "Pagamento simulado com sucesso",
        "completed_sales": paid_count,
        "remaining_sales": 5 - paid_count,
        "advanced_to_next_stage": advanced_to_next_stage
    }


# ==================== ROTAS DE LINKS DE PAGAMENTO ====================

@router.get("/my-links")
async def get_my_links(current_user: dict = Depends(get_current_user)):
    """Obtém os links de pagamento do usuário"""
    links = await db.payment_links.find(
        {"user_id": current_user["sub"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return links


@router.post("/create-link")
async def create_payment_link(
    request: CreatePaymentLinkRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cria um novo link de pagamento"""
    # Obter configurações de pagamento
    settings = await db.payment_settings.find_one({}, {"_id": 0})
    active_gateway = settings.get("active_gateway", "pagseguro") if settings else "pagseguro"
    
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
    """Incrementa o contador de uso do link"""
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
        {"$match": {"status": "paid"}},
        {
            "$group": {
                "_id": "$user_id",
                "total_sales": {"$sum": 1},
                "total_amount": {"$sum": "$sale_value"}
            }
        },
        {"$sort": {"total_sales": -1}},
        {"$limit": 10}
    ]
    
    results = await db.sales.aggregate(pipeline).to_list(10)
    
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
