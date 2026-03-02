"""
Rotas de configuração e processamento de pagamentos
Sistema de Gateway: PagSeguro
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from datetime import datetime
import logging
import json
import hashlib
import hmac

from auth import get_current_user
from models_payment import (
    PaymentSettings, PaymentSettingsUpdate, PaymentGateway, PaymentEnvironment,
    GatewayCredentials, PixPaymentRequest, CreditCardPaymentRequest,
    SplitPaymentRequest, Transaction, TransactionResponse, PaymentStatus,
    WebhookEvent, PaymentPurpose
)
from services.payment_gateway import payment_gateway

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


# ==================== CONFIGURAÇÕES (ADMIN) ====================

@router.get("/settings")
async def get_payment_settings(current_user: dict = Depends(get_current_user)):
    """Obtém as configurações de pagamento (somente admin)"""
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    settings = await payment_gateway.get_settings()
    
    # Mascarar credenciais sensíveis
    settings_dict = settings.model_dump()
    
    # Mascarar tokens/secrets
    def mask_credentials(creds: dict) -> dict:
        masked = {}
        for key, value in creds.items():
            if value and isinstance(value, str) and len(value) > 8:
                masked[key] = value[:4] + "*" * (len(value) - 8) + value[-4:]
            else:
                masked[key] = value
        return masked
    
    if settings_dict.get("sandbox_credentials"):
        settings_dict["sandbox_credentials"] = mask_credentials(settings_dict["sandbox_credentials"])
    if settings_dict.get("production_credentials"):
        settings_dict["production_credentials"] = mask_credentials(settings_dict["production_credentials"])
    
    return settings_dict


@router.put("/settings")
async def update_payment_settings(
    updates: PaymentSettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Atualiza as configurações de pagamento (somente admin)"""
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    update_dict = updates.model_dump(exclude_none=True)
    
    # Converter objetos aninhados para dicionários
    if "sandbox_credentials" in update_dict:
        update_dict["sandbox_credentials"] = update_dict["sandbox_credentials"]
    if "production_credentials" in update_dict:
        update_dict["production_credentials"] = update_dict["production_credentials"]
    
    settings = await payment_gateway.update_settings(update_dict)
    
    return {"message": "Configurações atualizadas com sucesso", "settings": settings.model_dump()}


@router.post("/settings/credentials")
async def update_credentials(
    gateway: PaymentGateway,
    environment: PaymentEnvironment,
    credentials: GatewayCredentials,
    current_user: dict = Depends(get_current_user)
):
    """Atualiza as credenciais de um gateway específico"""
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if environment == PaymentEnvironment.SANDBOX:
        update_key = "sandbox_credentials"
    else:
        update_key = "production_credentials"
    
    await payment_gateway.update_settings({update_key: credentials.model_dump()})
    
    return {"message": f"Credenciais {environment.value} atualizadas com sucesso"}


@router.get("/settings/public-key")
async def get_public_key(current_user: dict = Depends(get_current_user)):
    """Obtém o token do PagSeguro para uso no frontend (checkout)"""
    settings = await payment_gateway.get_settings()
    
    if settings.environment == PaymentEnvironment.SANDBOX:
        credentials = settings.sandbox_credentials
    else:
        credentials = settings.production_credentials
    
    return {
        "gateway": "pagseguro",
        "token": credentials.pagseguro_token
    }


# ==================== PAGAMENTO DA TAXA DE INSCRIÇÃO (TREINAMENTO PRESENCIAL) ====================

