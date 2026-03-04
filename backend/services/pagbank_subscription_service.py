"""
Serviço de integração com PagBank - API de Assinaturas (Pagamento Recorrente)
Documentação: https://developer.pagbank.com.br/docs/pagamento-recorrente
Base URL Produção: https://api.assinaturas.pagseguro.com
Base URL Sandbox: https://sandbox.api.pagseguro.com/recurring-payments
"""
import httpx
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import uuid

logger = logging.getLogger(__name__)


class PagBankSubscriptionService:
    """Serviço de integração com PagBank - API de Assinaturas"""
    
    # URLs das APIs
    SANDBOX_URL = "https://sandbox.api.pagseguro.com/recurring-payments"
    PRODUCTION_URL = "https://api.assinaturas.pagseguro.com"
    
    def __init__(self, token: str, email: str = None, is_sandbox: bool = True):
        """
        Inicializa o serviço PagBank Subscriptions
        
        Args:
            token: Token de autenticação específico para API de Assinaturas
            email: Email da conta (para referência)
            is_sandbox: Se True, usa ambiente de teste
        """
        self.token = token
        self.email = email
        self.is_sandbox = is_sandbox
        self.base_url = self.SANDBOX_URL if is_sandbox else self.PRODUCTION_URL
        
        # Headers para requisições
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    async def test_connection(self) -> Dict[str, Any]:
        """
        Testa a conexão com a API de Assinaturas
        
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
            # Tentar listar planos para testar autenticação
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/plans",
                    headers=self.headers
                )
            
            if response.status_code == 200:
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
                    "error": "Token sem permissão para API de Assinaturas",
                    "environment": "sandbox" if self.is_sandbox else "production"
                }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "environment": "sandbox" if self.is_sandbox else "production"
                }
                
        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "Timeout na comunicação com PagBank"
            }
        except Exception as e:
            logger.error(f"[PagBank Subscriptions] Erro ao testar conexão: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def create_plan(
        self,
        name: str,
        description: str,
        amount: float,
        period: str = "MONTHLY",
        trial_days: int = 0
    ) -> Dict[str, Any]:
        """
        Cria um plano de assinatura no PagBank
        
        Args:
            name: Nome do plano
            description: Descrição do plano
            amount: Valor mensal em reais
            period: Período de cobrança (MONTHLY, YEARLY, etc)
            trial_days: Dias de teste gratuito
        
        Returns:
            Dict com success, plan_id, etc
        """
        if not self.token:
            return {"success": False, "error": "Token não configurado"}
        
        try:
            # Converter valor para centavos
            amount_cents = int(amount * 100)
            
            # Payload do plano
            payload = {
                "reference": f"plan_{uuid.uuid4().hex[:12]}",
                "name": name[:50],
                "description": description[:255],
                "amount": amount_cents,
                "period": period,
                "trial": {
                    "enabled": trial_days > 0,
                    "days": trial_days
                }
            }
            
            logger.info(f"[PagBank] Criando plano: {name}, valor={amount}")
            
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
                    "plan_code": data.get("code"),
                    "reference": data.get("reference"),
                    "raw_response": data
                }
            else:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("error", {}).get("message", f"HTTP {response.status_code}")
                
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
        plan_id: str,
        customer_name: str,
        customer_email: str,
        customer_cpf: str,
        customer_phone: str,
        billing_address: Dict[str, str],
        card_token: str,
        card_holder_name: str,
        card_holder_cpf: str,
        card_holder_birth_date: str,
        reference_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Cria uma assinatura para um cliente
        
        Args:
            plan_id: ID do plano no PagBank
            customer_name: Nome do cliente
            customer_email: Email do cliente
            customer_cpf: CPF (apenas números)
            customer_phone: Telefone com DDD
            billing_address: Endereço de cobrança
            card_token: Token do cartão gerado no frontend
            card_holder_name: Nome do titular do cartão
            card_holder_cpf: CPF do titular
            card_holder_birth_date: Data nascimento (YYYY-MM-DD)
            reference_id: ID de referência interno
        
        Returns:
            Dict com success, subscription_id, etc
        """
        if not self.token:
            return {"success": False, "error": "Token não configurado"}
        
        try:
            # Limpar CPF (apenas números)
            cpf_clean = ''.join(filter(str.isdigit, customer_cpf))
            holder_cpf_clean = ''.join(filter(str.isdigit, card_holder_cpf))
            phone_clean = ''.join(filter(str.isdigit, customer_phone))
            
            # DDD e número
            area_code = phone_clean[:2] if len(phone_clean) >= 10 else "11"
            phone_number = phone_clean[2:] if len(phone_clean) >= 10 else phone_clean
            
            # Payload da assinatura
            payload = {
                "reference": reference_id or f"sub_{uuid.uuid4().hex[:12]}",
                "plan": plan_id,
                "customer": {
                    "name": customer_name[:50],
                    "email": customer_email,
                    "tax_id": cpf_clean,
                    "phone": {
                        "area_code": area_code,
                        "number": phone_number
                    },
                    "address": {
                        "street": billing_address.get("street", "")[:80],
                        "number": billing_address.get("number", "")[:20],
                        "complement": billing_address.get("complement", "")[:40],
                        "district": billing_address.get("district", "")[:60],
                        "city": billing_address.get("city", "")[:60],
                        "state": billing_address.get("state", "")[:2],
                        "postal_code": ''.join(filter(str.isdigit, billing_address.get("zipcode", "")))
                    }
                },
                "payment_method": {
                    "type": "CREDIT_CARD",
                    "card": {
                        "token": card_token,
                        "holder": {
                            "name": card_holder_name[:50],
                            "tax_id": holder_cpf_clean,
                            "birth_date": card_holder_birth_date  # YYYY-MM-DD
                        }
                    }
                }
            }
            
            logger.info(f"[PagBank] Criando assinatura: customer={customer_email}, plan={plan_id}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/subscriptions",
                    json=payload,
                    headers=self.headers
                )
            
            if response.status_code in [200, 201]:
                data = response.json()
                
                # Extrair informações do cartão
                card_info = data.get("payment_method", {}).get("card", {})
                
                logger.info(f"[PagBank] Assinatura criada: id={data.get('id')}")
                
                return {
                    "success": True,
                    "subscription_id": data.get("id"),
                    "subscription_code": data.get("code"),
                    "status": data.get("status"),
                    "next_billing_date": data.get("next_billing_date"),
                    "card_last_digits": card_info.get("last_digits"),
                    "card_brand": card_info.get("brand"),
                    "raw_response": data
                }
            else:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("error", {}).get("message", f"HTTP {response.status_code}")
                
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
            subscription_id: ID da assinatura no PagBank
        
        Returns:
            Dict com dados da assinatura
        """
        if not self.token:
            return {"success": False, "error": "Token não configurado"}
        
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
                    "next_billing_date": data.get("next_billing_date")
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
        if not self.token:
            return {"success": False, "error": "Token não configurado"}
        
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
    
    async def update_payment_method(
        self,
        subscription_id: str,
        card_token: str,
        card_holder_name: str,
        card_holder_cpf: str,
        card_holder_birth_date: str
    ) -> Dict[str, Any]:
        """
        Atualiza o método de pagamento de uma assinatura
        
        Args:
            subscription_id: ID da assinatura
            card_token: Novo token do cartão
            card_holder_name: Nome do titular
            card_holder_cpf: CPF do titular
            card_holder_birth_date: Data nascimento (YYYY-MM-DD)
        
        Returns:
            Dict com success
        """
        if not self.token:
            return {"success": False, "error": "Token não configurado"}
        
        try:
            holder_cpf_clean = ''.join(filter(str.isdigit, card_holder_cpf))
            
            payload = {
                "payment_method": {
                    "type": "CREDIT_CARD",
                    "card": {
                        "token": card_token,
                        "holder": {
                            "name": card_holder_name[:50],
                            "tax_id": holder_cpf_clean,
                            "birth_date": card_holder_birth_date
                        }
                    }
                }
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.put(
                    f"{self.base_url}/subscriptions/{subscription_id}/payment-method",
                    json=payload,
                    headers=self.headers
                )
            
            if response.status_code in [200, 204]:
                logger.info(f"[PagBank] Método de pagamento atualizado: {subscription_id}")
                return {
                    "success": True,
                    "message": "Método de pagamento atualizado"
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "raw_response": error_data
                }
                
        except Exception as e:
            logger.error(f"[PagBank] Erro ao atualizar método: {e}")
            return {"success": False, "error": str(e)}
