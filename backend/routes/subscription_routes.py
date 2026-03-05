"""
Rotas de API para Sistema de Assinatura e Mensalidade Recorrente
Integração com PagBank API de Assinaturas
"""
from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging
import os
import uuid

from auth import get_current_user, require_role
from models_subscription import (
    SubscriptionSettings,
    SubscriptionSettingsUpdate,
    CreateSubscriptionRequest,
    UpdatePaymentMethodRequest,
    UserSubscription,
    SubscriptionStatus,
    SubscriptionPayment,
    PaymentStatus,
    SubscriptionResponse,
    SubscriptionStatusResponse,
    SubscriptionWebhookEvent,
    CreatePlanRequest,
    SubscriptionPlan
)
from services.pagbank_subscription_service_v2 import PagBankSubscriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


# ==================== HELPERS ====================

async def get_subscription_settings():
    """Obtém as configurações de assinatura"""
    settings = await db.subscription_settings.find_one({}, {"_id": 0})
    if not settings:
        # Criar configuração padrão
        settings = SubscriptionSettings().model_dump()
        await db.subscription_settings.insert_one(settings.copy())
    return settings


async def get_pagbank_subscription_service() -> PagBankSubscriptionService:
    """Obtém o serviço PagBank Subscriptions configurado"""
    settings = await get_subscription_settings()
    
    is_sandbox = settings.get("pagbank_environment") == "sandbox"
    bearer_token = settings.get("pagbank_token")
    
    return PagBankSubscriptionService(bearer_token=bearer_token, is_sandbox=is_sandbox)


async def check_user_subscription_status(user_id: str) -> dict:
    """
    Verifica o status da assinatura do usuário
    
    Returns:
        dict com has_active_subscription, is_blocked, status, etc
    """
    subscription = await db.user_subscriptions.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    if not subscription:
        return {
            "has_active_subscription": False,
            "is_blocked": True,
            "status": None,
            "overdue_months": 0,
            "subscription": None
        }
    
    status = subscription.get("status")
    
    # Bloqueado se: SUSPENDED, CANCELLED, ou OVERDUE
    is_blocked = status in [
        SubscriptionStatus.SUSPENDED,
        SubscriptionStatus.CANCELLED,
        SubscriptionStatus.OVERDUE
    ]
    
    # Ativo se: ACTIVE ou TRIAL
    has_active = status in [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.TRIAL
    ]
    
    return {
        "has_active_subscription": has_active,
        "is_blocked": is_blocked,
        "status": status,
        "overdue_months": subscription.get("overdue_months", 0),
        "next_billing_date": subscription.get("next_billing_date"),
        "monthly_amount": subscription.get("monthly_amount"),
        "subscription": subscription
    }


async def send_payment_failed_email(user: dict, subscription: dict):
    """Envia email notificando falha no pagamento"""
    try:
        # Buscar serviço de email (Resend)
        from services.email_service import send_email
        
        html_content = f"""
        <h2>Falha no Pagamento da Mensalidade</h2>
        <p>Olá, {user['full_name']}!</p>
        <p>Infelizmente, não conseguimos processar o pagamento da sua mensalidade.</p>
        <p><strong>Valor:</strong> R$ {subscription['monthly_amount']:.2f}</p>
        <p>Para regularizar sua situação e continuar com acesso aos conteúdos, 
        acesse sua conta e atualize seus dados de pagamento.</p>
        <p><a href="{os.environ.get('APP_URL', '')}/subscription">Atualizar Pagamento</a></p>
        <p>Caso não regularize o pagamento por 2 meses consecutivos, sua conta será suspensa.</p>
        <p>Atenciosamente,<br>Equipe UniOzoxx</p>
        """
        
        await send_email(
            to_email=user['email'],
            subject="⚠️ Falha no Pagamento - UniOzoxx",
            html_content=html_content
        )
        
        logger.info(f"Email de falha de pagamento enviado para {user['email']}")
    except Exception as e:
        logger.error(f"Erro ao enviar email de falha: {e}")


