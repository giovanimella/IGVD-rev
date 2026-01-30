"""
Serviço de integração com PagSeguro/PagBank Checkout
O cliente é redirecionado para o ambiente seguro do PagSeguro para realizar o pagamento
"""
import logging
import os
import aiohttp
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional
from datetime import datetime
import uuid

from models_payment import (
    PaymentEnvironment, GatewayCredentials, PaymentStatus,
    CheckoutProRequest
)

logger = logging.getLogger(__name__)


class PagSeguroService:
    """Serviço de integração com PagSeguro/PagBank Checkout"""
    
    SANDBOX_URL = "https://ws.sandbox.pagseguro.uol.com.br"
    PRODUCTION_URL = "https://ws.pagseguro.uol.com.br"
    
    SANDBOX_CHECKOUT_URL = "https://sandbox.pagseguro.uol.com.br/v2/checkout/payment.html"
    PRODUCTION_CHECKOUT_URL = "https://pagseguro.uol.com.br/v2/checkout/payment.html"
    
    def __init__(self, credentials: GatewayCredentials, environment: PaymentEnvironment):
        self.credentials = credentials
        self.environment = environment
        
        # Usar credenciais do banco, ou fallback para variáveis de ambiente
        self.email = (
            credentials.pagseguro_email 
            if credentials.pagseguro_email 
            else os.environ.get('PAGSEGURO_EMAIL')
        )
        self.token = (
            credentials.pagseguro_token 
            if credentials.pagseguro_token 
            else os.environ.get('PAGSEGURO_TOKEN')
        )
        
        # Definir URLs baseado no ambiente
        if environment == PaymentEnvironment.SANDBOX:
            self.api_url = self.SANDBOX_URL
            self.checkout_url = self.SANDBOX_CHECKOUT_URL
        else:
            self.api_url = self.PRODUCTION_URL
            self.checkout_url = self.PRODUCTION_CHECKOUT_URL
        
        if self.email and self.token:
            logger.info(f"PagSeguro inicializado (email: {self.email})")
        else:
            logger.warning("PagSeguro: Credenciais não configuradas")
    
    def _map_status(self, ps_status: str) -> PaymentStatus:
        """Mapeia status do PagSeguro para status interno"""
        status_map = {
            "1": PaymentStatus.PENDING,      # Aguardando pagamento
            "2": PaymentStatus.PROCESSING,   # Em análise
            "3": PaymentStatus.APPROVED,     # Paga
            "4": PaymentStatus.APPROVED,     # Disponível
            "5": PaymentStatus.PROCESSING,   # Em disputa
            "6": PaymentStatus.REFUNDED,     # Devolvida
            "7": PaymentStatus.CANCELLED,    # Cancelada
            "8": PaymentStatus.REFUNDED,     # Debitado (chargeback)
            "9": PaymentStatus.PROCESSING,   # Retenção temporária
        }
        return status_map.get(str(ps_status), PaymentStatus.PENDING)
    
    async def create_checkout_preference(self, request: CheckoutProRequest, transaction_id: str) -> Dict[str, Any]:
        """
        Cria uma sessão de checkout no PagSeguro
        Retorna a URL para redirecionar o usuário
        """
        if not self.email or not self.token:
            return {
                "success": False,
                "message": "PagSeguro não configurado. Configure o Email e Token nas configurações de pagamento.",
                "status": PaymentStatus.FAILED
            }
        
        try:
            # Obter URL base do frontend para redirect
            frontend_url = os.environ.get('FRONTEND_URL', '')
            
            # Montar dados do checkout
            checkout_data = {
                "email": self.email,
                "token": self.token,
                "currency": "BRL",
                "itemId1": transaction_id,
                "itemDescription1": request.title[:100],  # Limite de 100 caracteres
                "itemAmount1": f"{request.amount:.2f}",
                "itemQuantity1": "1",
                "reference": transaction_id,
            }
            
            # Adicionar URLs de redirect se disponíveis
            if frontend_url and 'localhost' not in frontend_url:
                checkout_data["redirectURL"] = f"{frontend_url}/payment/success?transaction_id={transaction_id}"
                checkout_data["notificationURL"] = f"{frontend_url.replace('http://', 'https://')}/api/payments/webhooks/pagseguro"
            
            # Adicionar dados do pagador se disponíveis
            if request.payer_email:
                checkout_data["senderEmail"] = request.payer_email
            if request.payer_name:
                checkout_data["senderName"] = request.payer_name
            
            logger.info(f"Criando checkout PagSeguro para transação {transaction_id}")
            
            # Fazer requisição para API do PagSeguro
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_url}/v2/checkout",
                    data=checkout_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"}
                ) as response:
                    response_text = await response.text()
                    
                    if response.status == 200:
                        # Parse XML response
                        root = ET.fromstring(response_text)
                        
                        code = root.find("code")
                        if code is not None:
                            checkout_code = code.text
                            checkout_final_url = f"{self.checkout_url}?code={checkout_code}"
                            
                            logger.info(f"Checkout PagSeguro criado: {checkout_code}")
                            
                            return {
                                "success": True,
                                "message": "Checkout criado com sucesso",
                                "preference_id": checkout_code,
                                "checkout_url": checkout_final_url,
                                "status": PaymentStatus.PENDING
                            }
                        else:
                            # Verificar se há erro
                            error = root.find(".//error")
                            error_msg = "Erro desconhecido"
                            if error is not None:
                                code_elem = error.find("code")
                                msg_elem = error.find("message")
                                error_msg = f"[{code_elem.text if code_elem is not None else '?'}] {msg_elem.text if msg_elem is not None else 'Erro'}"
                            
                            logger.error(f"Erro PagSeguro: {error_msg}")
                            return {
                                "success": False,
                                "message": error_msg,
                                "status": PaymentStatus.FAILED
                            }
                    else:
                        logger.error(f"Erro HTTP PagSeguro: {response.status} - {response_text}")
                        return {
                            "success": False,
                            "message": f"Erro ao comunicar com PagSeguro (HTTP {response.status})",
                            "status": PaymentStatus.FAILED
                        }
                        
        except Exception as e:
            logger.error(f"Exceção ao criar checkout PagSeguro: {e}")
            return {
                "success": False,
                "message": f"Erro ao processar pagamento: {str(e)}",
                "status": PaymentStatus.FAILED
            }
    
    async def check_payment_status(self, notification_code: str) -> Dict[str, Any]:
        """Verifica o status de uma transação via notificação"""
        if not self.email or not self.token:
            return {"status": PaymentStatus.FAILED, "message": "Credenciais não configuradas"}
        
        try:
            url = f"{self.api_url}/v3/transactions/notifications/{notification_code}"
            params = {
                "email": self.email,
                "token": self.token
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        response_text = await response.text()
                        root = ET.fromstring(response_text)
                        
                        status = root.find("status")
                        reference = root.find("reference")
                        gross_amount = root.find("grossAmount")
                        
                        return {
                            "status": self._map_status(status.text if status is not None else "1"),
                            "gateway_status": status.text if status is not None else None,
                            "reference": reference.text if reference is not None else None,
                            "amount": float(gross_amount.text) if gross_amount is not None else None
                        }
                    else:
                        return {"status": PaymentStatus.FAILED, "message": "Transação não encontrada"}
                        
        except Exception as e:
            logger.error(f"Erro ao verificar status PagSeguro: {e}")
            return {"status": PaymentStatus.FAILED, "message": str(e)}
    
    async def search_by_reference(self, reference: str) -> Dict[str, Any]:
        """Busca transação por referência"""
        if not self.email or not self.token:
            return {"success": False, "transactions": [], "message": "Credenciais não configuradas"}
        
        try:
            url = f"{self.api_url}/v2/transactions"
            params = {
                "email": self.email,
                "token": self.token,
                "reference": reference
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        response_text = await response.text()
                        root = ET.fromstring(response_text)
                        
                        transactions = []
                        for tx in root.findall(".//transaction"):
                            code = tx.find("code")
                            status = tx.find("status")
                            gross_amount = tx.find("grossAmount")
                            
                            transactions.append({
                                "id": code.text if code is not None else None,
                                "status": self._map_status(status.text if status is not None else "1"),
                                "gateway_status": status.text if status is not None else None,
                                "amount": float(gross_amount.text) if gross_amount is not None else None
                            })
                        
                        return {
                            "success": True,
                            "transactions": transactions,
                            "total": len(transactions)
                        }
                    else:
                        return {"success": False, "transactions": [], "message": "Erro ao buscar"}
                        
        except Exception as e:
            logger.error(f"Erro ao buscar transações PagSeguro: {e}")
            return {"success": False, "transactions": [], "message": str(e)}
    
    async def refund_payment(self, transaction_code: str, amount: Optional[float] = None) -> Dict[str, Any]:
        """Processa um reembolso"""
        if not self.email or not self.token:
            return {"success": False, "message": "Credenciais não configuradas"}
        
        try:
            url = f"{self.api_url}/v2/transactions/refunds"
            
            data = {
                "email": self.email,
                "token": self.token,
                "transactionCode": transaction_code
            }
            
            if amount:
                data["refundValue"] = f"{amount:.2f}"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    data=data,
                    headers={"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"}
                ) as response:
                    if response.status == 200:
                        return {
                            "success": True,
                            "message": "Reembolso solicitado com sucesso"
                        }
                    else:
                        response_text = await response.text()
                        return {
                            "success": False,
                            "message": f"Erro ao processar reembolso: {response_text}"
                        }
                        
        except Exception as e:
            logger.error(f"Erro ao processar reembolso PagSeguro: {e}")
            return {"success": False, "message": str(e)}
    
    def get_public_key(self) -> Optional[str]:
        """Retorna indicação de que está configurado"""
        return self.token[:8] + "..." if self.token else None
