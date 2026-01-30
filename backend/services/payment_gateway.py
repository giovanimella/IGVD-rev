"""
Serviço de gateway de pagamento
Gerencia configurações e transações com MercadoPago Checkout Pro
"""
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

from models_payment import (
    PaymentGateway, PaymentEnvironment, PaymentSettings, GatewayCredentials,
    Transaction, PaymentStatus
)


class PaymentGatewayService:
    """Serviço principal de gateway de pagamento"""
    
    def __init__(self):
        self.mongo_url = os.environ.get('MONGO_URL')
        self.db_name = os.environ.get('DB_NAME')
        self._client = None
        self._db = None
    
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
        """Retorna o serviço do gateway ativo (MercadoPago ou PagSeguro)"""
        gateway, environment, credentials = await self.get_active_credentials()
        
        if gateway == PaymentGateway.PAGSEGURO:
            from services.pagseguro_service import PagSeguroService
            return PagSeguroService(credentials, environment)
        else:
            from services.mercadopago_service import MercadoPagoService
            return MercadoPagoService(credentials, environment)
    
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
    
    async def get_user_transactions(self, user_id: str, limit: int = 50) -> list:
        """Obtém as transações de um usuário"""
        cursor = self.db.transactions.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit)
        
        return await cursor.to_list(limit)


# Instância global do serviço
payment_gateway = PaymentGatewayService()