async def send_suspension_email(user: dict):
    """Envia email notificando suspensão da conta"""
    try:
        from services.email_service import send_email
        
        html_content = f"""
        <h2>Conta Suspensa por Inadimplência</h2>
        <p>Olá, {user['full_name']}!</p>
        <p>Sua conta foi suspensa devido a 2 meses consecutivos de inadimplência.</p>
        <p>Para reativar sua conta, entre em contato conosco através do email 
        <strong>contato@ozoxx.com.br</strong> ou telefone <strong>(00) 0000-0000</strong>.</p>
        <p>Nossa equipe irá ajudá-lo a regularizar a situação.</p>
        <p>Atenciosamente,<br>Equipe UniOzoxx</p>
        """
        
        await send_email(
            to_email=user['email'],
            subject="🔒 Conta Suspensa - UniOzoxx",
            html_content=html_content
        )
        
        logger.info(f"Email de suspensão enviado para {user['email']}")
    except Exception as e:
        logger.error(f"Erro ao enviar email de suspensão: {e}")


# ==================== CONFIGURAÇÕES (ADMIN) ====================

@router.get("/settings")
async def get_settings(current_user: dict = Depends(get_current_user)):
    """Obtém as configurações de assinatura (somente admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    settings = await get_subscription_settings()
    
    # Mascarar token sensível
    if settings.get("pagbank_token"):
        token = settings["pagbank_token"]
        if len(token) > 20:
            settings["pagbank_token"] = token[:10] + "*" * (len(token) - 20) + token[-10:]
    
    # Mascarar chave pública se existir
    if settings.get("pagbank_public_key"):
        key = settings["pagbank_public_key"]
        if len(key) > 40:
            settings["pagbank_public_key"] = key[:20] + "..." + key[-20:]
    
    return settings


@router.get("/public-key")
async def get_public_key():
    """
    Obtém apenas a chave pública para criptografia de cartões
    Endpoint público acessível por qualquer usuário autenticado
    """
    settings = await get_subscription_settings()
    
    public_key = settings.get("pagbank_public_key")
    monthly_fee = settings.get("monthly_fee", 49.90)
    
    return {
        "public_key": public_key,
        "monthly_fee": monthly_fee,
        "has_public_key": bool(public_key)
    }


@router.put("/settings")
async def update_settings(
    updates: SubscriptionSettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Atualiza as configurações de assinatura (somente admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # IMPORTANTE: Não salvar token se estiver mascarado (contém asteriscos)
    # Isso evita sobrescrever o token real com o valor mascarado
    if "pagbank_token" in update_dict:
        token = update_dict["pagbank_token"]
        if "*" in token:
            # Token está mascarado, não atualizar
            del update_dict["pagbank_token"]
            logger.info("[Settings] Token mascarado ignorado - mantendo token original")
    
    # IMPORTANTE: Não salvar chave pública se estiver mascarada (contém ...)
    if "pagbank_public_key" in update_dict:
        key = update_dict["pagbank_public_key"]
        if "..." in key:
            # Chave está mascarada, não atualizar
            del update_dict["pagbank_public_key"]
            logger.info("[Settings] Chave pública mascarada ignorada - mantendo chave original")
    
    await db.subscription_settings.update_one(
        {},
        {"$set": update_dict},
        upsert=True
    )
    
    return {"message": "Configurações atualizadas com sucesso"}


@router.post("/test-connection")
async def test_connection(current_user: dict = Depends(get_current_user)):
    """Testa a conexão com PagBank API"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    service = await get_pagbank_subscription_service()
    result = await service.test_connection()
    
    return result


