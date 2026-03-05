"""
Rotas de configuração e processamento de pagamentos
Sistema de Gateway: PagBank - Checkout Externo
O checkout é feito no ambiente do PagBank, não no sistema.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import logging
import json
import uuid
import os

from auth import get_current_user, require_role
from motor.motor_asyncio import AsyncIOMotorClient
from services.pagbank_service import PagBankService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


# ==================== MODELOS ====================

class PaymentSettingsUpdate(BaseModel):
    environment: Optional[str] = None  # sandbox ou production
    sandbox_credentials: Optional[dict] = None
    production_credentials: Optional[dict] = None
    pix_enabled: Optional[bool] = None
    credit_card_enabled: Optional[bool] = None
    split_payment_enabled: Optional[bool] = None
    max_installments: Optional[int] = None
    min_installment_value: Optional[float] = None


class CreateCheckoutRequest(BaseModel):
    amount: float
    item_name: str
    purpose: str  # 'training_fee' ou 'sales_link'
    reference_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_cpf: Optional[str] = None


# ==================== HELPERS ====================

async def get_payment_settings():
    """Obtém as configurações de pagamento"""
    settings = await db.payment_settings.find_one({}, {"_id": 0})
    if not settings:
        # Criar configuração padrão
        settings = {
            "id": str(uuid.uuid4()),
            "active_gateway": "pagseguro",
            "environment": "sandbox",
            "sandbox_credentials": {
                "pagseguro_email": None,
                "pagseguro_token": None
            },
            "production_credentials": {
                "pagseguro_email": None,
                "pagseguro_token": None
            },
            "pix_enabled": True,
            "credit_card_enabled": True,
            "split_payment_enabled": True,
            "max_installments": 12,
            "min_installment_value": 5.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        # Create a copy for database insertion to avoid _id pollution
        settings_for_db = settings.copy()
        await db.payment_settings.insert_one(settings_for_db)
    return settings


async def get_pagbank_service() -> PagBankService:
    """
    Obtém o serviço PagBank configurado para Checkout
    USA AS MESMAS CREDENCIAIS DO SISTEMA DE ASSINATURAS (unificado)
    """
    # Usar collection de subscription_settings (credenciais unificadas)
    settings = await db.subscription_settings.find_one({}, {"_id": 0})
    
    if not settings:
        # Fallback para payment_settings (legado)
        settings = await get_payment_settings()
        is_sandbox = settings.get("environment") == "sandbox"
        if is_sandbox:
            credentials = settings.get("sandbox_credentials", {})
        else:
            credentials = settings.get("production_credentials", {})
        token = credentials.get("pagseguro_token")
        email = credentials.get("pagseguro_email")
    else:
        # Usar credenciais unificadas de subscription_settings
        is_sandbox = settings.get("pagbank_environment") == "sandbox"
        token = settings.get("pagbank_token")
        email = settings.get("pagbank_email")
    
    return PagBankService(token=token, email=email, is_sandbox=is_sandbox)


def get_webhook_url(request: Request) -> str:
    """Gera a URL do webhook baseada na requisição"""
    # Obter URL base do backend (configurada no .env)
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', '')
    if backend_url:
        # REACT_APP_BACKEND_URL já aponta para o backend
        return f"{backend_url}/api/payments/webhooks/pagbank"
    
    # Fallback: usar a URL da requisição
    host = request.headers.get("host", "localhost:8001")
    scheme = request.headers.get("x-forwarded-proto", "https")
    return f"{scheme}://{host}/api/payments/webhooks/pagbank"


def get_frontend_url(request: Request) -> str:
    """Gera a URL base do frontend para redirecionamento"""
    # O REACT_APP_BACKEND_URL aponta para o backend
    # Para o frontend, removemos /api se existir e usamos a mesma base
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', '')
    
    if backend_url:
        # A URL do frontend é a mesma base do backend (sem /api)
        # Em produção, ambos ficam no mesmo domínio
        frontend_url = backend_url.rstrip('/')
        # Remover /api se existir
        if frontend_url.endswith('/api'):
            frontend_url = frontend_url[:-4]
        return frontend_url
    
    # Fallback: construir a partir da requisição
    host = request.headers.get("host", "localhost:3000")
    scheme = request.headers.get("x-forwarded-proto", "https")
    
    # Se host contém porta 8001, mudar para 3000
    if ":8001" in host:
        host = host.replace(":8001", ":3000")
    
    return f"{scheme}://{host}"


# ==================== CONFIGURAÇÕES (ADMIN) ====================

@router.get("/settings")
async def get_payment_settings_route(current_user: dict = Depends(get_current_user)):
    """Obtém as configurações de pagamento (somente admin)"""
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    settings = await get_payment_settings()
    
    # Mascarar tokens sensíveis
    def mask_token(token: str) -> str:
        if not token or len(token) < 10:
            return token
        return token[:6] + "*" * (len(token) - 10) + token[-4:]
    
    masked = settings.copy()
    
    if masked.get("sandbox_credentials"):
        sandbox = masked["sandbox_credentials"].copy()
        if sandbox.get("pagseguro_token"):
            sandbox["pagseguro_token"] = mask_token(sandbox["pagseguro_token"])
        masked["sandbox_credentials"] = sandbox
    
    if masked.get("production_credentials"):
        production = masked["production_credentials"].copy()
        if production.get("pagseguro_token"):
            production["pagseguro_token"] = mask_token(production["pagseguro_token"])
        masked["production_credentials"] = production
    
    return masked


@router.put("/settings")
async def update_payment_settings(
    updates: PaymentSettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Atualiza as configurações de pagamento (somente admin)"""
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Garantir que active_gateway seja sempre pagseguro
    update_dict["active_gateway"] = "pagseguro"
    
    await db.payment_settings.update_one(
        {},
        {"$set": update_dict},
        upsert=True
    )
    
    return {"message": "Configurações atualizadas com sucesso"}