@router.post("/create-payment")
async def create_enrollment_payment(current_user: dict = Depends(get_current_user)):
    """Cria um pagamento para a taxa de inscrição do treinamento presencial"""
    import uuid
    
    # Obter configurações
    settings = await payment_gateway.get_settings()
    
    if not settings:
        raise HTTPException(status_code=404, detail="Configurações não encontradas")
    
    # Obter dados do usuário
    user = await payment_gateway.db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Valor da taxa de inscrição
    enrollment_fee = getattr(settings, 'enrollment_fee', 150.0)
    
    # Criar referência única
    reference_id = str(uuid.uuid4())
    
    try:
        # Obter serviço do gateway
        gateway_service = await payment_gateway.get_gateway_service()
        
        # Criar checkout PagSeguro
        checkout_result = await gateway_service.create_checkout(
            amount=enrollment_fee,
            description="Taxa de Inscrição - Treinamento Presencial IGVD",
            reference_id=reference_id,
            customer_name=user.get("full_name", ""),
            customer_email=user.get("email", ""),
            customer_cpf=user.get("cpf", "")
        )
        
        if checkout_result.get("success"):
            # Salvar transação pendente
            transaction = {
                "id": reference_id,
                "user_id": current_user["sub"],
                "purpose": "training_fee",
                "amount": enrollment_fee,
                "status": "pending",
                "gateway": "pagseguro",
                "checkout_id": checkout_result.get("checkout_id"),
                "checkout_url": checkout_result.get("checkout_url"),
                "created_at": datetime.now().isoformat()
            }
            await payment_gateway.db.transactions.insert_one(transaction)
            
            return {
                "success": True,
                "reference_id": reference_id,
                "amount": enrollment_fee,
                "checkout_url": checkout_result.get("checkout_url"),
                "message": "Checkout criado com sucesso"
            }
        else:
            # Retornar erro mas com informações para retry
            return {
                "success": False,
                "reference_id": reference_id,
                "amount": enrollment_fee,
                "checkout_url": None,
                "message": checkout_result.get("message", "Erro ao criar checkout")
            }
            
    except Exception as e:
        logger.error(f"Erro ao criar pagamento de inscrição: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao criar pagamento: {str(e)}")