@router.post("/generate-public-key")
async def generate_public_key(current_user: dict = Depends(get_current_user)):
    """
    Gera uma chave pública para criptografia de cartões
    Esta chave é usada no frontend para criptografar dados de cartão
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    service = await get_pagbank_subscription_service()
    result = await service.generate_public_key()
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    # Salvar a chave pública nas configurações
    await db.subscription_settings.update_one(
        {},
        {"$set": {
            "pagbank_public_key": result.get("public_key"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Chave pública gerada e salva com sucesso",
        "public_key": result.get("public_key"),
        "created_at": result.get("created_at")
    }


# ==================== PLANOS ====================

@router.post("/plans")
async def create_plan(
    plan_request: CreatePlanRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cria um plano de assinatura no PagBank (Admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    settings = await get_subscription_settings()
    service = await get_pagbank_subscription_service()
    
    # Converter para centavos
    amount_cents = int(plan_request.amount * 100)
    
    # Criar plano no PagBank com estrutura correta
    result = await service.create_plan(
        reference_id=f"plan_{uuid.uuid4().hex[:12]}",
        name=plan_request.name,
        description=plan_request.description,
        amount=amount_cents,  # Em centavos
        interval="MONTH",
        interval_count=1
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    # Salvar plano no banco
    plan = SubscriptionPlan(
        name=plan_request.name,
        description=plan_request.description,
        amount=plan_request.amount,
        pagbank_plan_id=result.get("plan_id"),
        pagbank_plan_code=result.get("plan_code")
    )
    
    await db.subscription_plans.insert_one(plan.model_dump())
    
    return {
        "message": "Plano criado com sucesso",
        "plan": plan.model_dump()
    }


@router.get("/plans")
async def list_plans(current_user: dict = Depends(get_current_user)):
    """Lista todos os planos de assinatura (banco local)"""
    plans = await db.subscription_plans.find(
        {"is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    return plans


@router.get("/pagbank-plans")
async def list_pagbank_plans(current_user: dict = Depends(get_current_user)):
    """
    Lista todos os planos diretamente do PagBank API
    Isso permite ver os planos reais criados no sandbox/produção
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    service = await get_pagbank_subscription_service()
    result = await service.list_plans()
    
    if not result.get("success"):
        raise HTTPException(
            status_code=400, 
            detail=result.get("error", "Erro ao listar planos do PagBank")
        )
    
    return {
        "success": True,
        "plans": result.get("plans", []),
        "total": result.get("total", 0)
    }


