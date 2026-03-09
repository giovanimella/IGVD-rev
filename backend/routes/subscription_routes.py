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
    next_billing_date = subscription.get("next_billing_date")
    
    # Verificar se está dentro do período pago (mesmo se SUSPENDED/OVERDUE)
    is_within_paid_period = False
    if next_billing_date:
        try:
            # Converter para datetime se for string
            if isinstance(next_billing_date, str):
                from datetime import datetime
                next_billing = datetime.fromisoformat(next_billing_date.replace('Z', '+00:00'))
            else:
                next_billing = next_billing_date
            
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            is_within_paid_period = next_billing > now
        except Exception as e:
            logger.warning(f"Erro ao verificar data de cobrança: {e}")
    
    # Lógica de bloqueio atualizada:
    # - SUSPENDED/OVERDUE: bloqueado APENAS após a data de próxima cobrança
    # - CANCELLED: sempre bloqueado
    # - ACTIVE/TRIAL: nunca bloqueado
    
    if status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]:
        has_active = True
        is_blocked = False
    elif status in [SubscriptionStatus.SUSPENDED, SubscriptionStatus.OVERDUE]:
        # Se ainda está dentro do período pago, permitir acesso
        has_active = is_within_paid_period
        is_blocked = not is_within_paid_period
    elif status == SubscriptionStatus.CANCELLED:
        has_active = False
        is_blocked = True
    else:
        # Status desconhecido ou PENDING
        has_active = status == SubscriptionStatus.PENDING
        is_blocked = not has_active
    
    return {
        "has_active_subscription": has_active,
        "is_blocked": is_blocked,
        "status": status,
        "overdue_months": subscription.get("overdue_months", 0),
        "next_billing_date": subscription.get("next_billing_date"),
        "monthly_amount": subscription.get("monthly_amount"),
        "is_within_paid_period": is_within_paid_period,
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
        if len(token) > 20 and "*" not in token:
            settings["pagbank_token"] = token[:10] + "*" * (len(token) - 20) + token[-10:]
    
    # Mascarar email (mostrar parcialmente)
    if settings.get("pagbank_email"):
        email = settings["pagbank_email"]
        if "@" in email:
            parts = email.split("@")
            if len(parts[0]) > 3:
                settings["pagbank_email"] = parts[0][:3] + "***@" + parts[1]
    
    # Mascarar chave pública se existir
    if settings.get("pagbank_public_key"):
        key = settings["pagbank_public_key"]
        if len(key) > 40 and "..." not in key:
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


# Alias para compatibilidade com frontend
@router.get("/pagbank-public-key")
async def get_pagbank_public_key():
    """
    Alias para /public-key - compatibilidade com frontend
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
    request: Request,
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
        # Buscar plano ativo padrão (is_default=True)
        plan = await db.subscription_plans.find_one(
            {"is_active": True, "is_default": True}, 
            {"_id": 0}
        )
        
        # Se não houver plano marcado como padrão, pegar qualquer plano ativo
        if not plan:
            plan = await db.subscription_plans.find_one({"is_active": True}, {"_id": 0})
            logger.warning(f"[Subscription] Nenhum plano padrão definido, usando primeiro plano ativo")
    
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
    
    # Limpar CPF
    cpf_clean = ''.join(filter(str.isdigit, subscription_request.customer_cpf))
    
    # =========================================================================
    # LÓGICA CORRIGIDA DE CUSTOMER:
    # 
    # 1. Se o USUÁRIO ATUAL já tem pagbank_customer_id salvo no NOSSO banco:
    #    -> Usar esse customer_id (pertence a ele)
    #    -> Atualizar billing_info com o novo cartão
    #
    # 2. Se o usuário NÃO tem pagbank_customer_id:
    #    -> Criar um NOVO customer no PagBank com os dados fornecidos
    #    -> Se der erro de CPF duplicado, significa que o CPF já está em uso
    #       por outro customer (possivelmente de outro usuário ou teste anterior)
    #
    # IMPORTANTE: NÃO reutilizar customer de outro usuário apenas por ter o mesmo CPF!
    # =========================================================================
    
    pagbank_customer_id = None
    
    # Verificar se o usuário atual já tem um customer_id associado no nosso banco
    if existing and existing.get("pagbank_customer_id"):
        pagbank_customer_id = existing.get("pagbank_customer_id")
        logger.info(f"[Subscription] Usuário já tem customer_id associado: {pagbank_customer_id}")
        
        # Atualizar billing_info com o novo cartão (não atualizar dados cadastrais!)
        logger.info(f"[Subscription] Atualizando apenas billing_info do customer...")
        update_result = await service.update_customer_billing_info(
            customer_id=pagbank_customer_id,
            encrypted_card=subscription_request.encrypted_card,
            security_code=subscription_request.security_code
        )
        
        if not update_result.get("success"):
            error_msg = update_result.get("error", "Erro ao atualizar cartão")
            logger.warning(f"[Subscription] Aviso: {error_msg} - Continuando com cartão existente...")
        else:
            logger.info(f"[Subscription] Billing_info atualizado com sucesso!")
        
        # Usar apenas o ID do customer
        customer_data = {
            "id": pagbank_customer_id
        }
    else:
        # Usuário não tem customer_id - criar novo customer com todos os dados
        logger.info(f"[Subscription] Criando NOVO customer para o usuário...")
        customer_data = {
            "name": subscription_request.customer_name[:150],
            "email": subscription_request.customer_email,
            "tax_id": cpf_clean,
            "phones": [{
                "country": "55",
                "area": area_code,
                "number": phone_number,
                "type": "MOBILE"
            }],
            "billing_info": [{
                "type": "CREDIT_CARD",
                "card": {
                    "encrypted": subscription_request.encrypted_card
                }
            }]
        }
        logger.info(f"[Subscription] Customer data preparado para CPF: {cpf_clean}")
    
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
        
        # Verificar se é erro de CPF duplicado
        if "tax_id" in error_msg.lower() or "tax_ID" in str(error_detail):
            raise HTTPException(
                status_code=400, 
                detail="Este CPF já está cadastrado no PagBank. Se você já teve uma assinatura anterior, entre em contato com o suporte."
            )
        
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Criar registro de assinatura
    # Buscar nome do usuário no banco (token JWT não contém full_name)
    user_data = await db.users.find_one({"id": user_id}, {"full_name": 1})
    user_full_name = user_data.get("full_name", current_user.get("email", "")) if user_data else current_user.get("email", "")
    
    subscription = UserSubscription(
        user_id=user_id,
        user_email=current_user["email"],
        user_name=user_full_name,
        plan_id=plan["id"],
        monthly_amount=plan["amount"],
        pagbank_subscription_id=result.get("subscription_id"),
        pagbank_subscription_code=result.get("subscription_code"),
        pagbank_customer_id=result.get("customer_id") or pagbank_customer_id,  # Salvar customer_id para reutilizar depois
        status=SubscriptionStatus.ACTIVE if result.get("status") == "ACTIVE" else SubscriptionStatus.PENDING,
        started_at=datetime.now(timezone.utc).isoformat(),
        next_billing_date=result.get("next_billing_date"),
        card_last_digits=result.get("card_last_digits"),
        card_brand=result.get("card_brand")
    )
    
    logger.info(f"[Subscription] Customer ID salvo: {subscription.pagbank_customer_id}")
    
    # Salvar ou atualizar
    if existing:
        await db.user_subscriptions.update_one(
            {"user_id": user_id},
            {"$set": subscription.model_dump()}
        )
    else:
        await db.user_subscriptions.insert_one(subscription.model_dump())
    
    # Registrar aceite dos termos (se houver)
    if subscription_request.terms_accepted and subscription_request.terms_id:
        try:
            # Obter IP do cliente
            client_ip = request.client.host if request.client else "N/A"
            # Verificar headers de proxy (X-Forwarded-For, X-Real-IP)
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                client_ip = forwarded_for.split(",")[0].strip()
            else:
                real_ip = request.headers.get("X-Real-IP")
                if real_ip:
                    client_ip = real_ip
            
            terms_acceptance = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "user_email": current_user["email"],
                "term_id": subscription_request.terms_id,
                "accepted_at": datetime.now(timezone.utc).isoformat(),
                "ip_address": client_ip,
                "accepted_via": "subscription_onboarding",
                "subscription_id": subscription.id
            }
            await db.terms_acceptances.insert_one(terms_acceptance)
            
            # Atualizar usuário com flag de termos aceitos
            await db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "terms_accepted": True,
                    "terms_accepted_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"[Subscription] Termos aceitos registrados para user={user_id}, IP={client_ip}")
        except Exception as e:
            logger.warning(f"[Subscription] Erro ao registrar aceite dos termos: {e}")
    
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
        "CANCELLED": SubscriptionStatus.CANCELLED,  # Variação do PagBank
        "TRIAL": SubscriptionStatus.TRIAL
    }
    
    new_status = status_mapping.get(pagbank_status, subscription.get("status"))
    
    logger.info(f"[Subscription] Sincronização: PagBank status={pagbank_status}, mapeado para={new_status}")
    
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


# ==================== CANCELAMENTO DE ASSINATURA ====================

@router.post("/my-subscription/cancel")
async def cancel_my_subscription(current_user: dict = Depends(get_current_user)):
    """
    Suspende a assinatura do usuário logado (não cancela definitivamente)
    O usuário pode suspender sua assinatura e reativá-la depois a qualquer momento
    
    IMPORTANTE: Usa SUSPEND (não CANCEL) para permitir reativação futura
    """
    user_id = current_user["sub"]
    
    # Buscar assinatura local
    subscription = await db.user_subscriptions.find_one({"user_id": user_id})
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Nenhuma assinatura encontrada")
    
    current_status = subscription.get("status")
    if current_status == SubscriptionStatus.SUSPENDED:
        raise HTTPException(status_code=400, detail="Assinatura já está suspensa")
    
    if current_status == SubscriptionStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Assinatura já está cancelada. Entre em contato com o suporte para reativar.")
    
    pagbank_subscription_id = subscription.get("pagbank_subscription_id")
    
    if not pagbank_subscription_id:
        # Se não tem ID do PagBank, apenas atualiza localmente
        await db.user_subscriptions.update_one(
            {"user_id": user_id},
            {"$set": {
                "status": SubscriptionStatus.SUSPENDED,
                "suspended_at": datetime.now(timezone.utc).isoformat(),
                "suspended_by": "user"
            }}
        )
        logger.info(f"[Subscription] Assinatura suspensa localmente: user={user_id}")
        return {
            "success": True,
            "message": "Assinatura suspensa localmente"
        }
    
    # SUSPENDER no PagBank (não cancelar!)
    service = await get_pagbank_subscription_service()
    result = await service.suspend_subscription(pagbank_subscription_id)
    
    if not result.get("success"):
        logger.error(f"[Subscription] Erro ao suspender no PagBank: {result.get('error')}")
        # Mesmo com erro no PagBank, suspender localmente
        await db.user_subscriptions.update_one(
            {"user_id": user_id},
            {"$set": {
                "status": SubscriptionStatus.SUSPENDED,
                "suspended_at": datetime.now(timezone.utc).isoformat(),
                "suspended_by": "user",
                "suspend_error": result.get("error")
            }}
        )
        return {
            "success": True,
            "message": "Assinatura suspensa localmente (erro ao suspender no PagBank)",
            "pagbank_error": result.get("error")
        }
    
    # Atualizar no banco local
    await db.user_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {
            "status": SubscriptionStatus.SUSPENDED,
            "pagbank_status": "SUSPENDED",
            "suspended_at": datetime.now(timezone.utc).isoformat(),
            "suspended_by": "user"
        }}
    )
    
    logger.info(f"[Subscription] Assinatura SUSPENSA no PagBank: user={user_id}, pagbank_id={pagbank_subscription_id}")
    
    # Buscar data de próxima cobrança para informar ao usuário
    next_billing_date = subscription.get("next_billing_date")
    access_until_msg = ""
    if next_billing_date:
        try:
            if isinstance(next_billing_date, str):
                from datetime import datetime
                next_billing = datetime.fromisoformat(next_billing_date.replace('Z', '+00:00'))
                access_until_msg = f" Você terá acesso até {next_billing.strftime('%d/%m/%Y')}."
        except:
            pass
    
    return {
        "success": True,
        "message": f"Assinatura suspensa com sucesso.{access_until_msg} Você pode reativá-la a qualquer momento.",
        "next_billing_date": next_billing_date
    }


@router.post("/admin/cancel-subscription/{user_id}")
async def admin_cancel_subscription(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Suspende a assinatura de um usuário específico (somente admin)
    Usa SUSPEND para permitir reativação futura
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Buscar assinatura do usuário
    subscription = await db.user_subscriptions.find_one({"user_id": user_id})
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Nenhuma assinatura encontrada para este usuário")
    
    current_status = subscription.get("status")
    if current_status == SubscriptionStatus.SUSPENDED:
        raise HTTPException(status_code=400, detail="Assinatura já está suspensa")
    
    pagbank_subscription_id = subscription.get("pagbank_subscription_id")
    
    if pagbank_subscription_id:
        # SUSPENDER no PagBank (não cancelar!)
        service = await get_pagbank_subscription_service()
        result = await service.suspend_subscription(pagbank_subscription_id)
        
        if not result.get("success"):
            logger.warning(f"[Admin] Erro ao suspender no PagBank: {result.get('error')}")
    
    # Atualizar no banco local
    await db.user_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {
            "status": SubscriptionStatus.SUSPENDED,
            "pagbank_status": "SUSPENDED",
            "suspended_at": datetime.now(timezone.utc).isoformat(),
            "suspended_by": f"admin:{current_user['sub']}"
        }}
    )
    
    logger.info(f"[Admin] Assinatura SUSPENSA pelo admin: user={user_id}, admin={current_user['sub']}")
    
    return {
        "success": True,
        "message": "Assinatura do usuário suspensa com sucesso",
        "user_id": user_id
    }



@router.post("/my-subscription/reactivate")
async def reactivate_my_subscription(current_user: dict = Depends(get_current_user)):
    """
    Reativa uma assinatura suspensa do usuário logado
    Permite que o usuário reative sua própria assinatura no PagBank
    """
    user_id = current_user["sub"]
    
    # Buscar assinatura
    subscription = await db.user_subscriptions.find_one({"user_id": user_id})
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Nenhuma assinatura encontrada")
    
    current_status = subscription.get("status")
    
    if current_status == SubscriptionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Assinatura já está ativa")
    
    if current_status not in [SubscriptionStatus.SUSPENDED, SubscriptionStatus.CANCELLED]:
        raise HTTPException(
            status_code=400, 
            detail=f"Assinatura não pode ser reativada no estado atual: {current_status}"
        )
    
    pagbank_subscription_id = subscription.get("pagbank_subscription_id")
    
    if not pagbank_subscription_id:
        # Se não tem ID do PagBank, apenas atualiza localmente
        await db.user_subscriptions.update_one(
            {"user_id": user_id},
            {"$set": {
                "status": SubscriptionStatus.ACTIVE,
                "reactivated_at": datetime.now(timezone.utc).isoformat(),
                "reactivated_by": "user",
                "suspended_at": None,
                "suspended_by": None,
                "cancelled_at": None,
                "cancelled_by": None
            }}
        )
        logger.info(f"[Subscription] Assinatura reativada localmente: user={user_id}")
        return {
            "success": True,
            "message": "Assinatura reativada localmente"
        }
    
    # ATIVAR no PagBank
    service = await get_pagbank_subscription_service()
    result = await service.activate_subscription(pagbank_subscription_id)
    
    if not result.get("success"):
        logger.error(f"[Subscription] Erro ao ativar no PagBank: {result.get('error')}")
        
        # Se o erro for porque já está ativa, considerar sucesso
        error_msg = result.get("error", "").lower()
        if "already active" in error_msg or "já ativa" in error_msg:
            await db.user_subscriptions.update_one(
                {"user_id": user_id},
                {"$set": {
                    "status": SubscriptionStatus.ACTIVE,
                    "pagbank_status": "ACTIVE",
                    "reactivated_at": datetime.now(timezone.utc).isoformat(),
                    "reactivated_by": "user",
                    "suspended_at": None,
                    "suspended_by": None
                }}
            )
            return {
                "success": True,
                "message": "Assinatura já está ativa no PagBank"
            }
        
        # Tentar reativar localmente mesmo com erro
        await db.user_subscriptions.update_one(
            {"user_id": user_id},
            {"$set": {
                "status": SubscriptionStatus.ACTIVE,
                "reactivated_at": datetime.now(timezone.utc).isoformat(),
                "reactivated_by": "user",
                "reactivate_error": result.get("error"),
                "suspended_at": None,
                "suspended_by": None
            }}
        )
        
        return {
            "success": True,
            "message": "Assinatura reativada localmente. Por favor, sincronize com o PagBank.",
            "pagbank_error": result.get("error"),
            "warning": "Houve um erro ao comunicar com o PagBank. Use o botão 'Sincronizar Status' para verificar."
        }
    
    # Atualizar no banco local
    await db.user_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {
            "status": SubscriptionStatus.ACTIVE,
            "pagbank_status": "ACTIVE",
            "reactivated_at": datetime.now(timezone.utc).isoformat(),
            "reactivated_by": "user",
            "suspended_at": None,
            "suspended_by": None,
            "cancelled_at": None,
            "cancelled_by": None,
            "overdue_months": 0,
            "failed_payments_count": 0
        }}
    )
    
    logger.info(f"[Subscription] Assinatura ATIVADA no PagBank: user={user_id}, pagbank_id={pagbank_subscription_id}")
    
    return {
        "success": True,
        "message": "Assinatura reativada com sucesso! Você pode continuar acessando a plataforma."
    }


@router.post("/admin/reactivate-subscription/{user_id}")
async def admin_reactivate_subscription(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Reativa a assinatura de um usuário específico (somente admin)
    Chama o endpoint ACTIVATE do PagBank para reativar de verdade
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Buscar assinatura
    subscription = await db.user_subscriptions.find_one({"user_id": user_id})
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Nenhuma assinatura encontrada para este usuário")
    
    current_status = subscription.get("status")
    
    if current_status == SubscriptionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Assinatura já está ativa")
    
    if current_status not in [SubscriptionStatus.CANCELLED, SubscriptionStatus.SUSPENDED]:
        raise HTTPException(
            status_code=400, 
            detail=f"Assinatura não pode ser reativada no estado atual: {current_status}"
        )
    
    pagbank_subscription_id = subscription.get("pagbank_subscription_id")
    
    if not pagbank_subscription_id:
        # Se não tem ID do PagBank, apenas atualiza localmente
        await db.user_subscriptions.update_one(
            {"user_id": user_id},
            {"$set": {
                "status": SubscriptionStatus.ACTIVE,
                "reactivated_at": datetime.now(timezone.utc).isoformat(),
                "reactivated_by": f"admin:{current_user['sub']}",
                "cancelled_at": None,
                "cancelled_by": None,
                "suspended_at": None,
                "suspended_by": None,
                "overdue_months": 0,
                "failed_payments_count": 0
            }}
        )
        logger.info(f"[Admin] Assinatura reativada localmente: user={user_id}")
        return {
            "success": True,
            "message": "Assinatura reativada localmente",
            "user_id": user_id
        }
    
    # ATIVAR no PagBank
    service = await get_pagbank_subscription_service()
    result = await service.activate_subscription(pagbank_subscription_id)
    
    if not result.get("success"):
        logger.error(f"[Admin] Erro ao ativar no PagBank: {result.get('error')}")
        
        # Verificar se já está ativa
        error_msg = result.get("error", "").lower()
        if "already active" in error_msg or "já ativa" in error_msg:
            await db.user_subscriptions.update_one(
                {"user_id": user_id},
                {"$set": {
                    "status": SubscriptionStatus.ACTIVE,
                    "pagbank_status": "ACTIVE",
                    "reactivated_at": datetime.now(timezone.utc).isoformat(),
                    "reactivated_by": f"admin:{current_user['sub']}",
                    "suspended_at": None,
                    "suspended_by": None,
                    "cancelled_at": None,
                    "cancelled_by": None,
                    "overdue_months": 0,
                    "failed_payments_count": 0
                }}
            )
            return {
                "success": True,
                "message": "Assinatura já está ativa no PagBank",
                "user_id": user_id
            }
        
        raise HTTPException(
            status_code=400,
            detail=f"Erro ao reativar assinatura no PagBank: {result.get('error')}"
        )
    
    # Atualizar no banco local
    await db.user_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {
            "status": SubscriptionStatus.ACTIVE,
            "pagbank_status": "ACTIVE",
            "reactivated_at": datetime.now(timezone.utc).isoformat(),
            "reactivated_by": f"admin:{current_user['sub']}",
            "cancelled_at": None,
            "cancelled_by": None,
            "suspended_at": None,
            "suspended_by": None,
            "overdue_months": 0,
            "failed_payments_count": 0
        }}
    )
    
    logger.info(f"[Admin] Assinatura ATIVADA no PagBank: user={user_id}, admin={current_user['sub']}, pagbank_id={pagbank_subscription_id}")
    
    return {
        "success": True,
        "message": "Assinatura do usuário reativada com sucesso no PagBank",
        "user_id": user_id
    }


@router.post("/admin/cancel-subscription-permanently/{user_id}")
async def admin_cancel_subscription_permanently(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancela DEFINITIVAMENTE a assinatura de um usuário (somente admin)
    
    AVISO: Esta operação é IRREVERSÍVEL!
    A assinatura NÃO poderá ser reativada após cancelamento definitivo.
    Use o endpoint /admin/cancel-subscription/{user_id} para SUSPENDER (reversível).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Buscar assinatura do usuário
    subscription = await db.user_subscriptions.find_one({"user_id": user_id})
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Nenhuma assinatura encontrada para este usuário")
    
    if subscription.get("status") == SubscriptionStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Assinatura já está cancelada")
    
    pagbank_subscription_id = subscription.get("pagbank_subscription_id")
    
    if pagbank_subscription_id:
        # CANCELAR DEFINITIVAMENTE no PagBank
        service = await get_pagbank_subscription_service()
        result = await service.cancel_subscription(pagbank_subscription_id)
        
        if not result.get("success"):
            logger.warning(f"[Admin] Erro ao cancelar definitivamente no PagBank: {result.get('error')}")
    
    # Atualizar no banco local
    await db.user_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {
            "status": SubscriptionStatus.CANCELLED,
            "pagbank_status": "CANCELED",
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "cancelled_by": f"admin:{current_user['sub']}",
            "cancellation_type": "permanent"
        }}
    )
    
    logger.warning(f"[Admin] Assinatura CANCELADA DEFINITIVAMENTE: user={user_id}, admin={current_user['sub']}")
    
    return {
        "success": True,
        "message": "Assinatura do usuário cancelada DEFINITIVAMENTE (não pode ser reativada)",
        "user_id": user_id,
        "warning": "Esta operação é irreversível"
    }


# ==================== GERENCIAMENTO DE PLANOS ====================

@router.put("/plans/{plan_id}/inactivate")
async def inactivate_plan(
    plan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Inativa um plano no PagBank (somente admin)
    
    NOTA: No PagBank não é possível EXCLUIR um plano, apenas INATIVAR.
    Planos inativos não podem ser usados para novas assinaturas.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    service = await get_pagbank_subscription_service()
    result = await service.inactivate_plan(plan_id)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Erro ao inativar plano")
        )
    
    # Atualizar no banco local também
    await db.subscription_plans.update_one(
        {"pagbank_plan_id": plan_id},
        {"$set": {
            "is_active": False,
            "pagbank_status": "INACTIVE",
            "inactivated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Plano inativado com sucesso",
        "plan_id": plan_id
    }


@router.put("/plans/{plan_id}/activate")
async def activate_plan(
    plan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Ativa um plano no PagBank (somente admin)
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    service = await get_pagbank_subscription_service()
    result = await service.activate_plan(plan_id)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Erro ao ativar plano")
        )
    
    # Atualizar no banco local também
    await db.subscription_plans.update_one(
        {"pagbank_plan_id": plan_id},
        {"$set": {
            "is_active": True,
            "pagbank_status": "ACTIVE",
            "activated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Plano ativado com sucesso",
        "plan_id": plan_id
    }


@router.delete("/plans/{plan_id}")
async def delete_plan_local(
    plan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Remove um plano do banco local (somente admin)
    
    NOTA: Isso NÃO exclui o plano do PagBank (não é possível).
    Use o endpoint /inactivate para inativar o plano no PagBank.
    Este endpoint apenas remove o plano do banco local.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Verificar se existe
    plan = await db.subscription_plans.find_one({"pagbank_plan_id": plan_id})
    if not plan:
        plan = await db.subscription_plans.find_one({"id": plan_id})
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    
    # Verificar se há assinaturas usando este plano
    active_subs = await db.user_subscriptions.count_documents({
        "plan_id": plan.get("id"),
        "status": {"$in": [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]}
    })
    
    if active_subs > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível remover: {active_subs} assinatura(s) ativa(s) usando este plano"
        )
    
    # Remover do banco local
    await db.subscription_plans.delete_one({"_id": plan["_id"]})
    
    return {
        "success": True,
        "message": "Plano removido do banco local",
        "note": "O plano ainda existe no PagBank. Use /inactivate para inativá-lo lá."
    }


@router.put("/plans/{plan_id}/set-default")
async def set_default_plan(
    plan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Define um plano como padrão para novas assinaturas (somente admin)
    
    Quando um usuário cria assinatura sem especificar plan_id,
    este plano será usado automaticamente.
    
    Apenas 1 plano pode ser padrão por vez.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Buscar plano por pagbank_plan_id ou id local
    plan = await db.subscription_plans.find_one({"pagbank_plan_id": plan_id})
    if not plan:
        plan = await db.subscription_plans.find_one({"id": plan_id})
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    
    if not plan.get("is_active"):
        raise HTTPException(
            status_code=400,
            detail="Não é possível definir um plano inativo como padrão. Ative o plano primeiro."
        )
    
    # Remover is_default de TODOS os outros planos
    await db.subscription_plans.update_many(
        {},
        {"$set": {"is_default": False}}
    )
    
    # Marcar este plano como padrão
    await db.subscription_plans.update_one(
        {"id": plan["id"]},
        {"$set": {
            "is_default": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"[Admin] Plano definido como padrão: {plan['name']} (id={plan['id']})")
    
    return {
        "success": True,
        "message": f"Plano '{plan['name']}' definido como padrão para novas assinaturas",
        "plan_id": plan["id"],
        "plan_name": plan["name"]
    }




@router.put("/my-subscription/payment-method")
async def update_my_payment_method(
    update_request: UpdatePaymentMethodRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Atualiza o método de pagamento da assinatura no PagBank
    
    Endpoint PagBank: PUT /customers/{customer_id}/billing_info
    Permite atualizar cartão de crédito do assinante
    """
    user_id = current_user["sub"]
    
    # Buscar assinatura
    subscription = await db.user_subscriptions.find_one({"user_id": user_id})
    if not subscription:
        raise HTTPException(status_code=404, detail="Assinatura não encontrada")
    
    if subscription.get("status") == SubscriptionStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Não é possível atualizar cartão de assinatura cancelada")
    
    pagbank_customer_id = subscription.get("pagbank_customer_id")
    
    if not pagbank_customer_id:
        raise HTTPException(
            status_code=400, 
            detail="Assinatura sem customer_id do PagBank. Entre em contato com o suporte."
        )
    
    logger.info(f"[Subscription] Atualizando cartão: user={user_id}, customer={pagbank_customer_id}")
    
    # Atualizar no PagBank
    service = await get_pagbank_subscription_service()
    result = await service.update_customer_billing_info(
        customer_id=pagbank_customer_id,
        encrypted_card=update_request.encrypted_card,
        security_code=update_request.card_security_code
    )
    
    if not result.get("success"):
        error_msg = result.get("error", "Erro ao atualizar cartão")
        logger.error(f"[Subscription] Erro ao atualizar cartão: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Atualizar informações do cartão no banco local
    card_last_digits = result.get("card_last_digits")
    card_brand = result.get("card_brand")
    
    await db.user_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {
            "card_last_digits": card_last_digits,
            "card_brand": card_brand,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"[Subscription] Cartão atualizado com sucesso: user={user_id}, últimos dígitos={card_last_digits}")
    
    return {
        "success": True,
        "message": "Cartão atualizado com sucesso!",
        "card_last_digits": card_last_digits,
        "card_brand": card_brand
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
        "CANCELLED": SubscriptionStatus.CANCELLED,  # Variação do PagBank
        "TRIAL": SubscriptionStatus.TRIAL
    }
    local_status = status_mapping.get(pagbank_status, SubscriptionStatus.PENDING)
    
    logger.info(f"[Sync] PagBank status={pagbank_status}, mapeado para={local_status}")
    
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
    
    # Buscar nome do usuário no banco (token JWT pode não ter full_name)
    user_db = await db.users.find_one({"id": user_id}, {"full_name": 1})
    user_full_name = user_db.get("full_name", user_email) if user_db else user_email
    
    # Criar ou atualizar assinatura local
    subscription_data = {
        "user_id": user_id,
        "user_email": user_email,
        "user_name": user_full_name,
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
