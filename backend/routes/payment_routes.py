"""
Rotas de configuração e processamento de pagamentos
Sistema com MercadoPago Checkout Pro - Pagamento seguro no ambiente do MercadoPago
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from datetime import datetime
import logging
import json
import os

from auth import get_current_user
from models_payment import (
    PaymentSettings, PaymentSettingsUpdate, PaymentGateway, PaymentEnvironment,
    GatewayCredentials, CheckoutProRequest, CheckoutProResponse,
    Transaction, TransactionResponse, PaymentStatus,
    WebhookEvent, PaymentPurpose, PaymentMethod
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
    """Obtém a public key do gateway ativo para uso no frontend"""
    settings = await payment_gateway.get_settings()
    
    if settings.environment == PaymentEnvironment.SANDBOX:
        credentials = settings.sandbox_credentials
    else:
        credentials = settings.production_credentials
    
    if settings.active_gateway == PaymentGateway.MERCADOPAGO:
        return {
            "gateway": "mercadopago",
            "public_key": credentials.mercadopago_public_key,
            "environment": settings.environment.value,
            "configured": bool(credentials.mercadopago_access_token)
        }
    else:
        return {
            "gateway": "pagseguro",
            "public_key": credentials.pagseguro_token[:8] + "..." if credentials.pagseguro_token else None,
            "environment": settings.environment.value,
            "configured": bool(credentials.pagseguro_token and credentials.pagseguro_email)
        }


# ==================== CHECKOUT ====================

@router.post("/checkout", response_model=CheckoutProResponse)
async def create_checkout(
    request: CheckoutProRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Cria um Checkout externo (MercadoPago ou PagSeguro).
    Retorna uma URL para redirecionar o usuário ao ambiente seguro do gateway.
    
    O cliente preencherá todos os dados de pagamento diretamente no gateway,
    garantindo máxima segurança.
    """
    try:
        db = payment_gateway.db
        user_id = current_user["sub"]
        
        # Buscar dados do usuário para pré-preencher email (opcional)
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        
        if not request.payer_email and user:
            request.payer_email = user.get("email")
            request.payer_name = user.get("full_name")
        
        # Criar registro de transação
        transaction = Transaction(
            user_id=user_id,
            gateway=PaymentGateway.MERCADOPAGO,
            payment_method=PaymentMethod.PIX,  # Será atualizado pelo webhook
            environment=(await payment_gateway.get_settings()).environment,
            amount=request.amount,
            purpose=request.purpose,
            description=request.title,
            payer_email=request.payer_email,
            payer_name=request.payer_name,
            reference_id=request.reference_id
        )
        
        # Obter serviço do gateway
        service = await payment_gateway.get_gateway_service()
        
        # Criar preferência no MercadoPago
        result = await service.create_checkout_preference(request, transaction.id)
        
        if result.get("success"):
            # Atualizar transação com dados da preferência
            transaction.gateway_transaction_id = result.get("preference_id")
            transaction.metadata = {
                "preference_id": result.get("preference_id"),
                "checkout_url": result.get("checkout_url"),
                "init_point": result.get("init_point"),
                "sandbox_init_point": result.get("sandbox_init_point")
            }
            
            # Salvar transação
            await db.transactions.insert_one(transaction.model_dump())
            
            logger.info(f"Checkout Pro criado: {transaction.id} -> {result.get('checkout_url')}")
            
            return CheckoutProResponse(
                success=True,
                message="Checkout criado com sucesso. Redirecione o usuário para a URL de pagamento.",
                transaction_id=transaction.id,
                preference_id=result.get("preference_id"),
                checkout_url=result.get("checkout_url"),
                status=PaymentStatus.PENDING
            )
        else:
            logger.error(f"Erro ao criar checkout: {result.get('message')}")
            return CheckoutProResponse(
                success=False,
                message=result.get("message", "Erro ao criar checkout"),
                transaction_id="",
                status=PaymentStatus.FAILED
            )
            
    except Exception as e:
        logger.error(f"Exceção ao criar checkout: {e}")
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
    
    return transaction.model_dump()