@router.post("/sync-plans")
async def sync_pagbank_plans(current_user: dict = Depends(get_current_user)):
    """
    Sincroniza os planos do PagBank com o banco local
    Busca planos do PagBank e salva/atualiza no MongoDB
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    service = await get_pagbank_subscription_service()
    result = await service.list_plans()
    
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Erro ao buscar planos do PagBank")
        )
    
    pagbank_plans = result.get("plans", [])
    synced_count = 0
    
    for pb_plan in pagbank_plans:
        plan_id = pb_plan.get("id")
        
        # Verificar se já existe no banco local
        existing = await db.subscription_plans.find_one({"pagbank_plan_id": plan_id})
        
        # Extrair valor (vem em centavos)
        amount_cents = pb_plan.get("amount", {}).get("value", 0)
        amount_reais = amount_cents / 100
        
        plan_data = {
            "pagbank_plan_id": plan_id,
            "name": pb_plan.get("name", "Plano PagBank"),
            "description": pb_plan.get("description", ""),
            "amount": amount_reais,
            "currency": pb_plan.get("amount", {}).get("currency", "BRL"),
            "pagbank_reference_id": pb_plan.get("reference_id"),
            "pagbank_status": pb_plan.get("status"),
            "is_active": pb_plan.get("status") == "ACTIVE",
            "billing_cycle": pb_plan.get("interval", {}).get("unit", "MONTH"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if existing:
            # Atualizar
            await db.subscription_plans.update_one(
                {"pagbank_plan_id": plan_id},
                {"$set": plan_data}
            )
        else:
            # Inserir novo
            plan_data["id"] = str(uuid.uuid4())
            plan_data["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.subscription_plans.insert_one(plan_data)
        
        synced_count += 1
    
    return {
        "success": True,
        "message": f"{synced_count} plano(s) sincronizado(s) com sucesso",
        "synced_count": synced_count,
        "pagbank_plans": pagbank_plans
    }


# ==================== ASSINATURAS (USUÁRIO) ====================

@router.post("/subscribe")
async def create_subscription(
    subscription_request: CreateSubscriptionRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Cria uma assinatura para o usuário atual"""
    user_id = current_user["sub"]
    
    # Verificar se já tem assinatura ativa
    existing = await db.user_subscriptions.find_one({"user_id": user_id})
    if existing and existing.get("status") in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]:
        raise HTTPException(status_code=400, detail="Você já possui uma assinatura ativa")
    
    # Buscar plano - pode ser por ID específico ou o plano ativo padrão
    if subscription_request.plan_id:
        plan = await db.subscription_plans.find_one(
            {"pagbank_plan_id": subscription_request.plan_id},
            {"_id": 0}
        )
        if not plan:
            # Tentar buscar pelo ID local
            plan = await db.subscription_plans.find_one(
                {"id": subscription_request.plan_id, "is_active": True},
                {"_id": 0}
            )
    else:
        # Buscar plano ativo padrão
        plan = await db.subscription_plans.find_one({"is_active": True}, {"_id": 0})
    
    if not plan:
        raise HTTPException(status_code=404, detail="Nenhum plano disponível. Configure um plano primeiro.")
    
    # Verificar se tem o ID do PagBank
    pagbank_plan_id = plan.get("pagbank_plan_id")
    if not pagbank_plan_id:
        raise HTTPException(
            status_code=400, 
            detail="Plano não possui ID do PagBank. Sincronize os planos primeiro."
        )
    
    logger.info(f"[Subscription] Criando assinatura para user={user_id}, plan={pagbank_plan_id}")
    
    # Criar assinatura no PagBank
    service = await get_pagbank_subscription_service()
    
    # Limpar e formatar telefone
    phone_clean = ''.join(filter(str.isdigit, subscription_request.customer_phone))
    area_code = phone_clean[:2] if len(phone_clean) >= 10 else "11"
    phone_number = phone_clean[2:] if len(phone_clean) >= 10 else phone_clean
    
    # Preparar dados do cliente conforme documentação PagBank (2024/2025)
    # ESTRUTURA CORRETA:
    # - phones usa "country" e "area" (não "country_code" e "area_code")
    # - billing_info vai no CUSTOMER com o cartão criptografado
    # - security_code vai separado no PAYMENT_METHOD
    customer_data = {
        "name": subscription_request.customer_name[:50],
        "email": subscription_request.customer_email,
        "tax_id": ''.join(filter(str.isdigit, subscription_request.customer_cpf)),
        "phones": [{
            "country": "55",   # country, não country_code!
            "area": area_code, # area, não area_code!
            "number": phone_number,
            "type": "MOBILE"
        }],
        "billing_info": [{
            "type": "CREDIT_CARD",
            "card": {
                "encrypted": subscription_request.encrypted_card  # Cartão criptografado
            }
        }]
    }
    
    result = await service.create_subscription(
        reference_id=f"user_{user_id}_{uuid.uuid4().hex[:8]}",
        plan_id=pagbank_plan_id,
        customer_data=customer_data,
        encrypted_card=subscription_request.encrypted_card,
        security_code=subscription_request.security_code,  # CVV vai separado!
        pro_rata=False
    )
    
    if not result.get("success"):
        error_msg = result.get("error", "Erro ao criar assinatura")
        error_detail = result.get("raw_response", {})
        logger.error(f"[Subscription] Erro PagBank: {error_msg} - {error_detail}")
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Criar registro de assinatura
    subscription = UserSubscription(
        user_id=user_id,
        user_email=current_user["email"],
        user_name=current_user["full_name"],
        plan_id=plan["id"],
        monthly_amount=plan["amount"],
        pagbank_subscription_id=result.get("subscription_id"),
        pagbank_subscription_code=result.get("subscription_code"),
        status=SubscriptionStatus.ACTIVE if result.get("status") == "ACTIVE" else SubscriptionStatus.PENDING,
        started_at=datetime.now(timezone.utc).isoformat(),
        next_billing_date=result.get("next_billing_date"),
        card_last_digits=result.get("card_last_digits"),
        card_brand=result.get("card_brand")
    )
    
    # Salvar ou atualizar
    if existing:
        await db.user_subscriptions.update_one(
            {"user_id": user_id},
            {"$set": subscription.model_dump()}
        )
    else:
        await db.user_subscriptions.insert_one(subscription.model_dump())
    
    # Atualizar onboarding do usuário - avançar para etapa "acolhimento"
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"current_stage": "acolhimento"}}
    )
    
    return SubscriptionResponse(
        success=True,
        message="Assinatura criada com sucesso! Você agora tem acesso total à plataforma.",
        subscription=subscription.model_dump(),
        pagbank_subscription_id=result.get("subscription_id")
    )


