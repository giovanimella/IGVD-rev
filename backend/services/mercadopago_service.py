"""
Serviço de integração com MercadoPago Checkout Pro
O cliente é redirecionado para o ambiente seguro do MercadoPago para realizar o pagamento
"""
import mercadopago
import logging
import os
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import uuid

from models_payment import (
    PaymentEnvironment, GatewayCredentials, PaymentStatus,
    CheckoutProRequest
)

logger = logging.getLogger(__name__)


class MercadoPagoService:
    """Serviço de integração com MercadoPago Checkout Pro"""
    
    def __init__(self, credentials: GatewayCredentials, environment: PaymentEnvironment):
        self.credentials = credentials
        self.environment = environment
        
        # Usar credenciais do banco, ou fallback para variáveis de ambiente
        self.access_token = (
            credentials.mercadopago_access_token 
            if credentials.mercadopago_access_token 
            else os.environ.get('MERCADOPAGO_ACCESS_TOKEN')
        )
        self.public_key = (
            credentials.mercadopago_public_key 
            if credentials.mercadopago_public_key 
            else os.environ.get('MERCADOPAGO_PUBLIC_KEY')
        )
        
        if self.access_token:
            self.sdk = mercadopago.SDK(self.access_token)
            logger.info(f"MercadoPago SDK inicializado (token: {self.access_token[:20]}...)")
        else:
            self.sdk = None
            logger.warning("MercadoPago: Access token não configurado")
    
    def _get_idempotency_key(self, suffix: str = "") -> str:
        """Gera uma chave de idempotência única"""
        key = str(uuid.uuid4())
        if suffix:
            key = f"{key}_{suffix}"
        return key
    
    def _map_status(self, mp_status: str) -> PaymentStatus:
        """Mapeia status do MercadoPago para status interno"""
        status_map = {
            "pending": PaymentStatus.PENDING,
            "approved": PaymentStatus.APPROVED,
            "authorized": PaymentStatus.AUTHORIZED,
            "in_process": PaymentStatus.PROCESSING,
            "in_mediation": PaymentStatus.PROCESSING,
            "rejected": PaymentStatus.DECLINED,
            "cancelled": PaymentStatus.CANCELLED,
            "refunded": PaymentStatus.REFUNDED,
            "charged_back": PaymentStatus.REFUNDED
        }
        return status_map.get(mp_status, PaymentStatus.PENDING)
    
    async def create_checkout_preference(self, request: CheckoutProRequest, transaction_id: str) -> Dict[str, Any]:
        """
        Cria uma preferência do Checkout Pro
        Retorna a URL para redirecionar o usuário ao ambiente seguro do MercadoPago
        """
        if not self.sdk:
            return {
                "success": False,
                "message": "MercadoPago não configurado. Configure o Access Token nas configurações de pagamento.",
                "status": PaymentStatus.FAILED
            }
        
        try:
            # Obter URL base do frontend para back_urls
            frontend_url = os.environ.get('FRONTEND_URL', '')
            webhook_url = os.environ.get('WEBHOOK_URL', os.environ.get('REACT_APP_BACKEND_URL', ''))
            
            # Construir dados da preferência (básico)
            preference_data = {
                "items": [
                    {
                        "id": transaction_id,
                        "title": request.title,
                        "description": request.description or request.title,
                        "quantity": 1,
                        "currency_id": "BRL",
                        "unit_price": float(request.amount)
                    }
                ],
                "external_reference": transaction_id,
                "statement_descriptor": "IGVD"
            }
            
            # Adicionar back_urls apenas se tiver URLs válidas (não localhost)
            if frontend_url and 'localhost' not in frontend_url and '127.0.0.1' not in frontend_url:
                preference_data["back_urls"] = {
                    "success": f"{frontend_url}/payment/success?transaction_id={transaction_id}",
                    "failure": f"{frontend_url}/payment/failure?transaction_id={transaction_id}",
                    "pending": f"{frontend_url}/payment/pending?transaction_id={transaction_id}"
                }
                preference_data["auto_return"] = "approved"
            
            # Adicionar webhook URL apenas se válida
            if webhook_url and 'localhost' not in webhook_url and '127.0.0.1' not in webhook_url:
                preference_data["notification_url"] = f"{webhook_url}/api/payments/webhooks/mercadopago"
            
            # Adicionar dados do pagador se fornecidos (opcional - MercadoPago coletará se não informado)
            if request.payer_email:
                preference_data["payer"] = {
                    "email": request.payer_email
                }
                if request.payer_name:
                    names = request.payer_name.split(" ", 1)
                    preference_data["payer"]["name"] = names[0]
                    if len(names) > 1:
                        preference_data["payer"]["surname"] = names[1]
            
            # Criar preferência no MercadoPago
            logger.info(f"Criando preferência Checkout Pro para transação {transaction_id}")
            logger.info(f"Dados: {preference_data}")
            
            result = self.sdk.preference().create(preference_data)
            preference = result.get("response", {})
            
            if result.get("status") in [200, 201]:
                init_point = preference.get("init_point")
                sandbox_init_point = preference.get("sandbox_init_point")
                
                # Usar sandbox em ambiente de teste
                checkout_url = sandbox_init_point if self.environment == PaymentEnvironment.SANDBOX else init_point
                
                logger.info(f"Preferência criada com sucesso: {preference.get('id')}")
                
                return {
                    "success": True,
                    "message": "Preferência de pagamento criada com sucesso",
                    "preference_id": preference.get("id"),
                    "checkout_url": checkout_url,
                    "init_point": init_point,
                    "sandbox_init_point": sandbox_init_point,
                    "status": PaymentStatus.PENDING
                }
            else:
                error_message = preference.get("message", "Erro ao criar preferência de pagamento")
                logger.error(f"Erro ao criar preferência: {result}")
                return {
                    "success": False,
                    "message": error_message,
                    "status": PaymentStatus.FAILED
                }
                
        except Exception as e:
            logger.error(f"Exceção ao criar preferência Checkout Pro: {e}")
            return {
                "success": False,
                "message": f"Erro ao processar pagamento: {str(e)}",
                "status": PaymentStatus.FAILED
            }
    
    async def check_payment_status(self, gateway_transaction_id: str) -> Dict[str, Any]:
        """Verifica o status de um pagamento"""
        if not self.sdk:
            return {"status": PaymentStatus.FAILED, "message": "SDK não configurado"}
        
        try:
            result = self.sdk.payment().get(int(gateway_transaction_id))
            payment = result.get("response", {})
            
            if result.get("status") == 200:
                return {
                    "status": self._map_status(payment.get("status", "pending")),
                    "status_detail": payment.get("status_detail"),
                    "gateway_status": payment.get("status"),
                    "payment_method": payment.get("payment_method_id"),
                    "payment_type": payment.get("payment_type_id"),
                    "transaction_amount": payment.get("transaction_amount"),
                    "date_approved": payment.get("date_approved")
                }
            else:
                return {"status": PaymentStatus.FAILED, "message": "Pagamento não encontrado"}
                
        except Exception as e:
            logger.error(f"Erro ao verificar status do pagamento: {e}")
            return {"status": PaymentStatus.FAILED, "message": str(e)}
    
    async def search_payments_by_reference(self, external_reference: str) -> Dict[str, Any]:
        """Busca pagamentos por referência externa (transaction_id)"""
        if not self.sdk:
            return {"success": False, "payments": [], "message": "SDK não configurado"}
        
        try:
            filters = {
                "external_reference": external_reference
            }
            
            result = self.sdk.payment().search(filters)
            
            if result.get("status") == 200:
                results = result.get("response", {}).get("results", [])
                
                payments = []
                for payment in results:
                    payments.append({
                        "id": payment.get("id"),
                        "status": self._map_status(payment.get("status", "pending")),
                        "gateway_status": payment.get("status"),
                        "status_detail": payment.get("status_detail"),
                        "payment_method": payment.get("payment_method_id"),
                        "payment_type": payment.get("payment_type_id"),
                        "amount": payment.get("transaction_amount"),
                        "date_created": payment.get("date_created"),
                        "date_approved": payment.get("date_approved")
                    })
                
                return {
                    "success": True,
                    "payments": payments,
                    "total": len(payments)
                }
            else:
                return {"success": False, "payments": [], "message": "Erro ao buscar pagamentos"}
                
        except Exception as e:
            logger.error(f"Erro ao buscar pagamentos por referência: {e}")
            return {"success": False, "payments": [], "message": str(e)}
    
    async def refund_payment(self, gateway_transaction_id: str, amount: Optional[float] = None) -> Dict[str, Any]:
        """Processa um reembolso"""
        if not self.sdk:
            return {"success": False, "message": "SDK não configurado"}
        
        try:
            refund_data = {}
            if amount:
                refund_data["amount"] = float(amount)
            
            result = self.sdk.refund().create(int(gateway_transaction_id), refund_data)
            refund = result.get("response", {})
            
            if result.get("status") in [200, 201]:
                return {
                    "success": True,
                    "refund_id": refund.get("id"),
                    "status": refund.get("status"),
                    "amount": refund.get("amount")
                }
            else:
                return {
                    "success": False,
                    "message": refund.get("message", "Erro ao processar reembolso")
                }
                
        except Exception as e:
            logger.error(f"Erro ao processar reembolso: {e}")
            return {"success": False, "message": str(e)}
    
    def get_public_key(self) -> Optional[str]:
        """Retorna a public key para uso no frontend"""
        return self.public_key
