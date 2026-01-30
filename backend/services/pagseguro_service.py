"""
Serviço de integração com PagSeguro
Suporta PIX, Cartão de Crédito e Pagamentos Divididos
"""
import httpx
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import uuid

from models_payment import (
    PaymentEnvironment, GatewayCredentials, PaymentStatus,
    PixPaymentRequest, CreditCardPaymentRequest, SplitPaymentRequest
)

logger = logging.getLogger(__name__)


class PagSeguroService:
    """Serviço de integração com PagSeguro"""
    
    SANDBOX_URL = "https://sandbox.api.pagseguro.com"
    PRODUCTION_URL = "https://api.pagseguro.com"
    
    def __init__(self, credentials: GatewayCredentials, environment: PaymentEnvironment):
        self.credentials = credentials
        self.environment = environment
        self.token = credentials.pagseguro_token
        self.email = credentials.pagseguro_email
        
        self.base_url = self.SANDBOX_URL if environment == PaymentEnvironment.SANDBOX else self.PRODUCTION_URL
        
        self.headers = {
            "Authorization": f"Bearer {self.token}" if self.token else "",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    def _get_idempotency_key(self, suffix: str = "") -> str:
        """Gera uma chave de idempotência única"""
        key = str(uuid.uuid4())
        if suffix:
            key = f"{key}_{suffix}"
        return key
    
    def _map_status(self, ps_status: str) -> PaymentStatus:
        """Mapeia status do PagSeguro para status interno"""
        status_map = {
            "WAITING": PaymentStatus.PENDING,
            "IN_ANALYSIS": PaymentStatus.PROCESSING,
            "AUTHORIZED": PaymentStatus.AUTHORIZED,
            "PAID": PaymentStatus.PAID,
            "AVAILABLE": PaymentStatus.APPROVED,
            "DISPUTE": PaymentStatus.PROCESSING,
            "REFUNDED": PaymentStatus.REFUNDED,
            "CANCELED": PaymentStatus.CANCELLED,
            "DECLINED": PaymentStatus.DECLINED
        }
        return status_map.get(ps_status.upper() if ps_status else "", PaymentStatus.PENDING)
    
    async def create_pix_payment(self, request: PixPaymentRequest, transaction_id: str) -> Dict[str, Any]:
        """Cria um pagamento PIX"""
        if not self.token:
            return {
                "success": False,
                "message": "PagSeguro não configurado",
                "status": PaymentStatus.FAILED
            }
        
        try:
            # Converter valor para centavos
            amount_cents = int(request.amount * 100)
            
            payload = {
                "reference_id": transaction_id,
                "description": request.description,
                "amount": {
                    "value": amount_cents,
                    "currency": "BRL"
                },
                "payment_method": {
                    "type": "PIX"
                },
                "customer": {
                    "name": request.payer.name,
                    "email": request.payer.email,
                    "tax_id": request.payer.document_number
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/orders",
                    json=payload,
                    headers={
                        **self.headers,
                        "x-idempotency-key": self._get_idempotency_key("pix")
                    },
                    timeout=30.0
                )
            
            if response.status_code in [200, 201]:
                data = response.json()
                
                # Extrair dados do QR Code PIX
                qr_codes = data.get("qr_codes", [])
                pix_data = qr_codes[0] if qr_codes else {}
                
                return {
                    "success": True,
                    "message": "Pagamento PIX criado com sucesso",
                    "gateway_transaction_id": data.get("id"),
                    "status": self._map_status(data.get("status", "WAITING")),
                    "pix_qr_code": pix_data.get("text"),
                    "pix_qr_code_base64": pix_data.get("links", [{}])[0].get("href") if pix_data.get("links") else None,
                    "pix_copy_paste": pix_data.get("text"),
                    "pix_expiration": pix_data.get("expiration_date")
                }
            else:
                error_data = response.json() if response.content else {}
                error_message = error_data.get("error_messages", [{}])[0].get("description", "Erro ao criar pagamento PIX")
                logger.error(f"PagSeguro PIX error: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "message": error_message,
                    "status": PaymentStatus.FAILED
                }
                
        except Exception as e:
            logger.error(f"PagSeguro PIX exception: {e}")
            return {
                "success": False,
                "message": f"Erro ao processar pagamento: {str(e)}",
                "status": PaymentStatus.FAILED
            }
    
    async def create_credit_card_payment(self, request: CreditCardPaymentRequest, transaction_id: str) -> Dict[str, Any]:
        """Cria um pagamento com cartão de crédito"""
        if not self.token:
            return {
                "success": False,
                "message": "PagSeguro não configurado",
                "status": PaymentStatus.FAILED
            }
        
        try:
            # Converter valor para centavos
            amount_cents = int(request.amount * 100)
            
            payload = {
                "reference_id": transaction_id,
                "description": request.description,
                "amount": {
                    "value": amount_cents,
                    "currency": "BRL"
                },
                "payment_method": {
                    "type": "CREDIT_CARD",
                    "installments": request.card.installments,
                    "capture": True,
                    "card": {
                        "encrypted": request.card.token,
                        "store": False
                    }
                },
                "customer": {
                    "name": request.payer.name,
                    "email": request.payer.email,
                    "tax_id": request.payer.document_number
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/orders",
                    json=payload,
                    headers={
                        **self.headers,
                        "x-idempotency-key": self._get_idempotency_key("card")
                    },
                    timeout=30.0
                )
            
            if response.status_code in [200, 201]:
                data = response.json()
                charges = data.get("charges", [])
                charge = charges[0] if charges else {}
                
                ps_status = charge.get("status", data.get("status", "WAITING"))
                status = self._map_status(ps_status)
                
                return {
                    "success": status in [PaymentStatus.APPROVED, PaymentStatus.AUTHORIZED, PaymentStatus.PAID, PaymentStatus.PENDING],
                    "message": "Pagamento processado" if status != PaymentStatus.DECLINED else "Pagamento recusado",
                    "gateway_transaction_id": data.get("id"),
                    "status": status,
                    "status_detail": charge.get("payment_response", {}).get("message"),
                    "authorization_code": charge.get("payment_response", {}).get("reference")
                }
            else:
                error_data = response.json() if response.content else {}
                error_message = error_data.get("error_messages", [{}])[0].get("description", "Erro ao processar cartão")
                logger.error(f"PagSeguro Card error: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "message": error_message,
                    "status": PaymentStatus.FAILED
                }
                
        except Exception as e:
            logger.error(f"PagSeguro Card exception: {e}")
            return {
                "success": False,
                "message": f"Erro ao processar pagamento: {str(e)}",
                "status": PaymentStatus.FAILED
            }
    
    async def create_split_payment(self, request: SplitPaymentRequest, transaction_id: str) -> Dict[str, Any]:
        """Cria um pagamento dividido (PIX + Cartão ou múltiplos cartões)"""
        if not self.token:
            return {
                "success": False,
                "message": "PagSeguro não configurado",
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
            logger.error(f"PagSeguro Split exception: {e}")
            return {
                "success": False,
                "message": f"Erro ao processar pagamento dividido: {str(e)}",
                "status": PaymentStatus.FAILED
            }
    
    async def check_payment_status(self, gateway_transaction_id: str) -> Dict[str, Any]:
        """Verifica o status de um pagamento"""
        if not self.token:
            return {"status": PaymentStatus.FAILED, "message": "API não configurada"}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/orders/{gateway_transaction_id}",
                    headers=self.headers,
                    timeout=30.0
                )
            
            if response.status_code == 200:
                data = response.json()
                charges = data.get("charges", [])
                charge = charges[0] if charges else {}
                
                return {
                    "status": self._map_status(charge.get("status", data.get("status", "WAITING"))),
                    "status_detail": charge.get("payment_response", {}).get("message"),
                    "gateway_status": charge.get("status", data.get("status"))
                }
            else:
                return {"status": PaymentStatus.FAILED, "message": "Pagamento não encontrado"}
                
        except Exception as e:
            logger.error(f"PagSeguro check status error: {e}")
            return {"status": PaymentStatus.FAILED, "message": str(e)}
    
    async def refund_payment(self, gateway_transaction_id: str, amount: Optional[float] = None) -> Dict[str, Any]:
        """Processa um reembolso"""
        if not self.token:
            return {"success": False, "message": "API não configurada"}
        
        try:
            # Primeiro, obter os charges da ordem
            async with httpx.AsyncClient() as client:
                order_response = await client.get(
                    f"{self.base_url}/orders/{gateway_transaction_id}",
                    headers=self.headers,
                    timeout=30.0
                )
            
            if order_response.status_code != 200:
                return {"success": False, "message": "Ordem não encontrada"}
            
            order_data = order_response.json()
            charges = order_data.get("charges", [])
            
            if not charges:
                return {"success": False, "message": "Nenhuma cobrança encontrada"}
            
            charge_id = charges[0].get("id")
            
            # Criar reembolso
            refund_data = {}
            if amount:
                refund_data["amount"] = {"value": int(amount * 100)}
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/charges/{charge_id}/cancel",
                    json=refund_data,
                    headers=self.headers,
                    timeout=30.0
                )
            
            if response.status_code in [200, 201]:
                data = response.json()
                return {
                    "success": True,
                    "refund_id": data.get("id"),
                    "status": data.get("status"),
                    "amount": data.get("amount", {}).get("value", 0) / 100
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "message": error_data.get("error_messages", [{}])[0].get("description", "Erro ao processar reembolso")
                }
                
        except Exception as e:
            logger.error(f"PagSeguro refund error: {e}")
            return {"success": False, "message": str(e)}