@router.get("/my-subscription")
async def get_my_subscription(current_user: dict = Depends(get_current_user)):
    """Obtém a assinatura do usuário atual"""
    user_id = current_user["sub"]
    
    status_info = await check_user_subscription_status(user_id)
    
    return SubscriptionStatusResponse(**status_info)


@router.get("/my-payments")
async def get_my_payments(current_user: dict = Depends(get_current_user)):
    """Obtém o histórico de pagamentos do usuário"""
    user_id = current_user["sub"]
    
    # Buscar pagamentos do usuário
    payments = await db.subscription_payments.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("billing_date", -1).limit(12).to_list(12)  # Últimos 12 meses
    
    return payments


@router.post("/my-subscription/sync-status")
async def sync_my_subscription_status(current_user: dict = Depends(get_current_user)):
    """
    Sincroniza o status da assinatura com o PagBank
    Consulta a API do PagBank e atualiza o status local
    """
    user_id = current_user["sub"]
    
    # Buscar assinatura local
    subscription = await db.user_subscriptions.find_one({"user_id": user_id})
    if not subscription:
        return {
            "success": False,
            "has_subscription": False,
            "message": "Nenhuma assinatura encontrada"
        }
    
    pagbank_subscription_id = subscription.get("pagbank_subscription_id")
    if not pagbank_subscription_id:
        return {
            "success": False,
            "has_subscription": True,
            "status": subscription.get("status"),
            "message": "Assinatura sem ID do PagBank"
        }
    
    # Consultar status no PagBank
    service = await get_pagbank_subscription_service()
    result = await service.get_subscription(pagbank_subscription_id)
    
    if not result.get("success"):
        logger.warning(f"[Subscription] Erro ao consultar PagBank: {result.get('error')}")
        # Retornar status local mesmo sem conseguir consultar
        return {
            "success": False,
            "has_subscription": True,
            "status": subscription.get("status"),
            "subscription": {
                "status": subscription.get("status"),
                "plan_name": subscription.get("plan_name", "Mensalidade"),
                "monthly_amount": subscription.get("monthly_amount"),
                "next_billing_date": subscription.get("next_billing_date"),
                "card_last_digits": subscription.get("card_last_digits"),
                "card_brand": subscription.get("card_brand")
            },
            "message": f"Não foi possível consultar PagBank: {result.get('error')}"
        }
    
    # Mapear status do PagBank para status local
    pagbank_status = result.get("status")
    status_mapping = {
        "ACTIVE": SubscriptionStatus.ACTIVE,
        "PENDING": SubscriptionStatus.PENDING,
        "SUSPENDED": SubscriptionStatus.SUSPENDED,
        "OVERDUE": SubscriptionStatus.OVERDUE,
        "CANCELED": SubscriptionStatus.CANCELLED,
        "TRIAL": SubscriptionStatus.TRIAL
    }
    
    new_status = status_mapping.get(pagbank_status, subscription.get("status"))
    
    # Atualizar no banco local se mudou
    update_data = {
        "status": new_status,
        "pagbank_status": pagbank_status,
        "next_billing_date": result.get("next_invoice_at"),
        "synced_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Atualizar info do cartão se disponível
    card_info = result.get("card_info", {})
    if card_info.get("last_digits"):
        update_data["card_last_digits"] = card_info["last_digits"]
    if card_info.get("brand"):
        update_data["card_brand"] = card_info["brand"]
    
    await db.user_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    logger.info(f"[Subscription] Status sincronizado: user={user_id}, status={pagbank_status}")
    
    return {
        "success": True,
        "has_subscription": True,
        "status": new_status,
        "pagbank_status": pagbank_status,
        "subscription": {
            "status": new_status,
            "pagbank_status": pagbank_status,
            "plan_name": result.get("plan_name", "Mensalidade"),
            "monthly_amount": subscription.get("monthly_amount"),
            "next_billing_date": result.get("next_invoice_at"),
            "card_last_digits": card_info.get("last_digits") or subscription.get("card_last_digits"),
            "card_brand": card_info.get("brand") or subscription.get("card_brand"),
            "created_at": subscription.get("created_at"),
            "synced_at": update_data["synced_at"]
        },
        "message": "Status sincronizado com sucesso"
    }


@router.get("/my-subscription/check")
async def check_my_subscription(current_user: dict = Depends(get_current_user)):
    """
    Verifica se o usuário tem assinatura ativa
    Retorna status e informações da assinatura
    """
    user_id = current_user["sub"]
    
    # Buscar assinatura local
    subscription = await db.user_subscriptions.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    if not subscription:
        return {
            "has_subscription": False,
            "is_active": False,
            "status": None,
            "subscription": None
        }
    
    status = subscription.get("status")
    is_active = status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]
    
    return {
        "has_subscription": True,
        "is_active": is_active,
        "status": status,
        "subscription": {
            "status": status,
            "pagbank_status": subscription.get("pagbank_status"),
            "plan_id": subscription.get("plan_id"),
            "monthly_amount": subscription.get("monthly_amount"),
            "next_billing_date": subscription.get("next_billing_date"),
            "started_at": subscription.get("started_at"),
            "card_last_digits": subscription.get("card_last_digits"),
            "card_brand": subscription.get("card_brand"),
            "synced_at": subscription.get("synced_at")
        }
    }


