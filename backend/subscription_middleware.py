"""
Middleware e dependências para verificação de status de assinatura
Bloqueia acesso para usuários inadimplentes
"""
from fastapi import Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
import os

from auth import get_current_user

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


async def check_subscription_access(current_user: dict = Depends(get_current_user)):
    """
    Verifica se o usuário tem acesso ao sistema (assinatura ativa)
    
    Bloqueia se:
    - Status = OVERDUE (atrasado)
    - Status = SUSPENDED (suspenso)
    - Status = CANCELLED (cancelado)
    
    Permite se:
    - Status = ACTIVE (ativo)
    - Status = TRIAL (período de teste)
    - Status = PENDING (aguardando primeiro pagamento - dá 5 dias de carência)
    - Não tem assinatura ainda (em onboarding)
    - É admin ou supervisor (sempre tem acesso)
    
    Uso:
        @router.get("/rota-protegida")
        async def minha_rota(user: dict = Depends(check_subscription_access)):
            ...
    """
    user_id = current_user["sub"]
    user_role = current_user.get("role")
    
    # Admin e supervisor sempre têm acesso
    if user_role in ["admin", "supervisor"]:
        return current_user
    
    # Buscar assinatura do usuário
    subscription = await db.user_subscriptions.find_one({"user_id": user_id})
    
    # Se não tem assinatura ainda (está no onboarding), permitir acesso
    if not subscription:
        return current_user
    
    status = subscription.get("status")
    
    # Status bloqueados
    blocked_statuses = ["overdue", "suspended", "cancelled"]
    
    if status in blocked_statuses:
        if status == "suspended":
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "account_suspended",
                    "message": "Sua conta está suspensa devido a inadimplência. Entre em contato conosco para regularizar.",
                    "contact_email": "contato@ozoxx.com.br",
                    "contact_phone": "(00) 0000-0000"
                }
            )
        else:  # overdue ou cancelled
            raise HTTPException(
                status_code=402,  # Payment Required
                detail={
                    "error": "payment_required",
                    "message": "Sua mensalidade está em atraso. Atualize seus dados de pagamento para continuar.",
                    "overdue_months": subscription.get("overdue_months", 1),
                    "monthly_amount": subscription.get("monthly_amount", 0)
                }
            )
    
    # Se chegou aqui, tem acesso
    return current_user


async def get_subscription_status(user_id: str) -> dict:
    """
    Obtém o status de assinatura de um usuário (helper function)
    
    Returns:
        dict com status, is_blocked, etc
    """
    subscription = await db.user_subscriptions.find_one({"user_id": user_id})
    
    if not subscription:
        return {
            "has_subscription": False,
            "is_blocked": False,
            "status": None,
            "in_onboarding": True
        }
    
    status = subscription.get("status")
    blocked_statuses = ["overdue", "suspended", "cancelled"]
    
    return {
        "has_subscription": True,
        "is_blocked": status in blocked_statuses,
        "status": status,
        "overdue_months": subscription.get("overdue_months", 0),
        "next_billing_date": subscription.get("next_billing_date"),
        "monthly_amount": subscription.get("monthly_amount"),
        "in_onboarding": False
    }
