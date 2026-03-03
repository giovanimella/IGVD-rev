"""
Serviço de integração com PagBank - Checkout Externo
O checkout é feito no ambiente do PagBank, não no sistema.
Autenticação apenas com Token (Bearer).
"""
import httpx
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import uuid

logger = logging.getLogger(__name__)


class PagBankService:
    """Serviço de integração com PagBank - Checkout Externo"""
    
    SANDBOX_URL = "https://sandbox.api.pagseguro.com"
    PRODUCTION_URL = "https://api.pagseguro.com"
    
    def __init__(self, token: str, email: str = None, is_sandbox: bool = True):
        """
        Inicializa o serviço PagBank
        
        Args:
            token: Token de autenticação do PagBank
            email: Email da conta (apenas para referência)
            is_sandbox: Se True, usa ambiente de teste
        """
        self.token = token
        self.email = email
        self.is_sandbox = is_sandbox
        self.base_url = self.SANDBOX_URL if is_sandbox else self.PRODUCTION_URL
        
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    async def create_checkout(
        self,
        reference_id: str,
        amount: float,
        item_name: str,
        customer_name: str = None,
        customer_email: str = None,
        customer_cpf: str = None,
        redirect_url: str = None,
        notification_urls: List[str] = None,
        expiration_minutes: int = 120
    ) -> Dict[str, Any]:
        """
        Cria um checkout no PagBank e retorna a URL para redirecionamento
        
        Args:
            reference_id: ID único de referência (interno do sistema)
            amount: Valor em reais (ex: 150.00)
            item_name: Nome/descrição do item
            customer_name: Nome do cliente (opcional)
            customer_email: Email do cliente (opcional)
            customer_cpf: CPF do cliente (opcional - apenas números)
            redirect_url: URL para redirecionar após pagamento
            notification_urls: Lista de URLs para webhooks
            expiration_minutes: Minutos até expirar o checkout (padrão: 120)
        
        Returns:
            Dict com success, checkout_url, checkout_id, etc.
        """
        if not self.token:
            return {
                "success": False,
                "error": "Token PagBank não configurado",
                "checkout_url": None
            }
        
        try:
            # Converter valor para centavos
            amount_cents = int(amount * 100)
            
            # Calcular data de expiração
            expiration_date = (datetime.utcnow() + timedelta(minutes=expiration_minutes)).isoformat() + "Z"
            
            # Montar payload do checkout
            payload = {
                "reference_id": reference_id,
                "expiration_date": expiration_date,
                "items": [
                    {
                        "reference_id": reference_id,
                        "name": item_name[:64],  # Máximo 64 caracteres
                        "quantity": 1,
                        "unit_amount": amount_cents
                    }
                ],
                "payment_methods": [
                    {"type": "CREDIT_CARD"},
                    {"type": "DEBIT_CARD"},
                    {"type": "PIX"},
                    {"type": "BOLETO"}
                ],
                "payment_methods_configs": [
                    {
                        "type": "CREDIT_CARD",
                        "config_options": [
                            {"option": "INSTALLMENTS_LIMIT", "value": "12"}
                        ]
                    }
                ]
            }
            
            # Adicionar dados do cliente se fornecidos
            if customer_name and customer_email:
                customer_data = {
                    "name": customer_name[:50],
                    "email": customer_email
                }
                if customer_cpf:
                    # Limpar CPF (apenas números)
                    cpf_clean = ''.join(filter(str.isdigit, customer_cpf))
                    if len(cpf_clean) == 11:
                        customer_data["tax_id"] = cpf_clean
                
                payload["customer"] = customer_data
                payload["customer_modifiable"] = True  # Permite cliente editar dados
            
            # Adicionar URL de redirecionamento
            if redirect_url:
                payload["redirect_url"] = redirect_url
            
            # Adicionar URLs de notificação (webhook)
            if notification_urls:
                payload["notification_urls"] = notification_urls
                payload["payment_notification_urls"] = notification_urls
            
            logger.info(f"[PagBank] Criando checkout: reference_id={reference_id}, amount={amount}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/checkouts",
                    json=payload,
                    headers=self.headers
                )
            
            if response.status_code in [200, 201]:
                data = response.json()
                
                # Extrair URL de pagamento
                checkout_url = None
                links = data.get("links", [])
                for link in links:
                    if link.get("rel") == "PAY":
                        checkout_url = link.get("href")
                        break
                
                logger.info(f"[PagBank] Checkout criado com sucesso: id={data.get('id')}")
                
                return {
                    "success": True,
                    "checkout_id": data.get("id"),
                    "checkout_url": checkout_url,
                    "reference_id": reference_id,
                    "status": data.get("status", "ACTIVE"),
                    "expiration_date": data.get("expiration_date"),
                    "raw_response": data
                }
            else:
                error_data = response.json() if response.content else {}
                error_messages = error_data.get("error_messages", [])
                error_text = error_messages[0].get("description") if error_messages else f"HTTP {response.status_code}"
                
                logger.error(f"[PagBank] Erro ao criar checkout: {response.status_code} - {response.text}")
                
                return {
                    "success": False,
                    "error": error_text,
                    "error_code": response.status_code,
                    "checkout_url": None,
                    "raw_response": error_data
                }
                
        except httpx.TimeoutException:
            logger.error("[PagBank] Timeout ao criar checkout")
            return {
                "success": False,
                "error": "Timeout na comunicação com PagBank",
                "checkout_url": None
            }
        except Exception as e:
            logger.error(f"[PagBank] Exceção ao criar checkout: {e}")
            return {
                "success": False,
                "error": str(e),
                "checkout_url": None
            }
    
    async def get_checkout_status(self, checkout_id: str) -> Dict[str, Any]:
        """
        Consulta o status de um checkout
        
        Args:
            checkout_id: ID do checkout retornado na criação
        
        Returns:
            Dict com status do checkout e pedidos associados
        """
        if not self.token:
            return {"success": False, "error": "Token não configurado"}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/checkouts/{checkout_id}",
                    headers=self.headers
                )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verificar se há pedidos pagos
                orders = data.get("orders", [])
                paid_order = None
                for order in orders:
                    charges = order.get("charges", [])
                    for charge in charges:
                        if charge.get("status") in ["PAID", "AUTHORIZED"]:
                            paid_order = order
                            break
                
                return {
                    "success": True,
                    "checkout_id": data.get("id"),
                    "status": data.get("status"),
                    "orders": orders,
                    "is_paid": paid_order is not None,
                    "paid_order": paid_order,
                    "raw_response": data
                }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "raw_response": response.json() if response.content else {}
                }
                
        except Exception as e:
            logger.error(f"[PagBank] Erro ao consultar checkout: {e}")
            return {"success": False, "error": str(e)}
    
    async def test_connection(self) -> Dict[str, Any]:
        """
        Testa a conexão com o PagBank
        
        Returns:
            Dict com success e detalhes do teste
        """
        if not self.token:
            return {
                "success": False,
                "error": "Token não configurado",
                "environment": "sandbox" if self.is_sandbox else "production"
            }
        
        try:
            # Tentar criar um checkout mínimo para testar a API
            test_reference = f"test_{uuid.uuid4().hex[:8]}"
            
            payload = {
                "reference_id": test_reference,
                "items": [
                    {
                        "reference_id": test_reference,
                        "name": "Teste de Conexao",
                        "quantity": 1,
                        "unit_amount": 100  # R$ 1,00
                    }
                ]
            }
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{self.base_url}/checkouts",
                    json=payload,
                    headers=self.headers
                )
            
            if response.status_code in [200, 201]:
                return {
                    "success": True,
                    "message": "Conexão estabelecida com sucesso",
                    "environment": "sandbox" if self.is_sandbox else "production",
                    "api_url": self.base_url
                }
            elif response.status_code == 401:
                return {
                    "success": False,
                    "error": "Token inválido ou expirado",
                    "environment": "sandbox" if self.is_sandbox else "production"
                }
            elif response.status_code == 403:
                return {
                    "success": False,
                    "error": "Acesso negado - verifique as permissões do token",
                    "environment": "sandbox" if self.is_sandbox else "production"
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "details": error_data,
                    "environment": "sandbox" if self.is_sandbox else "production"
                }
                
        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "Timeout na conexão com PagBank",
                "environment": "sandbox" if self.is_sandbox else "production"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "environment": "sandbox" if self.is_sandbox else "production"
            }
    
    @staticmethod
    def parse_webhook_notification(payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa uma notificação de webhook do PagBank
        
        Args:
            payload: Payload JSON recebido do webhook
        
        Returns:
            Dict com informações extraídas do webhook
        """
        try:
            # O PagBank pode enviar diferentes tipos de notificação
            notification_type = payload.get("notificationType") or payload.get("type", "")
            reference_id = payload.get("reference") or payload.get("reference_id")
            
            # Extrair informações de pagamento
            charges = payload.get("charges", [])
            paid_charge = None
            for charge in charges:
                if charge.get("status") in ["PAID", "AUTHORIZED"]:
                    paid_charge = charge
                    break
            
            is_paid = paid_charge is not None
            
            return {
                "notification_type": notification_type,
                "reference_id": reference_id,
                "is_paid": is_paid,
                "charge_id": paid_charge.get("id") if paid_charge else None,
                "payment_method": paid_charge.get("payment_method", {}).get("type") if paid_charge else None,
                "paid_at": paid_charge.get("paid_at") if paid_charge else None,
                "raw_payload": payload
            }
        except Exception as e:
            logger.error(f"[PagBank] Erro ao parsear webhook: {e}")
            return {
                "notification_type": "error",
                "error": str(e),
                "raw_payload": payload
            }
