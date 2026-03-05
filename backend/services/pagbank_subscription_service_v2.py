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
    
    # URLs das APIs (base URL correta para API de Assinaturas)
    SANDBOX_URL = "https://sandbox.api.assinaturas.pagseguro.com"
    PRODUCTION_URL = "https://api.assinaturas.pagseguro.com"
    
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
        Gera/Obtém uma chave pública para criptografia de cartões em pagamentos recorrentes
        
        Primeiro tenta consultar a chave existente (GET /public-keys)
        Se não existir, cria uma nova (PUT /public-keys)
        
        Docs: 
        - GET: https://developer.pagbank.com.br/reference/consultar-chave-publica-pagamento-recorrente
        - PUT: https://developer.pagbank.com.br/reference/criar-chave-publica-pagamento-recorrente
        
        Returns:
            Dict com a chave pública gerada
        """
        if not self.bearer_token:
            return {"success": False, "error": "Token Bearer não configurado"}
        
        try:
            url = f"{self.base_url}/public-keys"
            
            # Primeiro, tentar CONSULTAR a chave existente (GET)
            logger.info(f"[PagBank] Consultando chave pública existente...")
            logger.info(f"[PagBank] URL: {url}")
            logger.info(f"[PagBank] Método: GET")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self.headers)
            
            logger.info(f"[PagBank] GET Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                public_key = data.get("public_key")
                
                if public_key:
                    logger.info(f"[PagBank] ✅ Chave pública existente encontrada: {public_key[:30]}...")
                    return {
                        "success": True,
                        "public_key": public_key,
                        "created_at": data.get("created_at"),
                        "raw_response": data
                    }
            
            # Se GET falhou ou não tem chave, tentar CRIAR (PUT)
            logger.info(f"[PagBank] Chave não encontrada, criando nova...")
            logger.info(f"[PagBank] URL: {url}")
            logger.info(f"[PagBank] Método: PUT")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.put(url, headers=self.headers)
            
            logger.info(f"[PagBank] PUT Status: {response.status_code}")
            logger.info(f"[PagBank] Response: {response.text[:300]}..." if response.text else "[PagBank] Response vazia")
            
            if response.status_code in [200, 201]:
                data = response.json()
                public_key = data.get("public_key")
                
                logger.info(f"[PagBank] ✅ Chave pública criada com sucesso: {public_key[:30] if public_key else 'N/A'}...")
                
                return {
                    "success": True,
                    "public_key": public_key,
                    "created_at": data.get("created_at"),
                    "raw_response": data
                }
            else:
                error_data = response.json() if response.content else {}
                error_messages = error_data.get("error_messages", [])
                error_msg = error_messages[0].get("description", f"HTTP {response.status_code}") if error_messages else error_data.get("message", f"HTTP {response.status_code}")
                
                # Log detalhado do erro
                logger.error(f"[PagBank] ❌ ERRO {response.status_code} ao gerar chave pública")
                logger.error(f"[PagBank] Token usado: {self.bearer_token[:15]}...{self.bearer_token[-10:]}")
                logger.error(f"[PagBank] Ambiente: {'SANDBOX' if self.is_sandbox else 'PRODUÇÃO'}")
                logger.error(f"[PagBank] URL: {url}")
                logger.error(f"[PagBank] Resposta completa: {response.text}")
                
                # Mensagem específica para erro 401
                if response.status_code == 401:
                    return {
                        "success": False,
                        "error": "Token Bearer inválido ou expirado. Verifique se o token está correto para o ambiente Sandbox.",
                        "error_code": response.status_code,
                        "raw_response": error_data
                    }
                
                # Mensagem específica para erro 403
                if response.status_code == 403:
                    return {
                        "success": False,
                        "error": "Conta não autorizada para pagamentos recorrentes. A aprovação pode estar pendente no PagBank. Entre em contato com o suporte do PagBank.",
                        "error_code": response.status_code,
                        "error_detail": error_data.get("message", "merchant_unauthorized"),
                        "raw_response": error_data
                    }
                
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
            # Payload conforme documentação oficial PagBank
            # https://developer.pagbank.com.br/reference/criar-plano
            payload = {
                "reference_id": reference_id,
                "name": name[:65],  # Max 65 caracteres
                "description": description[:250] if description else None,  # Max 250 caracteres
                "amount": {
                    "value": amount,  # Valor em centavos (ex: 4990 para R$ 49,90)
                    "currency": "BRL"  # Obrigatório
                },
                "interval": {
                    "unit": interval,  # MONTH, YEAR, DAY
                    "length": interval_count  # Default: 1
                },
                "trial": {
                    "enabled": False,  # Sem período de teste
                    "hold_setup_fee": False
                },
                "payment_method": ["CREDIT_CARD"],  # Métodos aceitos
                "editable": True  # Plano pode ser editado após criação
            }
            
            # Remover description se for None
            if not description:
                del payload["description"]
            
            logger.info(f"[PagBank] Criando plano: {name}, valor=R$ {amount/100:.2f}")
            logger.info(f"[PagBank] Payload: {payload}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/plans",  # ✅ Endpoint correto: /plans
                    json=payload,
                    headers=self.headers
                )
            
            if response.status_code in [200, 201]:
                data = response.json()
                
                # Resposta da API /plans retorna "id", "reference_id", etc
                plan_id = data.get("id")
                
                logger.info(f"[PagBank] Plano criado com sucesso: id={plan_id}")
                
                return {
                    "success": True,
                    "plan_id": plan_id,
                    "plan_code": plan_id,  # Para compatibilidade
                    "reference_id": data.get("reference_id"),
                    "created_at": data.get("created_at"),
                    "raw_response": data
                }
            else:
                # Tentar parsear JSON da resposta de erro
                try:
                    error_data = response.json() if response.content else {}
                    
                    # Estrutura de erro do PagBank pode variar
                    if "error_messages" in error_data:
                        error_msg = error_data["error_messages"][0].get("description", f"HTTP {response.status_code}")
                    elif "message" in error_data:
                        error_msg = error_data["message"]
                    else:
                        error_msg = f"HTTP {response.status_code}"
                except:
                    error_data = {"raw": response.text}
                    error_msg = f"HTTP {response.status_code}"
                
                logger.error(f"[PagBank] Erro ao criar plano: {response.status_code}")
                logger.error(f"[PagBank] Response: {response.text}")
                
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
        encrypted_card: str,
        security_code: str,  # CVV separado!
        pro_rata: bool = False
    ) -> Dict[str, Any]:
        """
        Cria uma assinatura para um cliente
        
        ESTRUTURA CORRETA PAGBANK (2024/2025):
        - customer.billing_info: contém o cartão criptografado
        - payment_method: array de objetos com type e card.security_code
        
        Args:
            reference_id: Identificador externo da assinatura
            plan_id: ID do plano no PagBank
            customer_data: Dados do cliente (com billing_info contendo encrypted_card)
            encrypted_card: Cartão criptografado (já deve estar em customer_data.billing_info)
            security_code: CVV do cartão (vai em payment_method.card.security_code)
            pro_rata: Se deve aplicar proporcionalidade
        
        Returns:
            Dict com success, subscription_id, etc
        """
        if not self.bearer_token:
            return {"success": False, "error": "Token Bearer não configurado"}
        
        try:
            # Payload da assinatura conforme documentação oficial PagBank
            # ESTRUTURA CORRETA:
            # - billing_info com encrypted vai em CUSTOMER
            # - security_code vai em PAYMENT_METHOD
            payload = {
                "reference_id": reference_id,
                "plan": {
                    "id": plan_id
                },
                "customer": customer_data,  # Contém billing_info com encrypted card
                "payment_method": [{
                    "type": "CREDIT_CARD",
                    "card": {
                        "security_code": security_code  # CVV separado!
                    }
                }],
                "pro_rata": pro_rata
            }
            
            logger.info(f"[PagBank] Criando assinatura: customer={customer_data.get('email')}, plan={plan_id}")
            logger.info(f"[PagBank] Payload enviado: {payload}")
            
            # Converter para JSON válido explicitamente
            import json
            payload_json = json.dumps(payload, ensure_ascii=False)
            logger.info(f"[PagBank] JSON válido: {payload_json}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/subscriptions",
                    content=payload_json,
                    headers=self.headers
                )
            
            logger.info(f"[PagBank] Status Code: {response.status_code}")
            logger.info(f"[PagBank] Response: {response.text}")
            
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
    
    async def list_plans(self, offset: int = 0, limit: int = 100) -> Dict[str, Any]:
        """
        Lista todos os planos criados no PagBank
        
        Endpoint: GET /plans
        Docs: https://developer.pagbank.com.br/reference/listar-planos
        
        Args:
            offset: Página (offset)
            limit: Quantidade por página
        
        Returns:
            Dict com lista de planos do PagBank
        """
        if not self.bearer_token:
            return {"success": False, "error": "Token Bearer não configurado"}
        
        try:
            params = {
                "offset": offset,
                "limit": limit
            }
            
            logger.info(f"[PagBank] Listando planos: offset={offset}, limit={limit}")
            logger.info(f"[PagBank] URL: {self.base_url}/plans")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/plans",
                    params=params,
                    headers=self.headers
                )
            
            logger.info(f"[PagBank] Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                plans = data.get("plans", [])
                
                logger.info(f"[PagBank] Encontrados {len(plans)} planos")
                
                return {
                    "success": True,
                    "plans": plans,
                    "total": len(plans),
                    "raw_response": data
                }
            else:
                error_data = response.json() if response.content else {}
                error_msg = "Erro ao listar planos"
                
                if "error_messages" in error_data:
                    error_msg = error_data["error_messages"][0].get("description", error_msg)
                
                logger.error(f"[PagBank] Erro ao listar planos: {response.status_code} - {response.text}")
                
                return {
                    "success": False,
                    "error": error_msg,
                    "error_code": response.status_code,
                    "raw_response": error_data
                }
                
        except Exception as e:
            logger.error(f"[PagBank] Exceção ao listar planos: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_plan(self, plan_id: str) -> Dict[str, Any]:
        """
        Consulta um plano específico pelo ID
        
        Endpoint: GET /plans/{plan_id}
        Docs: https://developer.pagbank.com.br/reference/consultar-por-id
        
        Args:
            plan_id: ID do plano no PagBank (formato PLAN_XXXXXXXX-...)
        
        Returns:
            Dict com dados do plano
        """
        if not self.bearer_token:
            return {"success": False, "error": "Token Bearer não configurado"}
        
        try:
            logger.info(f"[PagBank] Consultando plano: {plan_id}")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/plans/{plan_id}",
                    headers=self.headers
                )
            
            if response.status_code == 200:
                data = response.json()
                
                return {
                    "success": True,
                    "plan": data,
                    "raw_response": data
                }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}",
                    "raw_response": response.json() if response.content else {}
                }
                
        except Exception as e:
            logger.error(f"[PagBank] Erro ao consultar plano: {e}")
            return {"success": False, "error": str(e)}