@router.put("/my-subscription/payment-method")
async def update_my_payment_method(
    update_request: UpdatePaymentMethodRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Atualiza o método de pagamento da assinatura
    
    NOTA: A API do PagBank não permite atualizar cartão diretamente.
    É necessário criar uma nova assinatura ou usar o portal do cliente.
    Este endpoint está preparado para quando a funcionalidade estiver disponível.
    """
    user_id = current_user["sub"]
    
    # Buscar assinatura
    subscription = await db.user_subscriptions.find_one({"user_id": user_id})
    if not subscription:
        raise HTTPException(status_code=404, detail="Assinatura não encontrada")
    
    if subscription["status"] == SubscriptionStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Assinatura cancelada")
    
    # Por enquanto, apenas salvamos localmente
    # A atualização real deve ser feita através do portal do cliente do PagBank
    await db.user_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Para atualizar seu cartão, entre em contato com o suporte",
        "note": "A API do PagBank atualmente requer que a atualização de cartão seja feita através do portal do cliente"
    }


@router.post("/sync-from-pagbank")
async def sync_subscriptions_from_pagbank(current_user: dict = Depends(get_current_user)):
    """
    Sincroniza assinaturas existentes no PagBank para o banco local
    Útil quando a assinatura foi criada mas não salvou localmente
    """
    user_id = current_user["sub"]
    user_email = current_user.get("email", "")
    
    service = await get_pagbank_subscription_service()
    
    # Listar todas as assinaturas do PagBank
    result = await service.list_subscriptions()
    
    if not result.get("success"):
        logger.warning(f"[Sync] Erro ao listar assinaturas: {result.get('error')}")
        raise HTTPException(status_code=400, detail=result.get("error", "Erro ao buscar assinaturas"))
    
    pagbank_subscriptions = result.get("subscriptions", [])
    found_subscription = None
    
    # Procurar assinatura do usuário
    for sub in pagbank_subscriptions:
        reference_id = sub.get("reference_id", "")
        customer_email = sub.get("customer", {}).get("email", "")
        
        # Verificar se pertence ao usuário (por reference_id ou email)
        if user_id in reference_id or customer_email.lower() == user_email.lower():
            found_subscription = sub
            logger.info(f"[Sync] Assinatura encontrada para user {user_id}: {sub.get('id')}")
            break
    
    if not found_subscription:
        return {
            "success": False,
            "message": "Nenhuma assinatura encontrada no PagBank para este usuário",
            "has_subscription": False
        }
    
    # Mapear status
    pagbank_status = found_subscription.get("status")
    status_mapping = {
        "ACTIVE": SubscriptionStatus.ACTIVE,
        "PENDING": SubscriptionStatus.PENDING,
        "SUSPENDED": SubscriptionStatus.SUSPENDED,
        "OVERDUE": SubscriptionStatus.OVERDUE,
        "CANCELED": SubscriptionStatus.CANCELLED,
        "TRIAL": SubscriptionStatus.TRIAL
    }
    local_status = status_mapping.get(pagbank_status, SubscriptionStatus.PENDING)
    
    # Extrair info do cartão
    payment_methods = found_subscription.get("payment_method", [])
    card_info = {}
    if payment_methods:
        card = payment_methods[0].get("card", {})
        card_info = {
            "card_last_digits": card.get("last_digits"),
            "card_brand": card.get("brand")
        }
    
    # Buscar plano
    plan_data = found_subscription.get("plan", {})
    plan_id = plan_data.get("id")
    plan_name = plan_data.get("name", "Mensalidade")
    
    # Buscar valor do plano no banco local
    local_plan = await db.subscription_plans.find_one({"pagbank_plan_id": plan_id})
    monthly_amount = local_plan.get("amount", 49.90) if local_plan else 49.90
    
    # Criar ou atualizar assinatura local
    subscription_data = {
        "user_id": user_id,
        "user_email": user_email,
        "user_name": current_user.get("full_name", ""),
        "plan_id": local_plan.get("id") if local_plan else None,
        "monthly_amount": monthly_amount,
        "pagbank_subscription_id": found_subscription.get("id"),
        "pagbank_status": pagbank_status,
        "status": local_status,
        "started_at": found_subscription.get("created_at"),
        "next_billing_date": found_subscription.get("next_invoice_at"),
        "card_last_digits": card_info.get("card_last_digits"),
        "card_brand": card_info.get("card_brand"),
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Verificar se já existe
    existing = await db.user_subscriptions.find_one({"user_id": user_id})
    
    if existing:
        await db.user_subscriptions.update_one(
            {"user_id": user_id},
            {"$set": subscription_data}
        )
        logger.info(f"[Sync] Assinatura atualizada para user {user_id}")
    else:
        await db.user_subscriptions.insert_one(subscription_data)
        logger.info(f"[Sync] Assinatura criada para user {user_id}")
    
    return {
        "success": True,
        "message": "Assinatura sincronizada com sucesso!",
        "has_subscription": True,
        "subscription": {
            "status": local_status,
            "pagbank_status": pagbank_status,
            "pagbank_subscription_id": found_subscription.get("id"),
            "plan_name": plan_name,
            "monthly_amount": monthly_amount,
            "next_billing_date": found_subscription.get("next_invoice_at"),
            "card_last_digits": card_info.get("card_last_digits"),
            "card_brand": card_info.get("card_brand")
        }
    }


# ==================== WEBHOOKS ====================

@router.post("/webhooks/pagbank")
async def pagbank_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Recebe notificações do PagBank sobre pagamentos de assinaturas
    """
    try:
        payload = await request.json()
        
        # Salvar webhook recebido
        webhook_event = SubscriptionWebhookEvent(
            event_type=payload.get("event_type", "unknown"),
            pagbank_subscription_id=payload.get("subscription_id"),
            pagbank_charge_id=payload.get("charge_id"),
            status=payload.get("status"),
            raw_payload=payload
        )
        
        await db.subscription_webhook_events.insert_one(webhook_event.model_dump())
        
        # Processar evento em background
        background_tasks.add_task(process_subscription_webhook, webhook_event.model_dump())
        
        return {"received": True}
        
    except Exception as e:
        logger.error(f"Erro ao processar webhook: {e}")
        return {"received": False, "error": str(e)}


async def process_subscription_webhook(webhook_event: dict):
    """Processa evento de webhook em background"""
    try:
        event_type = webhook_event.get("event_type")
        payload = webhook_event.get("raw_payload", {})
        subscription_id = webhook_event.get("pagbank_subscription_id")
        
        # Buscar assinatura
        subscription = await db.user_subscriptions.find_one({
            "pagbank_subscription_id": subscription_id
        })
        
        if not subscription:
            logger.warning(f"Assinatura não encontrada: {subscription_id}")
            return
        
        user_id = subscription["user_id"]
        
        # Processar eventos
        if event_type == "subscription.charged":
            # Pagamento realizado com sucesso
            await db.user_subscriptions.update_one(
                {"user_id": user_id},
                {"$set": {
                    "status": SubscriptionStatus.ACTIVE,
                    "last_payment_date": datetime.now(timezone.utc).isoformat(),
                    "failed_payments_count": 0,
                    "overdue_months": 0,
                    "payment_failed_email_sent": False,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.info(f"Pagamento confirmado para usuário {user_id}")
            
        elif event_type == "subscription.payment_failed":
            # Falha no pagamento
            failed_count = subscription.get("failed_payments_count", 0) + 1
            overdue_months = subscription.get("overdue_months", 0) + 1
            
            settings = await get_subscription_settings()
            suspend_threshold = settings.get("suspend_after_months", 2)
            
            # Determinar novo status
            if overdue_months >= suspend_threshold:
                new_status = SubscriptionStatus.SUSPENDED
            else:
                new_status = SubscriptionStatus.OVERDUE
            
            await db.user_subscriptions.update_one(
                {"user_id": user_id},
                {"$set": {
                    "status": new_status,
                    "failed_payments_count": failed_count,
                    "overdue_months": overdue_months,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Enviar emails
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            
            if new_status == SubscriptionStatus.OVERDUE and not subscription.get("payment_failed_email_sent"):
                await send_payment_failed_email(user, subscription)
                await db.user_subscriptions.update_one(
                    {"user_id": user_id},
                    {"$set": {"payment_failed_email_sent": True}}
                )
            elif new_status == SubscriptionStatus.SUSPENDED and not subscription.get("suspension_email_sent"):
                await send_suspension_email(user)
                await db.user_subscriptions.update_one(
                    {"user_id": user_id},
                    {"$set": {"suspension_email_sent": True, "suspended_at": datetime.now(timezone.utc).isoformat()}}
                )
            
            logger.warning(f"Falha de pagamento para usuário {user_id}, status={new_status}")
        
        # Marcar webhook como processado
        await db.subscription_webhook_events.update_one(
            {"id": webhook_event["id"]},
            {"$set": {
                "processed": True,
                "processed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
    except Exception as e:
        logger.error(f"Erro ao processar webhook: {e}")
        await db.subscription_webhook_events.update_one(
            {"id": webhook_event["id"]},
            {"$set": {"processing_error": str(e)}}
        )


# ==================== ADMIN - GESTÃO ====================

@router.get("/all")
async def list_all_subscriptions(
    status: Optional[str] = None,
    current_user: dict = Depends(require_role(["admin", "supervisor"]))
):
    """Lista todas as assinaturas (Admin/Supervisor)"""
    query = {}
    if status:
        query["status"] = status
    
    subscriptions = await db.user_subscriptions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return subscriptions


@router.get("/stats")
async def get_subscription_stats(current_user: dict = Depends(get_current_user)):
    """Estatísticas de assinaturas (Admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    total = await db.user_subscriptions.count_documents({})
    active = await db.user_subscriptions.count_documents({"status": SubscriptionStatus.ACTIVE})
    overdue = await db.user_subscriptions.count_documents({"status": SubscriptionStatus.OVERDUE})
    suspended = await db.user_subscriptions.count_documents({"status": SubscriptionStatus.SUSPENDED})
    
    settings = await get_subscription_settings()
    monthly_fee = settings.get("monthly_fee", 0)
    
    # Receita mensal estimada (assinaturas ativas)
    monthly_revenue = active * monthly_fee
    
    return {
        "total_subscriptions": total,
        "active_subscriptions": active,
        "overdue_subscriptions": overdue,
        "suspended_subscriptions": suspended,
        "monthly_fee": monthly_fee,
        "estimated_monthly_revenue": monthly_revenue
    }