# ==================== TESTE DE INTEGRAÇÃO ====================

@router.post("/test-connection")
async def test_pagbank_connection(current_user: dict = Depends(get_current_user)):
    """Testa a conexão com o PagBank"""
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    service = await get_pagbank_service()
    result = await service.test_connection()
    
    # Salvar log do teste
    log_entry = {
        "id": str(uuid.uuid4()),
        "type": "connection_test",
        "result": result,
        "tested_by": current_user["sub"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_logs.insert_one(log_entry)
    
    return result


@router.post("/test-checkout")
async def test_checkout_creation(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Cria um checkout de teste para verificar a integração"""
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    service = await get_pagbank_service()
    
    # Criar um checkout de teste com valor mínimo
    test_reference = f"test_{uuid.uuid4().hex[:12]}"
    webhook_url = get_webhook_url(request)
    
    result = await service.create_checkout(
        reference_id=test_reference,
        amount=1.00,  # R$ 1,00 para teste
        item_name="Teste de Integração PagBank",
        customer_name="Teste Sistema",
        customer_email="teste@teste.com",
        notification_urls=[webhook_url]
    )
    
    # Salvar log do teste
    log_entry = {
        "id": str(uuid.uuid4()),
        "type": "checkout_test",
        "reference_id": test_reference,
        "result": {
            "success": result.get("success"),
            "checkout_id": result.get("checkout_id"),
            "checkout_url": result.get("checkout_url"),
            "error": result.get("error")
        },
        "tested_by": current_user["sub"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_logs.insert_one(log_entry)
    
    return result


# ==================== LOGS E HISTÓRICO ====================

@router.get("/logs")
async def get_payment_logs(
    limit: int = 50,
    log_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtém os logs de pagamento"""
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    query = {}
    if log_type:
        query["type"] = log_type
    
    logs = await db.payment_logs.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return logs


@router.get("/transactions")
async def get_all_transactions(
    limit: int = 100,
    status: Optional[str] = None,
    purpose: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtém todas as transações"""
    if current_user.get("role") not in ["admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    query = {}
    if status:
        query["status"] = status
    if purpose:
        query["purpose"] = purpose
    
    transactions = await db.payment_transactions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Enriquecer com dados do usuário
    for tx in transactions:
        if tx.get("user_id"):
            user = await db.users.find_one(
                {"id": tx["user_id"]},
                {"_id": 0, "full_name": 1, "email": 1}
            )
            if user:
                tx["user_name"] = user.get("full_name")
                tx["user_email"] = user.get("email")
    
    return transactions


@router.delete("/logs")
async def clear_payment_logs(current_user: dict = Depends(get_current_user)):
    """Limpa todos os logs de pagamento (somente admin)"""
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    result = await db.payment_logs.delete_many({})
    
    return {"message": f"{result.deleted_count} logs removidos"}


# ==================== CRIAR CHECKOUT ====================

@router.post("/create-checkout")
async def create_checkout(
    data: CreateCheckoutRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Cria um checkout no PagBank e retorna a URL para redirecionamento
    Usado para pagamento da taxa de treinamento e links de vendas
    """
    service = await get_pagbank_service()
    
    # Gerar reference_id se não fornecido
    reference_id = data.reference_id or f"{data.purpose}_{uuid.uuid4().hex[:12]}"
    
    # Obter URL do frontend para redirecionamento
    frontend_url = get_frontend_url(request)
    
    # Definir URL de retorno baseado no propósito
    if data.purpose == "training_fee":
        redirect_url = f"{frontend_url}/training"
    elif data.purpose == "sales_link":
        redirect_url = f"{frontend_url}/sales"
    else:
        redirect_url = f"{frontend_url}/payment/success"
    
    # URL do webhook
    webhook_url = get_webhook_url(request)
    
    # Criar checkout
    result = await service.create_checkout(
        reference_id=reference_id,
        amount=data.amount,
        item_name=data.item_name,
        customer_name=data.customer_name,
        customer_email=data.customer_email,
        customer_cpf=data.customer_cpf,
        redirect_url=redirect_url,
        notification_urls=[webhook_url]
    )
    
    if result.get("success"):
        # Salvar transação no banco
        transaction = {
            "id": str(uuid.uuid4()),
            "reference_id": reference_id,
            "checkout_id": result.get("checkout_id"),
            "checkout_url": result.get("checkout_url"),
            "user_id": current_user["sub"],
            "amount": data.amount,
            "item_name": data.item_name,
            "purpose": data.purpose,
            "status": "pending",
            "customer_name": data.customer_name,
            "customer_email": data.customer_email,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
        
        # Log
        log_entry = {
            "id": str(uuid.uuid4()),
            "type": "checkout_created",
            "reference_id": reference_id,
            "checkout_id": result.get("checkout_id"),
            "amount": data.amount,
            "purpose": data.purpose,
            "user_id": current_user["sub"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_logs.insert_one(log_entry)
    
    return result


# ==================== CHECKOUT PARA TREINAMENTO ====================

@router.post("/training/checkout")
async def create_training_checkout(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Cria checkout para pagamento da taxa de treinamento presencial
    O valor vem das configurações de treinamento
    """
    # Buscar usuário
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Buscar inscrição do treinamento
    registration = await db.training_registrations.find_one(
        {"user_id": current_user["sub"]},
        {"_id": 0}
    )
    
    if not registration:
        raise HTTPException(status_code=400, detail="Você precisa se inscrever primeiro")
    
    if registration.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Pagamento já realizado")
    
    # Valor do treinamento (da inscrição ou configuração)
    amount = registration.get("price")
    if not amount:
        config = await db.training_config.find_one({"id": "training_config"}, {"_id": 0})
        has_spouse = registration.get("has_spouse", False)
        amount = config.get("couple_price", 6000.0) if has_spouse else config.get("solo_price", 3500.0)
    
    # Dados do cliente
    personal_data = registration.get("personal_data", {})
    
    # Criar reference_id único
    reference_id = f"training_{registration.get('id', uuid.uuid4().hex[:12])}"
    
    # Obter URL do frontend
    frontend_url = get_frontend_url(request)
    
    redirect_url = f"{frontend_url}/training"
    webhook_url = get_webhook_url(request)
    
    # Criar checkout
    service = await get_pagbank_service()
    
    item_name = "Treinamento Presencial IGVD"
    if registration.get("has_spouse"):
        item_name += " (com cônjuge)"
    
    result = await service.create_checkout(
        reference_id=reference_id,
        amount=amount,
        item_name=item_name,
        customer_name=personal_data.get("full_name"),
        customer_email=personal_data.get("email"),
        customer_cpf=personal_data.get("cpf"),
        redirect_url=redirect_url,
        notification_urls=[webhook_url]
    )
    
    if result.get("success"):
        # Atualizar inscrição com dados do checkout
        await db.training_registrations.update_one(
            {"user_id": current_user["sub"]},
            {"$set": {
                "checkout_id": result.get("checkout_id"),
                "checkout_url": result.get("checkout_url"),
                "checkout_reference_id": reference_id,
                "checkout_created_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Salvar transação
        transaction = {
            "id": str(uuid.uuid4()),
            "reference_id": reference_id,
            "checkout_id": result.get("checkout_id"),
            "checkout_url": result.get("checkout_url"),
            "user_id": current_user["sub"],
            "registration_id": registration.get("id"),
            "amount": amount,
            "item_name": item_name,
            "purpose": "training_fee",
            "status": "pending",
            "customer_name": personal_data.get("full_name"),
            "customer_email": personal_data.get("email"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
        
        # Log
        log_entry = {
            "id": str(uuid.uuid4()),
            "type": "training_checkout_created",
            "reference_id": reference_id,
            "checkout_id": result.get("checkout_id"),
            "amount": amount,
            "user_id": current_user["sub"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_logs.insert_one(log_entry)
    
    return result


# ==================== VERIFICAR STATUS ====================

@router.get("/status/{reference_id}")
async def check_payment_status(
    reference_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Verifica o status de um pagamento pelo reference_id"""
    # Buscar transação
    transaction = await db.payment_transactions.find_one(
        {"reference_id": reference_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    # Verificar permissão
    if transaction.get("user_id") != current_user["sub"] and current_user.get("role") not in ["admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Se já está pago, retornar
    if transaction.get("status") == "paid":
        return {
            "status": "paid",
            "paid_at": transaction.get("paid_at"),
            "transaction": transaction
        }
    
    # Consultar status no PagBank
    checkout_id = transaction.get("checkout_id")
    if checkout_id:
        service = await get_pagbank_service()
        result = await service.get_checkout_status(checkout_id)
        
        if result.get("is_paid"):
            # Atualizar transação
            await db.payment_transactions.update_one(
                {"reference_id": reference_id},
                {"$set": {
                    "status": "paid",
                    "paid_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {
                "status": "paid",
                "checkout_status": result.get("status"),
                "transaction": transaction
            }
    
    return {
        "status": transaction.get("status", "pending"),
        "checkout_id": checkout_id,
        "transaction": transaction
    }


# ==================== WEBHOOKS ====================

@router.post("/webhooks/pagbank")
async def handle_pagbank_webhook(request: Request):
    """
    Recebe notificações do PagBank sobre atualizações de pagamento
    """
    try:
        body = await request.body()
        
        # Tentar parsear como JSON
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            # Pode ser form-encoded
            data = dict(await request.form())
        
        logger.info(f"[Webhook PagBank] Notificação recebida: {json.dumps(data, default=str)[:500]}")
        
        # Salvar log do webhook
        log_entry = {
            "id": str(uuid.uuid4()),
            "type": "webhook_received",
            "payload": data,
            "headers": dict(request.headers),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_logs.insert_one(log_entry)
        
        # Extrair informações do webhook
        parsed = PagBankService.parse_webhook_notification(data)
        reference_id = parsed.get("reference_id")
        
        if reference_id and parsed.get("is_paid"):
            logger.info(f"[Webhook PagBank] Pagamento confirmado para reference_id={reference_id}")
            
            # Atualizar transação
            await db.payment_transactions.update_one(
                {"reference_id": reference_id},
                {"$set": {
                    "status": "paid",
                    "paid_at": datetime.now(timezone.utc).isoformat(),
                    "webhook_data": data
                }}
            )
            
            # Verificar se é pagamento de treinamento
            if reference_id.startswith("training_"):
                # Buscar inscrição pelo reference_id
                registration = await db.training_registrations.find_one(
                    {"checkout_reference_id": reference_id}
                )
                
                if registration:
                    # Atualizar status do pagamento
                    await db.training_registrations.update_one(
                        {"id": registration["id"]},
                        {"$set": {
                            "payment_status": "paid",
                            "payment_transaction_id": parsed.get("charge_id"),
                            "paid_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    logger.info(f"[Webhook PagBank] Pagamento de treinamento confirmado para user_id={registration.get('user_id')}")
            
            # Verificar se é pagamento de venda
            elif reference_id.startswith("sale_"):
                # Buscar venda pelo reference_id
                sale = await db.sales.find_one(
                    {"checkout_reference_id": reference_id}
                )
                
                if sale:
                    # Atualizar status da venda
                    await db.sales.update_one(
                        {"id": sale["id"]},
                        {"$set": {
                            "status": "paid",
                            "paid_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    # Verificar se usuário completou as 5 vendas
                    user_id = sale.get("user_id")
                    if user_id:
                        paid_count = await db.sales.count_documents({
                            "user_id": user_id,
                            "status": "paid"
                        })
                        
                        if paid_count >= 5:
                            await db.users.update_one(
                                {"id": user_id},
                                {"$set": {
                                    "current_stage": "documentos_pj",
                                    "field_sales_count": 5,
                                    "updated_at": datetime.now(timezone.utc).isoformat()
                                }}
                            )
                            logger.info(f"[Webhook PagBank] Usuário {user_id} completou 5 vendas e avançou para documentos_pj")
                    
                    logger.info(f"[Webhook PagBank] Pagamento de venda confirmado: sale_id={sale.get('id')}")
        
        return {"success": True, "message": "Webhook processado"}
        
    except Exception as e:
        logger.error(f"[Webhook PagBank] Erro: {e}")
        
        # Salvar log de erro
        log_entry = {
            "id": str(uuid.uuid4()),
            "type": "webhook_error",
            "error": str(e),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_logs.insert_one(log_entry)
        
        return {"success": False, "error": str(e)}


# Manter compatibilidade com rota antiga
@router.post("/webhooks/pagseguro")
async def handle_pagseguro_webhook(request: Request):
    """Alias para /webhooks/pagbank (compatibilidade)"""
    return await handle_pagbank_webhook(request)


# ==================== SIMULAÇÃO (MODO TESTE) ====================

@router.post("/simulate-payment/{reference_id}")
async def simulate_payment(
    reference_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Simula a confirmação de um pagamento (apenas para testes)
    """
    settings = await get_payment_settings()
    
    if settings.get("environment") != "sandbox":
        raise HTTPException(status_code=400, detail="Simulação só disponível em modo sandbox")
    
    # Buscar transação
    transaction = await db.payment_transactions.find_one(
        {"reference_id": reference_id}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    if transaction.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Pagamento já confirmado")
    
    # Atualizar transação
    await db.payment_transactions.update_one(
        {"reference_id": reference_id},
        {"$set": {
            "status": "paid",
            "paid_at": datetime.now(timezone.utc).isoformat(),
            "simulated": True
        }}
    )
    
    # Processar como se fosse webhook real
    if reference_id.startswith("training_"):
        registration = await db.training_registrations.find_one(
            {"checkout_reference_id": reference_id}
        )
        
        if registration:
            await db.training_registrations.update_one(
                {"id": registration["id"]},
                {"$set": {
                    "payment_status": "paid",
                    "payment_transaction_id": f"SIM_{uuid.uuid4().hex[:8]}",
                    "paid_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    elif reference_id.startswith("sale_"):
        sale = await db.sales.find_one(
            {"checkout_reference_id": reference_id}
        )
        
        if sale:
            await db.sales.update_one(
                {"id": sale["id"]},
                {"$set": {
                    "status": "paid",
                    "paid_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Verificar se completou 5 vendas
            user_id = sale.get("user_id")
            if user_id:
                paid_count = await db.sales.count_documents({
                    "user_id": user_id,
                    "status": "paid"
                })
                
                if paid_count >= 5:
                    await db.users.update_one(
                        {"id": user_id},
                        {"$set": {
                            "current_stage": "documentos_pj",
                            "field_sales_count": 5,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
    
    # Log
    log_entry = {
        "id": str(uuid.uuid4()),
        "type": "payment_simulated",
        "reference_id": reference_id,
        "user_id": current_user["sub"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_logs.insert_one(log_entry)
    
    return {
        "success": True,
        "message": "Pagamento simulado com sucesso",
        "reference_id": reference_id
    }


# ==================== PÚBLICO: KEY PARA FRONTEND ====================

@router.get("/settings/public-key")
async def get_public_key(current_user: dict = Depends(get_current_user)):
    """Retorna informações públicas do gateway (para frontend)"""
    settings = await get_payment_settings()
    
    return {
        "gateway": "pagbank",
        "environment": settings.get("environment", "sandbox"),
        "pix_enabled": settings.get("pix_enabled", True),
        "credit_card_enabled": settings.get("credit_card_enabled", True),
        "max_installments": settings.get("max_installments", 12)
    }
