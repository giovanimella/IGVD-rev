"""
Serviço abstrato de gateway de pagamento
Gerencia a seleção e uso dos gateways configurados
"""
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

from models_payment import (
    PaymentGateway, PaymentEnvironment, PaymentSettings, GatewayCredentials,
    PixPaymentRequest, CreditCardPaymentRequest, SplitPaymentRequest,
    Transaction, TransactionResponse, PaymentStatus, PaymentMethod
)


class PaymentGatewayService:
    """Serviço principal de gateway de pagamento"""
    
    def __init__(self):
        self.mongo_url = os.environ.get('MONGO_URL')
        self.db_name = os.environ.get('DB_NAME')
        self._client = None
        self._db = None
        self._pagseguro_service = None
        self._mercadopago_service = None
    
    @property
    def db(self):
        if self._db is None:
            self._client = AsyncIOMotorClient(self.mongo_url)
            self._db = self._client[self.db_name]
        return self._db
    
    async def get_settings(self) -> PaymentSettings:
        """Obtém as configurações de pagamento"""
        settings = await self.db.payment_settings.find_one({}, {"_id": 0})
        if settings:
            return PaymentSettings(**settings)
        
        # Criar configurações padrão se não existirem
        default_settings = PaymentSettings()
        await self.db.payment_settings.insert_one(default_settings.model_dump())
        return default_settings
    
    async def update_settings(self, updates: Dict[str, Any]) -> PaymentSettings:
        """Atualiza as configurações de pagamento"""
        updates["updated_at"] = datetime.now().isoformat()
        
        await self.db.payment_settings.update_one(
            {},
            {"$set": updates},
            upsert=True
        )
        
        return await self.get_settings()
    
    async def get_active_credentials(self) -> tuple[PaymentGateway, PaymentEnvironment, GatewayCredentials]:
        """Obtém as credenciais ativas baseado na configuração"""
        settings = await self.get_settings()
        
        if settings.environment == PaymentEnvironment.SANDBOX:
            credentials = settings.sandbox_credentials
        else:
            credentials = settings.production_credentials
        
        return settings.active_gateway, settings.environment, credentials
    
    async def get_gateway_service(self):
        """Retorna o serviço do gateway ativo"""
        gateway, environment, credentials = await self.get_active_credentials()
        
        if gateway == PaymentGateway.PAGSEGURO:
            from services.pagseguro_service import PagSeguroService
            return PagSeguroService(credentials, environment)
        else:
            from services.mercadopago_service import MercadoPagoService
            return MercadoPagoService(credentials, environment)
    
    async def process_pix_payment(self, request: PixPaymentRequest, user_id: str) -> TransactionResponse:
        """Processa um pagamento PIX"""
        settings = await self.get_settings()
        
        if not settings.pix_enabled:
            return TransactionResponse(
                success=False,
                message="Pagamento PIX não está habilitado",
                transaction_id="",
                status=PaymentStatus.FAILED
            )
        
        service = await self.get_gateway_service()
        gateway, environment, _ = await self.get_active_credentials()
        
        # Criar registro de transação
        transaction = Transaction(
            user_id=user_id,
            gateway=gateway,
            payment_method=PaymentMethod.PIX,
            environment=environment,
            amount=request.amount,
            purpose=request.purpose,
            description=request.description,
            payer_email=request.payer.email,
            payer_name=request.payer.name,
            payer_document=request.payer.document_number,
            reference_id=request.reference_id
        )
        
        # Processar pagamento
        result = await service.create_pix_payment(request, transaction.id)
        
        # Atualizar transação com resultado
        transaction.gateway_transaction_id = result.get("gateway_transaction_id")
        transaction.status = result.get("status", PaymentStatus.PENDING)
        transaction.pix_qr_code = result.get("pix_qr_code")
        transaction.pix_qr_code_base64 = result.get("pix_qr_code_base64")
        transaction.pix_copy_paste = result.get("pix_copy_paste")
        transaction.pix_expiration = result.get("pix_expiration")
        transaction.updated_at = datetime.now().isoformat()
        
        # Salvar transação
        await self.db.transactions.insert_one(transaction.model_dump())
        
        return TransactionResponse(
            success=result.get("success", False),
            message=result.get("message", "Pagamento processado"),
            transaction_id=transaction.id,
            gateway_transaction_id=transaction.gateway_transaction_id,
            status=transaction.status,
            pix_qr_code=transaction.pix_qr_code,
            pix_qr_code_base64=transaction.pix_qr_code_base64,
            pix_copy_paste=transaction.pix_copy_paste,
            pix_expiration=transaction.pix_expiration
        )
    
    async def process_credit_card_payment(self, request: CreditCardPaymentRequest, user_id: str) -> TransactionResponse:
        """Processa um pagamento com cartão de crédito"""
        settings = await self.get_settings()
        
        if not settings.credit_card_enabled:
            return TransactionResponse(
                success=False,
                message="Pagamento com cartão não está habilitado",
                transaction_id="",
                status=PaymentStatus.FAILED
            )
        
        service = await self.get_gateway_service()
        gateway, environment, _ = await self.get_active_credentials()
        
        # Criar registro de transação
        transaction = Transaction(
            user_id=user_id,
            gateway=gateway,
            payment_method=PaymentMethod.CREDIT_CARD,
            environment=environment,
            amount=request.amount,
            installments=request.card.installments,
            purpose=request.purpose,
            description=request.description,
            payer_email=request.payer.email,
            payer_name=request.payer.name,
            payer_document=request.payer.document_number,
            reference_id=request.reference_id
        )
        
        # Processar pagamento
        result = await service.create_credit_card_payment(request, transaction.id)
        
        # Atualizar transação com resultado
        transaction.gateway_transaction_id = result.get("gateway_transaction_id")
        transaction.status = result.get("status", PaymentStatus.PENDING)
        transaction.status_detail = result.get("status_detail")
        transaction.updated_at = datetime.now().isoformat()
        
        if transaction.status in [PaymentStatus.APPROVED, PaymentStatus.PAID]:
            transaction.paid_at = datetime.now().isoformat()
        
        # Salvar transação
        await self.db.transactions.insert_one(transaction.model_dump())
        
        return TransactionResponse(
            success=result.get("success", False),
            message=result.get("message", "Pagamento processado"),
            transaction_id=transaction.id,
            gateway_transaction_id=transaction.gateway_transaction_id,
            status=transaction.status
        )
    
    async def process_split_payment(self, request: SplitPaymentRequest, user_id: str) -> TransactionResponse:
        """Processa um pagamento dividido"""
        settings = await self.get_settings()
        
        if not settings.split_payment_enabled:
            return TransactionResponse(
                success=False,
                message="Pagamento dividido não está habilitado",
                transaction_id="",
                status=PaymentStatus.FAILED
            )
        
        service = await self.get_gateway_service()
        gateway, environment, _ = await self.get_active_credentials()
        
        # Criar registro de transação
        transaction = Transaction(
            user_id=user_id,
            gateway=gateway,
            payment_method=PaymentMethod.SPLIT,
            environment=environment,
            amount=request.total_amount,
            pix_amount=request.pix_amount,
            card_amount=request.card1_amount,
            card2_amount=request.card2_amount,
            purpose=request.purpose,
            description=request.description,
            payer_email=request.payer.email,
            payer_name=request.payer.name,
            payer_document=request.payer.document_number,
            reference_id=request.reference_id
        )
        
        # Processar pagamento dividido
        result = await service.create_split_payment(request, transaction.id)
        
        # Atualizar transação com resultado
        transaction.gateway_transaction_id = result.get("gateway_transaction_id")
        transaction.status = result.get("status", PaymentStatus.PENDING)
        transaction.pix_transaction_id = result.get("pix_transaction_id")
        transaction.card_transaction_id = result.get("card_transaction_id")
        transaction.card2_transaction_id = result.get("card2_transaction_id")
        transaction.pix_qr_code = result.get("pix_qr_code")
        transaction.pix_qr_code_base64 = result.get("pix_qr_code_base64")
        transaction.pix_copy_paste = result.get("pix_copy_paste")
        transaction.updated_at = datetime.now().isoformat()
        
        # Salvar transação
        await self.db.transactions.insert_one(transaction.model_dump())
        
        return TransactionResponse(
            success=result.get("success", False),
            message=result.get("message", "Pagamento processado"),
            transaction_id=transaction.id,
            gateway_transaction_id=transaction.gateway_transaction_id,
            status=transaction.status,
            pix_qr_code=transaction.pix_qr_code,
            pix_qr_code_base64=transaction.pix_qr_code_base64,
            pix_copy_paste=transaction.pix_copy_paste,
            split_details={
                "pix_amount": request.pix_amount,
                "card1_amount": request.card1_amount,
                "card2_amount": request.card2_amount,
                "pix_transaction_id": transaction.pix_transaction_id,
                "card_transaction_id": transaction.card_transaction_id,
                "card2_transaction_id": transaction.card2_transaction_id
            }
        )
    
    async def get_transaction(self, transaction_id: str) -> Optional[Transaction]:
        """Obtém uma transação pelo ID"""
        data = await self.db.transactions.find_one({"id": transaction_id}, {"_id": 0})
        if data:
            return Transaction(**data)
        return None
    
    async def update_transaction_status(
        self, 
        transaction_id: str, 
        status: PaymentStatus,
        gateway_data: Optional[Dict[str, Any]] = None
    ):
        """Atualiza o status de uma transação"""
        update_data = {
            "status": status,
            "updated_at": datetime.now().isoformat()
        }
        
        if status in [PaymentStatus.APPROVED, PaymentStatus.PAID]:
            update_data["paid_at"] = datetime.now().isoformat()
        elif status == PaymentStatus.REFUNDED:
            update_data["refunded_at"] = datetime.now().isoformat()
        
        if gateway_data:
            update_data["metadata"] = gateway_data
        
        await self.db.transactions.update_one(
            {"id": transaction_id},
            {"$set": update_data}
        )
    
    async def add_webhook_notification(self, transaction_id: str, notification: Dict[str, Any]):
        """Adiciona uma notificação de webhook à transação"""
        await self.db.transactions.update_one(
            {"id": transaction_id},
            {"$push": {"webhook_notifications": notification}}
        )
    
    async def get_user_transactions(self, user_id: str, limit: int = 50) -> list:
        """Obtém as transações de um usuário"""
        cursor = self.db.transactions.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit)
        
        return await cursor.to_list(limit)


# Instância global do serviço
payment_gateway = PaymentGatewayService()
