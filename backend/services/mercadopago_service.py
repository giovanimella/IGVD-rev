"""
Serviço de integração com MercadoPago
Suporta PIX, Cartão de Crédito e Pagamentos Divididos
"""
import mercadopago
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import uuid

from models_payment import (
    PaymentEnvironment, GatewayCredentials, PaymentStatus,
    PixPaymentRequest, CreditCardPaymentRequest, SplitPaymentRequest
)

logger = logging.getLogger(__name__)


class MercadoPagoService:
    """Serviço de integração com MercadoPago"""
    
    SANDBOX_URL = "https://api.mercadopago.com"
    PRODUCTION_URL = "https://api.mercadopago.com"
    
    def __init__(self, credentials: GatewayCredentials, environment: PaymentEnvironment):
        self.credentials = credentials
        self.environment = environment
        self.access_token = credentials.mercadopago_access_token
        self.public_key = credentials.mercadopago_public_key
        
        if self.access_token:
            self.sdk = mercadopago.SDK(self.access_token)
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
    
    async def create_pix_payment(self, request: PixPaymentRequest, transaction_id: str) -> Dict[str, Any]:
        """Cria um pagamento PIX"""
        if not self.sdk:
            return {
                "success": False,
                "message": "MercadoPago não configurado",
                "status": PaymentStatus.FAILED
            }
        
        try:
            payment_data = {
                "transaction_amount": float(request.amount),
                "description": request.description,
                "payment_method_id": "pix",
                "payer": {
                    "email": request.payer.email,
                    "first_name": request.payer.name.split()[0] if request.payer.name else "",
                    "last_name": " ".join(request.payer.name.split()[1:]) if request.payer.name and len(request.payer.name.split()) > 1 else "",
                    "identification": {
                        "type": request.payer.document_type,
                        "number": request.payer.document_number
                    }
                },
                "external_reference": transaction_id
            }
            
            request_options = mercadopago.config.RequestOptions()
            request_options.custom_headers = {
                "x-idempotency-key": self._get_idempotency_key("pix")
            }
            
            result = self.sdk.payment().create(payment_data, request_options)
            payment = result.get("response", {})
            
            if result.get("status") in [200, 201]:
                # Extrair dados do QR Code PIX
                pix_data = payment.get("point_of_interaction", {}).get("transaction_data", {})
                
                return {
                    "success": True,
                    "message": "Pagamento PIX criado com sucesso",
                    "gateway_transaction_id": str(payment.get("id")),
                    "status": self._map_status(payment.get("status", "pending")),
                    "pix_qr_code": pix_data.get("qr_code"),
                    "pix_qr_code_base64": pix_data.get("qr_code_base64"),
                    "pix_copy_paste": pix_data.get("qr_code"),
                    "pix_expiration": payment.get("date_of_expiration")
                }
            else:
                error_message = payment.get("message", "Erro ao criar pagamento PIX")
                logger.error(f"MercadoPago PIX error: {result}")
                return {
                    "success": False,
                    "message": error_message,
                    "status": PaymentStatus.FAILED
                }
                
        except Exception as e:
            logger.error(f"MercadoPago PIX exception: {e}")
            return {
                "success": False,
                "message": f"Erro ao processar pagamento: {str(e)}",
                "status": PaymentStatus.FAILED
            }
    
    async def create_credit_card_payment(self, request: CreditCardPaymentRequest, transaction_id: str) -> Dict[str, Any]:
        """Cria um pagamento com cartão de crédito"""
        if not self.sdk:
            return {
                "success": False,
                "message": "MercadoPago não configurado",
                "status": PaymentStatus.FAILED
            }
        
        try:
            payment_data = {
                "transaction_amount": float(request.amount),
                "token": request.card.token,
                "description": request.description,
                "payment_method_id": request.card.payment_method_id,
                "installments": request.card.installments,
                "payer": {
                    "email": request.payer.email,
                    "first_name": request.payer.name.split()[0] if request.payer.name else "",
                    "last_name": " ".join(request.payer.name.split()[1:]) if request.payer.name and len(request.payer.name.split()) > 1 else "",
                    "identification": {
                        "type": request.payer.document_type,
                        "number": request.payer.document_number
                    }
                },
                "external_reference": transaction_id
            }
            
            if request.card.issuer_id:
                payment_data["issuer_id"] = request.card.issuer_id
            
            request_options = mercadopago.config.RequestOptions()
            request_options.custom_headers = {
                "x-idempotency-key": self._get_idempotency_key("card")
            }
            
            result = self.sdk.payment().create(payment_data, request_options)
            payment = result.get("response", {})
            
            if result.get("status") in [200, 201]:
                mp_status = payment.get("status", "pending")
                status = self._map_status(mp_status)
                
                return {
                    "success": status in [PaymentStatus.APPROVED, PaymentStatus.AUTHORIZED, PaymentStatus.PENDING],
                    "message": "Pagamento processado" if status != PaymentStatus.DECLINED else "Pagamento recusado",
                    "gateway_transaction_id": str(payment.get("id")),
                    "status": status,
                    "status_detail": payment.get("status_detail"),
                    "authorization_code": payment.get("authorization_code")
                }
            else:
                error_message = payment.get("message", "Erro ao processar cartão")
                logger.error(f"MercadoPago Card error: {result}")
                return {
                    "success": False,
                    "message": error_message,
                    "status": PaymentStatus.FAILED
                }
                
        except Exception as e:
            logger.error(f"MercadoPago Card exception: {e}")
            return {
                "success": False,
                "message": f"Erro ao processar pagamento: {str(e)}",
                "status": PaymentStatus.FAILED
            }
    
    async def create_split_payment(self, request: SplitPaymentRequest, transaction_id: str) -> Dict[str, Any]:
        """Cria um pagamento dividido (PIX + Cartão ou múltiplos cartões)"""
        if not self.sdk:
            return {
                "success": False,
                "message": "MercadoPago não configurado",
                "status": PaymentStatus.FAILED
            }
        
        results = {
            "success": True,
            "message": "Pagamento dividido processado",
            "status": PaymentStatus.PENDING,
            "pix_transaction_id": None,
            "card_transaction_id": None,
            "card2_transaction_id": None,
            "pix_qr_code": None,
            "pix_qr_code_base64": None,
            "pix_copy_paste": None
        }
        
        try:
            # Processar parte PIX
            if request.pix_amount > 0:
                pix_request = PixPaymentRequest(
                    amount=request.pix_amount,
                    description=f"{request.description} (PIX)",
                    payer=request.payer,
                    purpose=request.purpose,
                    reference_id=f"{transaction_id}_pix"
                )
                
                pix_result = await self.create_pix_payment(pix_request, f"{transaction_id}_pix")
                
                if pix_result.get("success"):
                    results["pix_transaction_id"] = pix_result.get("gateway_transaction_id")
                    results["pix_qr_code"] = pix_result.get("pix_qr_code")
                    results["pix_qr_code_base64"] = pix_result.get("pix_qr_code_base64")
                    results["pix_copy_paste"] = pix_result.get("pix_copy_paste")
                else:
                    results["success"] = False
                    results["message"] = f"Erro no PIX: {pix_result.get('message')}"
                    results["status"] = PaymentStatus.FAILED
            
            # Processar parte Cartão 1
            if request.card1_amount > 0 and request.card1:
                card_request = CreditCardPaymentRequest(
                    amount=request.card1_amount,
                    description=f"{request.description} (Cartão 1)",
                    payer=request.payer,
                    card=request.card1,
                    purpose=request.purpose,
                    reference_id=f"{transaction_id}_card1"
                )
                
                card_result = await self.create_credit_card_payment(card_request, f"{transaction_id}_card1")
                
                if card_result.get("success"):
                    results["card_transaction_id"] = card_result.get("gateway_transaction_id")
                else:
                    results["success"] = False
                    results["message"] = f"Erro no Cartão 1: {card_result.get('message')}"
                    results["status"] = PaymentStatus.FAILED
            
            # Processar parte Cartão 2 (se houver)
            if request.card2_amount > 0 and request.card2:
                card2_request = CreditCardPaymentRequest(
                    amount=request.card2_amount,
                    description=f"{request.description} (Cartão 2)",
                    payer=request.payer,
                    card=request.card2,
                    purpose=request.purpose,
                    reference_id=f"{transaction_id}_card2"
                )
                
                card2_result = await self.create_credit_card_payment(card2_request, f"{transaction_id}_card2")
                
                if card2_result.get("success"):
                    results["card2_transaction_id"] = card2_result.get("gateway_transaction_id")
                else:
                    results["success"] = False
                    results["message"] = f"Erro no Cartão 2: {card2_result.get('message')}"
                    results["status"] = PaymentStatus.FAILED
            
            # Definir ID principal da transação
            results["gateway_transaction_id"] = (
                results.get("card_transaction_id") or 
                results.get("pix_transaction_id") or 
                results.get("card2_transaction_id")
            )
            
            return results
            
        except Exception as e:
            logger.error(f"MercadoPago Split exception: {e}")
            return {
                "success": False,
                "message": f"Erro ao processar pagamento dividido: {str(e)}",
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
                    "gateway_status": payment.get("status")
                }
            else:
                return {"status": PaymentStatus.FAILED, "message": "Pagamento não encontrado"}
                
        except Exception as e:
            logger.error(f"MercadoPago check status error: {e}")
            return {"status": PaymentStatus.FAILED, "message": str(e)}
    
    async def refund_payment(self, gateway_transaction_id: str, amount: Optional[float] = None) -> Dict[str, Any]:
        """Processa um reembolso"""
        if not self.sdk:
            return {"success": False, "message": "SDK não configurado"}
        
        try:
            refund_data = {}
            if amount:
                refund_data["amount"] = float(amount)
            
            request_options = mercadopago.config.RequestOptions()
            result = self.sdk.refund().create(int(gateway_transaction_id), refund_data, request_options)
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
            logger.error(f"MercadoPago refund error: {e}")
            return {"success": False, "message": str(e)}
    
    def get_public_key(self) -> Optional[str]:
        """Retorna a public key para uso no frontend"""
        return self.public_key