@router.post("/simulate-payment/{reference_id}")
async def simulate_enrollment_payment(
    reference_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Simula o pagamento da taxa de inscrição (para testes)"""
    # Buscar transação
    transaction = await payment_gateway.db.transactions.find_one(
        {"id": reference_id, "user_id": current_user["sub"]},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    if transaction.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Pagamento já foi realizado")
    
    # Marcar como pago
    await payment_gateway.db.transactions.update_one(
        {"id": reference_id},
        {"$set": {
            "status": "paid",
            "paid_at": datetime.now().isoformat()
        }}
    )
    
    # Avançar usuário para próxima etapa (vendas em campo)
    await payment_gateway.db.users.update_one(
        {"id": current_user["sub"]},
        {"$set": {
            "current_stage": "vendas_campo",
            "training_fee_paid": True,
            "updated_at": datetime.now().isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Pagamento simulado com sucesso! Você avançou para a etapa de vendas em campo."
    }


# ==================== PROCESSAMENTO DE PAGAMENTOS ====================

@router.post("/pix", response_model=TransactionResponse)
async def create_pix_payment(
    request: PixPaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cria um pagamento PIX"""
    try:
        result = await payment_gateway.process_pix_payment(request, current_user["sub"])
        return result
    except Exception as e:
        logger.error(f"Erro ao criar pagamento PIX: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar pagamento: {str(e)}")


@router.post("/credit-card", response_model=TransactionResponse)
async def create_credit_card_payment(
    request: CreditCardPaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cria um pagamento com cartão de crédito"""
    try:
        result = await payment_gateway.process_credit_card_payment(request, current_user["sub"])
        return result
    except Exception as e:
        logger.error(f"Erro ao criar pagamento com cartão: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar pagamento: {str(e)}")


@router.post("/split", response_model=TransactionResponse)
async def create_split_payment(
    request: SplitPaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cria um pagamento dividido (PIX + Cartão ou múltiplos cartões)"""
    try:
        # Validar que os valores batem
        total_parts = request.pix_amount + request.card1_amount + request.card2_amount
        if abs(total_parts - request.total_amount) > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"A soma dos valores ({total_parts}) não corresponde ao total ({request.total_amount})"
            )
        
        result = await payment_gateway.process_split_payment(request, current_user["sub"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar pagamento dividido: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar pagamento: {str(e)}")


@router.get("/transaction/{transaction_id}")
async def get_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtém detalhes de uma transação"""
    transaction = await payment_gateway.get_transaction(transaction_id)
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    # Verificar se o usuário tem acesso
    if transaction.user_id != current_user["sub"] and current_user.get("role") not in ["admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Atualizar status com o gateway se necessário
    if transaction.status == PaymentStatus.PENDING and transaction.gateway_transaction_id:
        service = await payment_gateway.get_gateway_service()
        status_result = await service.check_payment_status(transaction.gateway_transaction_id)
        
        if status_result.get("status") != transaction.status:
            await payment_gateway.update_transaction_status(
                transaction_id,
                status_result.get("status"),
                status_result
            )
            transaction.status = status_result.get("status")
    
    return transaction.model_dump()


@router.get("/my-transactions")
async def get_my_transactions(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Obtém as transações do usuário logado"""
    transactions = await payment_gateway.get_user_transactions(current_user["sub"], limit)
    return transactions


@router.get("/all-transactions")
async def get_all_transactions(
    limit: int = 100,
    status: Optional[PaymentStatus] = None,
    purpose: Optional[PaymentPurpose] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtém todas as transações (somente admin)"""
    if current_user.get("role") not in ["admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    db = payment_gateway.db
    
    query = {}
    if status:
        query["status"] = status
    if purpose:
        query["purpose"] = purpose
    
    cursor = db.transactions.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    transactions = await cursor.to_list(limit)
    
    return transactions


# ==================== WEBHOOKS ====================

@router.post("/webhooks/pagseguro")
async def handle_pagseguro_webhook(request: Request):
    """Recebe webhooks do PagSeguro"""
    try:
        body = await request.body()
        data = json.loads(body)
        
        # Extrair informações do webhook
        event_type = data.get("notificationType", data.get("type", ""))
        reference_id = data.get("reference", data.get("reference_id"))
        
        logger.info(f"PagSeguro webhook received: {event_type} for reference {reference_id}")
        
        # Salvar evento de webhook
        webhook_event = WebhookEvent(
            gateway=PaymentGateway.PAGSEGURO,
            event_type=event_type,
            gateway_event_id=str(data.get("notificationCode", data.get("id", ""))),
            transaction_id=reference_id,
            raw_payload=data
        )
        
        await payment_gateway.db.webhook_events.insert_one(webhook_event.model_dump())
        
        # Processar atualização de status se for notificação de transação
        if reference_id:
            # Buscar transação
            transaction = await payment_gateway.db.transactions.find_one(
                {"$or": [
                    {"id": reference_id},
                    {"gateway_transaction_id": reference_id}
                ]},
                {"_id": 0}
            )
            
            if transaction and transaction.get("gateway_transaction_id"):
                # Verificar status atual no PagSeguro
                service = await payment_gateway.get_gateway_service()
                status_result = await service.check_payment_status(transaction["gateway_transaction_id"])
                
                if status_result.get("status"):
                    await payment_gateway.update_transaction_status(
                        transaction["id"],
                        status_result.get("status"),
                        status_result
                    )
                    
                    await payment_gateway.add_webhook_notification(
                        transaction["id"],
                        {
                            "timestamp": datetime.now().isoformat(),
                            "event_type": event_type,
                            "status": status_result.get("status"),
                            "raw": data
                        }
                    )
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Erro ao processar webhook PagSeguro: {e}")
        return {"success": False, "error": str(e)}


# ==================== REEMBOLSOS ====================

@router.post("/refund/{transaction_id}")
async def refund_transaction(
    transaction_id: str,
    amount: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
):
    """Processa um reembolso (somente admin)"""
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    transaction = await payment_gateway.get_transaction(transaction_id)
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    if transaction.status not in [PaymentStatus.APPROVED, PaymentStatus.PAID]:
        raise HTTPException(status_code=400, detail="Transação não pode ser reembolsada")
    
    if not transaction.gateway_transaction_id:
        raise HTTPException(status_code=400, detail="Transação sem ID do gateway")
    
    service = await payment_gateway.get_gateway_service()
    result = await service.refund_payment(transaction.gateway_transaction_id, amount)
    
    if result.get("success"):
        await payment_gateway.update_transaction_status(
            transaction_id,
            PaymentStatus.REFUNDED,
            result
        )
        return {"message": "Reembolso processado com sucesso", **result}
    else:
        raise HTTPException(status_code=400, detail=result.get("message", "Erro ao processar reembolso"))
