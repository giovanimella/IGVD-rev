"""
Serviço de integração com PagBank - API de Assinaturas (Pagamento Recorrente)
Documentação: https://developer.pagbank.com.br/docs/pagamentos-recorrentes
Atualizado conforme documentação oficial 2024/2025

IMPORTANTE: 
- Usa CHAVE PÚBLICA para autenticação (Bearer token)
- Criptografia de cartão feita no frontend via SDK
- URL Produção: https://api.assinaturas.pagseguro.com
- URL Sandbox: https://sandbox.api.assinaturas.pagseguro.com
"""
import httpx
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


class PagBankSubscriptionService:
    """Serviço de integração com PagBank - API de Assinaturas"""
    
    # URLs das APIs
    SANDBOX_URL = "https://sandbox.api.pagseguro.com"
    PRODUCTION_URL = "https://api.pagseguro.com"
    
    def __init__(self, bearer_token: str = None, is_sandbox: bool = True):
        """
        Inicializa o serviço PagBank Subscriptions
        
        Args:
            bearer_token: Token Bearer para autenticação
            is_sandbox: Se True, usa ambiente de teste
        """
        self.bearer_token = bearer_token
        self.is_sandbox = is_sandbox
        self.base_url = self.SANDBOX_URL if is_sandbox else self.PRODUCTION_URL
        
        # Headers para requisições
        self.headers = {
            "Authorization": f"Bearer {bearer_token}" if bearer_token else "",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    async def generate_public_key(self) -> Dict[str, Any]:
        """
        Gera uma chave pública para criptografia de cartões
        Esta chave é usada no frontend para criptografar dados de cartão antes de enviar ao backend
        
        Endpoint: POST /public-keys
        Body: {"type": "card"}
        
        Returns:
            Dict com a chave pública gerada
        """
        if not self.bearer_token:
            return {"success": False, "error": "Token Bearer não configurado"}
        
        try:
            payload = {"type": "card"}
            
            logger.info(f"[PagBank] Gerando chave pública para criptografia de cartões")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/public-keys",
                    json=payload,
                    headers=self.headers
                )
            
            if response.status_code in [200, 201]:
                data = response.json()
                public_key = data.get("public_key")
                
                logger.info(f"[PagBank] Chave pública gerada com sucesso: {public_key[:20]}...")
                
                return {
                    "success": True,
                    "public_key": public_key,
                    "created_at": data.get("created_at"),
                    "raw_response": data
                }
            else:
                error_data = response.json() if response.content else {}
                error_messages = error_data.get("error_messages", [])
                error_msg = error_messages[0].get("description", f"HTTP {response.status_code}") if error_messages else f"HTTP {response.status_code}"
                
                logger.error(f"[PagBank] Erro ao gerar chave pública: {response.status_code} - {response.text}")
                
                return {
                    "success": False,
                    "error": error_msg,
                    "error_code": response.status_code,
                    "raw_response": error_data
                }
                
        except Exception as e:
            logger.error(f"[PagBank] Exceção ao gerar chave pública: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_public_key(self, token: str) -> Dict[str, Any]:
        """
        DEPRECATED: Use generate_public_key() instead
        Mantido para compatibilidade
        """
        return await self.generate_public_key()
    
    async def test_connection(self) -> Dict[str, Any]:
        """
        Testa a conexão com a API
        
        Returns:
            Dict com success e detalhes do teste
        """
        if not self.bearer_token:
            return {
                "success": False,
                "error": "Token Bearer não configurado",
                "environment": "sandbox" if self.is_sandbox else "production"
            }
        
        try:
            # Tentar gerar uma chave pública para testar autenticação
            result = await self.generate_public_key()
            
            if result.get("success"):
                return {
                    "success": True,
                    "message": "Conexão estabelecida com sucesso",
                    "environment": "sandbox" if self.is_sandbox else "production",
                    "api_url": self.base_url,
                    "public_key_generated": True
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error", "Erro ao testar conexão"),
                    "environment": "sandbox" if self.is_sandbox else "production"
                }
                
        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "Timeout na comunicação com PagBank"
            }
        except Exception as e:
            logger.error(f"[PagBank] Erro ao testar conexão: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def create_plan(
        self,
        reference_id: str,
        name: str,
        description: str,
        amount: int,  # Valor em centavos
        interval: str = "MONTH",
        interval_count: int = 1
    ) -> Dict[str, Any]:
        """
        Cria um plano de assinatura no PagBank
        
        Args:
            reference_id: Identificador externo do plano
            name: Nome do plano
            description: Descrição do plano
            amount: Valor em centavos (ex: 4990 para R$ 49,90)
            interval: Intervalo de cobrança (MONTH, YEAR, DAY, WEEK)
            interval_count: Quantidade de intervalos
        
        Returns:
            Dict com success, plan_id, etc
        """
        if not self.bearer_token:
            return {"success": False, "error": "Token Bearer não configurado"}
        
        try:
            # Payload do plano conforme documentação oficial
            payload = {
                "reference_id": reference_id,
                "name": name[:50],
                "description": description[:255],
                "amount": {
                    "value": amount,
                    "currency": "BRL"
                },
                "interval": {
                    "unit": interval,
                    "length": interval_count
                }
            }
            
            logger.info(f"[PagBank] Criando plano: {name}, valor={amount/100:.2f}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/plans",
                    json=payload,
                    headers=self.headers
                )
            
            if response.status_code in [200, 201]:
                data = response.json()
                
                logger.info(f"[PagBank] Plano criado: id={data.get('id')}")
                
                return {
                    "success": True,
                    "plan_id": data.get("id"),
                    "reference_id": data.get("reference_id"),
                    "raw_response": data
                }
            else:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("error_messages", [{}])[0].get("description", f"HTTP {response.status_code}")
                
                logger.error(f"[PagBank] Erro ao criar plano: {response.status_code} - {response.text}")
                
                return {
                    "success": False,
                    "error": error_msg,
                    "error_code": response.status_code,
                    "raw_response": error_data
                }
                
        except Exception as e:
            logger.error(f"[PagBank] Exceção ao criar plano: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_subscription(
        self,
        reference_id: str,
        plan_id: str,
        customer_data: Dict[str, Any],
        encrypted_card: str,  # Cartão criptografado pelo SDK frontend
        card_holder_name: str,
        pro_rata: bool = False
    ) -> Dict[str, Any]:
        """
        Cria uma assinatura para um cliente
        
        Args:
            reference_id: Identificador externo da assinatura
            plan_id: ID do plano no PagBank
            customer_data: Dados do cliente (conforme estrutura oficial)
            encrypted_card: Cartão criptografado pelo SDK do PagBank
            card_holder_name: Nome do titular do cartão
            pro_rata: Se deve aplicar proporcionalidade
        
        Returns:
            Dict com success, subscription_id, etc
        """
        if not self.bearer_token:
            return {"success": False, "error": "Token Bearer não configurado"}
        
        try:
            # Payload da assinatura conforme documentação oficial
            payload = {
                "reference_id": reference_id,
                "plan": {
                    "id": plan_id
                },
                "customer": customer_data,  # Já formatado conforme documentação
                "payment_method": [
                    {
                        "type": "CREDIT_CARD",
                        "card": {
                            "encrypted": encrypted_card,  # Cartão criptografado
                            "holder": {
                                "name": card_holder_name
                            }
                        }
                    }
                ],
                "pro_rata": pro_rata
            }
            
            logger.info(f"[PagBank] Criando assinatura: customer={customer_data.get('email')}, plan={plan_id}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/subscriptions",
                    json=payload,
                    headers=self.headers
                )
            
            if response.status_code in [200, 201]:
                data = response.json()
                
                # Extrair informações do cartão
                payment_methods = data.get("payment_method", [])
                card_info = payment_methods[0].get("card", {}) if payment_methods else {}
                
                logger.info(f"[PagBank] Assinatura criada: id={data.get('id')}")
                
                return {
                    "success": True,
                    "subscription_id": data.get("id"),
                    "status": data.get("status"),
                    "next_billing_date": data.get("next_invoice_at"),
                    "card_last_digits": card_info.get("last_digits"),
                    "card_brand": card_info.get("brand"),
                    "card_first_digits": card_info.get("first_digits"),
                    "raw_response": data
                }
            else:
                error_data = response.json() if response.content else {}
                error_messages = error_data.get("error_messages", [])
                error_msg = error_messages[0].get("description", f"HTTP {response.status_code}") if error_messages else f"HTTP {response.status_code}"
                
                logger.error(f"[PagBank] Erro ao criar assinatura: {response.status_code} - {response.text}")
                
                return {
                    "success": False,
                    "error": error_msg,
                    "error_code": response.status_code,
                    "raw_response": error_data
                }
                
        except Exception as e:
            logger.error(f"[PagBank] Exceção ao criar assinatura: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """
        Consulta status de uma assinatura
        
        Args:
            subscription_id: ID da assinatura no PagBank (formato SUBS_XXXXXXXX-...)
        
        Returns:
            Dict com dados da assinatura
        """
        if not self.bearer_token:
            return {"success": False, "error": "Token Bearer não configurado"}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/subscriptions/{subscription_id}",
                    headers=self.headers
                )
            
            if response.status_code == 200:
                data = response.json()
                
                return {
                    "success": True,
                    "subscription": data,
                    "status": data.get("status"),
                    "next_billing_date": data.get("next_invoice_at")
                }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "raw_response": response.json() if response.content else {}
                }
                
        except Exception as e:
            logger.error(f"[PagBank] Erro ao consultar assinatura: {e}")
            return {"success": False, "error": str(e)}
    
    async def cancel_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """
        Cancela uma assinatura
        
        Args:
            subscription_id: ID da assinatura no PagBank
        
        Returns:
            Dict com success
        """
        if not self.bearer_token:
            return {"success": False, "error": "Token Bearer não configurado"}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.put(
                    f"{self.base_url}/subscriptions/{subscription_id}/cancel",
                    headers=self.headers
                )
            
            if response.status_code in [200, 204]:
                logger.info(f"[PagBank] Assinatura cancelada: {subscription_id}")
                return {
                    "success": True,
                    "message": "Assinatura cancelada com sucesso"
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "raw_response": error_data
                }
                
        except Exception as e:
            logger.error(f"[PagBank] Erro ao cancelar assinatura: {e}")
            return {"success": False, "error": str(e)}
    
    async def suspend_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """
        Suspende uma assinatura
        """
        if not self.bearer_token:
            return {"success": False, "error": "Token Bearer não configurado"}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.put(
                    f"{self.base_url}/subscriptions/{subscription_id}/suspend",
                    headers=self.headers
                )
            
            if response.status_code in [200, 204]:
                return {"success": True, "message": "Assinatura suspensa"}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            logger.error(f"[PagBank] Erro ao suspender assinatura: {e}")
            return {"success": False, "error": str(e)}
    
    async def activate_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """
        Ativa uma assinatura suspensa
        """
        if not self.bearer_token:
            return {"success": False, "error": "Token Bearer não configurado"}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.put(
                    f"{self.base_url}/subscriptions/{subscription_id}/activate",
                    headers=self.headers
                )
            
            if response.status_code in [200, 204]:
                return {"success": True, "message": "Assinatura ativada"}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            logger.error(f"[PagBank] Erro ao ativar assinatura: {e}")
            return {"success": False, "error": str(e)}
    
    async def list_invoices(self, subscription_id: str) -> Dict[str, Any]:
        """
        Lista as faturas de uma assinatura
        
        Args:
            subscription_id: ID da assinatura
        
        Returns:
            Dict com lista de faturas
        """
        if not self.bearer_token:
            return {"success": False, "error": "Token Bearer não configurado"}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/subscriptions/{subscription_id}/invoices",
                    headers=self.headers
                )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "invoices": data.get("invoices", []),
                    "raw_response": data
                }
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            logger.error(f"[PagBank] Erro ao listar faturas: {e}")
            return {"success": False, "error": str(e)}