@router.get("/transaction/{transaction_id}/check-status")
async def check_transaction_status(
    transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Verifica o status atual de uma transação no MercadoPago.
    Útil para verificar se o pagamento foi concluído após o redirecionamento.
    """
    transaction = await payment_gateway.get_transaction(transaction_id)
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    # Verificar se o usuário tem acesso
    if transaction.user_id != current_user["sub"] and current_user.get("role") not in ["admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Buscar pagamentos no MercadoPago pela referência externa
    service = await payment_gateway.get_gateway_service()
    result = await service.search_payments_by_reference(transaction_id)
    
    if result.get("success") and result.get("payments"):
        # Encontrou pagamentos - atualizar transação com o mais recente
        latest_payment = result["payments"][0]
        
        new_status = latest_payment.get("status", PaymentStatus.PENDING)
        
        if new_status != transaction.status:
            await payment_gateway.update_transaction_status(
                transaction_id,
                new_status,
                latest_payment
            )
            transaction.status = new_status
        
        return {
            "transaction_id": transaction_id,
            "status": new_status.value if hasattr(new_status, 'value') else new_status,
            "payment_method": latest_payment.get("payment_method"),
            "payment_type": latest_payment.get("payment_type"),
            "amount": latest_payment.get("amount"),
            "date_approved": latest_payment.get("date_approved"),
            "gateway_payment_id": latest_payment.get("id"),
            "updated": new_status != transaction.status
        }
    
    return {
        "transaction_id": transaction_id,
        "status": transaction.status.value if hasattr(transaction.status, 'value') else transaction.status,
        "message": "Pagamento ainda não processado ou pendente",
        "updated": False
    }


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

@router.post("/webhooks/mercadopago")
async def handle_mercadopago_webhook(request: Request):
    """
    Recebe webhooks do MercadoPago.
    Atualiza automaticamente o status das transações quando o pagamento é confirmado.
    """
    try:
        body = await request.body()
        data = json.loads(body) if body else {}
        
        # Log do webhook recebido
        logger.info(f"MercadoPago webhook recebido: {json.dumps(data)[:500]}")
        
        # Extrair informações do webhook
        event_type = data.get("type", data.get("action", ""))
        payment_id = None
        
        # Formato de notificação IPN
        if "data" in data and "id" in data.get("data", {}):
            payment_id = data["data"]["id"]
        # Formato alternativo
        elif "id" in data and data.get("type") == "payment":
            payment_id = data["id"]
        # Formato de query params (fallback)
        elif "topic" in str(request.url):
            query_params = dict(request.query_params)
            if query_params.get("topic") == "payment":
                payment_id = query_params.get("id")
        
        # Salvar evento de webhook
        db = payment_gateway.db
        
        webhook_event = WebhookEvent(
            gateway=PaymentGateway.MERCADOPAGO,
            event_type=event_type,
            gateway_event_id=str(data.get("id", "")),
            gateway_transaction_id=str(payment_id) if payment_id else None,
            raw_payload=data
        )
        
        await db.webhook_events.insert_one(webhook_event.model_dump())
        
        # Processar atualização de status
        if payment_id:
            service = await payment_gateway.get_gateway_service()
            
            # Buscar detalhes do pagamento
            status_result = await service.check_payment_status(str(payment_id))
            
            if status_result.get("status"):
                # Buscar transação pela external_reference (nosso transaction_id)
                payment_details = await service.check_payment_status(str(payment_id))
                
                # Buscar por gateway_transaction_id (preference_id) ou metadata
                transaction = await db.transactions.find_one(
                    {"$or": [
                        {"gateway_transaction_id": str(payment_id)},
                        {"metadata.preference_id": str(payment_id)}
                    ]},
                    {"_id": 0}
                )
                
                # Se não encontrou, buscar pelo payment usando a API de search
                if not transaction:
                    search_result = await service.search_payments_by_reference(str(payment_id))
                    # Tentar buscar pela referência externa
                    for payment in search_result.get("payments", []):
                        ext_ref = payment.get("external_reference")
                        if ext_ref:
                            transaction = await db.transactions.find_one(
                                {"id": ext_ref},
                                {"_id": 0}
                            )
                            if transaction:
                                break
                
                if transaction:
                    new_status = status_result.get("status")
                    
                    # Atualizar transação
                    update_data = {
                        "status": new_status,
                        "updated_at": datetime.now().isoformat(),
                        "gateway_payment_id": str(payment_id),
                        "payment_method_used": status_result.get("payment_method"),
                        "payment_type_used": status_result.get("payment_type")
                    }
                    
                    if new_status in [PaymentStatus.APPROVED, PaymentStatus.PAID]:
                        update_data["paid_at"] = datetime.now().isoformat()
                    
                    await db.transactions.update_one(
                        {"id": transaction["id"]},
                        {"$set": update_data}
                    )
                    
                    # Adicionar notificação ao histórico
                    await db.transactions.update_one(
                        {"id": transaction["id"]},
                        {"$push": {"webhook_notifications": {
                            "timestamp": datetime.now().isoformat(),
                            "event_type": event_type,
                            "payment_id": str(payment_id),
                            "status": new_status.value if hasattr(new_status, 'value') else new_status,
                            "raw": data
                        }}}
                    )
                    
                    logger.info(f"Transação {transaction['id']} atualizada para status: {new_status}")
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Erro ao processar webhook MercadoPago: {e}")
        # Retornar 200 para não causar retries
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
    
    # Buscar o payment_id real (não o preference_id)
    gateway_payment_id = transaction.metadata.get("gateway_payment_id") if transaction.metadata else None
    
    if not gateway_payment_id:
        # Tentar buscar pelo transaction_id
        service = await payment_gateway.get_gateway_service()
        search_result = await service.search_payments_by_reference(transaction_id)
        
        if search_result.get("payments"):
            gateway_payment_id = search_result["payments"][0].get("id")
    
    if not gateway_payment_id:
        raise HTTPException(status_code=400, detail="ID do pagamento não encontrado para reembolso")
    
    service = await payment_gateway.get_gateway_service()
    result = await service.refund_payment(str(gateway_payment_id), amount)
    
    if result.get("success"):
        await payment_gateway.update_transaction_status(
            transaction_id,
            PaymentStatus.REFUNDED,
            result
        )
        return {"message": "Reembolso processado com sucesso", **result}
    else:
        raise HTTPException(status_code=400, detail=result.get("message", "Erro ao processar reembolso"))


# ==================== PÁGINAS DE RETORNO ====================

@router.get("/callback/success")
async def payment_success_callback(
    transaction_id: Optional[str] = None,
    collection_id: Optional[str] = None,
    collection_status: Optional[str] = None,
    payment_id: Optional[str] = None,
    status: Optional[str] = None,
    external_reference: Optional[str] = None,
    payment_type: Optional[str] = None,
    merchant_order_id: Optional[str] = None,
    preference_id: Optional[str] = None
):
    """
    Endpoint para processar o retorno do MercadoPago após pagamento bem-sucedido.
    O frontend pode chamar este endpoint para atualizar o status.
    """
    # Usar external_reference como transaction_id se não fornecido
    tx_id = transaction_id or external_reference
    
    if not tx_id:
        return {"success": False, "message": "Transaction ID não fornecido"}
    
    db = payment_gateway.db
    transaction = await db.transactions.find_one({"id": tx_id}, {"_id": 0})
    
    if not transaction:
        return {"success": False, "message": "Transação não encontrada"}
    
    # Atualizar com informações do callback
    update_data = {
        "updated_at": datetime.now().isoformat()
    }
    
    if collection_id or payment_id:
        update_data["gateway_payment_id"] = collection_id or payment_id
    
    if collection_status or status:
        mp_status = collection_status or status
        if mp_status == "approved":
            update_data["status"] = PaymentStatus.APPROVED
            update_data["paid_at"] = datetime.now().isoformat()
        elif mp_status == "pending":
            update_data["status"] = PaymentStatus.PENDING
    
    if payment_type:
        update_data["payment_type_used"] = payment_type
    
    await db.transactions.update_one(
        {"id": tx_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "transaction_id": tx_id,
        "status": update_data.get("status", transaction.get("status")),
        "message": "Pagamento processado"
    }
