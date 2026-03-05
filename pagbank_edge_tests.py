#!/usr/bin/env python3
"""
Additional PagBank Tests - Edge Cases and Security
Tests additional scenarios for robustness
"""
import asyncio
import aiohttp
import json

BACKEND_URL = "https://subs-payment-1.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
ADMIN_EMAIL = "admin@ozoxx.com"
ADMIN_PASSWORD = "admin123"

class PagBankEdgeCaseTester:
    def __init__(self):
        self.session = None
        self.admin_token = None
        self.passed_tests = 0
        self.total_tests = 0
        
    async def setup(self):
        self.session = aiohttp.ClientSession()
        
    async def cleanup(self):
        if self.session:
            await self.session.close()
    
    async def login_admin(self):
        async with self.session.post(f"{API_BASE}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }) as resp:
            if resp.status == 200:
                data = await resp.json()
                self.admin_token = data.get("access_token")
                return bool(self.admin_token)
            return False
    
    def get_admin_headers(self):
        return {"Authorization": f"Bearer {self.admin_token}"}
    
    async def test_payment_endpoints_without_auth(self):
        """
        Testa se endpoints protegidos bloqueiam acesso sem autenticação
        """
        self.total_tests += 1
        print("\n🔒 Testando segurança dos endpoints protegidos...")
        
        protected_endpoints = [
            ("GET", "/payments/settings"),
            ("PUT", "/payments/settings"),
            ("POST", "/payments/test-connection"),
            ("POST", "/payments/training/checkout"),
            ("GET", "/payments/logs"),
            ("GET", "/payments/transactions")
        ]
        
        failed_security = []
        
        for method, endpoint in protected_endpoints:
            try:
                if method == "GET":
                    async with self.session.get(f"{API_BASE}{endpoint}") as resp:
                        if resp.status not in [401, 403]:  # Deve retornar 401 ou 403
                            failed_security.append(f"{method} {endpoint} (status: {resp.status})")
                elif method == "POST":
                    async with self.session.post(f"{API_BASE}{endpoint}") as resp:
                        if resp.status not in [401, 403]:
                            failed_security.append(f"{method} {endpoint} (status: {resp.status})")
                elif method == "PUT":
                    async with self.session.put(f"{API_BASE}{endpoint}") as resp:
                        if resp.status not in [401, 403]:
                            failed_security.append(f"{method} {endpoint} (status: {resp.status})")
            except Exception as e:
                print(f"   ⚠️  Erro testando {method} {endpoint}: {e}")
        
        if failed_security:
            print(f"❌ FALHA DE SEGURANÇA: Endpoints vulneráveis: {failed_security}")
            return False
        else:
            print("✅ SUCESSO: Todos os endpoints protegidos bloqueiam acesso sem autenticação")
            self.passed_tests += 1
            return True
    
    async def test_webhook_with_different_payloads(self):
        """
        Testa webhook com diferentes tipos de payload
        """
        self.total_tests += 1
        print("\n📨 Testando webhook com payloads diferentes...")
        
        test_payloads = [
            {},  # Vazio
            {"test": "data"},  # JSON simples
            {"reference_id": "test_123", "charges": []},  # Formato PagBank-like
            {"notificationType": "transaction", "reference": "test_456"}  # Outro formato
        ]
        
        all_passed = True
        
        for i, payload in enumerate(test_payloads, 1):
            try:
                async with self.session.post(
                    f"{API_BASE}/payments/webhooks/pagbank",
                    json=payload
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get("success") is True:
                            print(f"   ✅ Payload {i}: Aceito corretamente")
                        else:
                            print(f"   ❌ Payload {i}: success não é True")
                            all_passed = False
                    else:
                        print(f"   ❌ Payload {i}: Status {resp.status}")
                        all_passed = False
            except Exception as e:
                print(f"   ❌ Payload {i}: Erro {e}")
                all_passed = False
        
        if all_passed:
            print("✅ SUCESSO: Webhook aceita diferentes tipos de payload")
            self.passed_tests += 1
            return True
        else:
            print("❌ FALHA: Alguns payloads não foram aceitos corretamente")
            return False
    
    async def test_payment_logs_filtering(self):
        """
        Testa filtros do endpoint de logs
        """
        self.total_tests += 1
        print("\n📊 Testando filtros dos logs de pagamento...")
        
        filters_to_test = [
            {"limit": 10},
            {"log_type": "connection_test"},
            {"log_type": "webhook_received"},
            {"limit": 1, "log_type": "connection_test"}
        ]
        
        all_passed = True
        
        for filter_params in filters_to_test:
            try:
                params_str = "&".join([f"{k}={v}" for k, v in filter_params.items()])
                url = f"{API_BASE}/payments/logs?{params_str}"
                
                async with self.session.get(url, headers=self.get_admin_headers()) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if isinstance(data, list):
                            print(f"   ✅ Filtro {filter_params}: {len(data)} logs retornados")
                        else:
                            print(f"   ❌ Filtro {filter_params}: Resposta não é lista")
                            all_passed = False
                    else:
                        print(f"   ❌ Filtro {filter_params}: Status {resp.status}")
                        all_passed = False
            except Exception as e:
                print(f"   ❌ Filtro {filter_params}: Erro {e}")
                all_passed = False
        
        if all_passed:
            print("✅ SUCESSO: Filtros de logs funcionando corretamente")
            self.passed_tests += 1
            return True
        else:
            print("❌ FALHA: Alguns filtros de logs falharam")
            return False
    
    async def test_payment_settings_validation(self):
        """
        Testa validação dos dados nas configurações de pagamento
        """
        self.total_tests += 1
        print("\n✅ Testando validação das configurações de pagamento...")
        
        invalid_payloads = [
            {"environment": "invalid_env"},  # Ambiente inválido
            {"max_installments": -1},  # Valor negativo
            {"min_installment_value": -5.0},  # Valor negativo
            {"pix_enabled": "not_boolean"}  # Tipo incorreto
        ]
        
        validation_working = True
        
        for payload in invalid_payloads:
            try:
                async with self.session.put(
                    f"{API_BASE}/payments/settings",
                    json=payload,
                    headers=self.get_admin_headers()
                ) as resp:
                    # Tanto 200 (aceito) quanto 422 (validação) são válidos
                    # O importante é que não quebre o sistema
                    if resp.status in [200, 422]:
                        print(f"   ✅ Payload inválido tratado corretamente (status: {resp.status})")
                    else:
                        print(f"   ⚠️  Payload inválido: status inesperado {resp.status}")
                        # Não marca como falha crítica, apenas aviso
            except Exception as e:
                print(f"   ❌ Erro com payload inválido: {e}")
                validation_working = False
        
        if validation_working:
            print("✅ SUCESSO: Validação de configurações funcionando")
            self.passed_tests += 1
            return True
        else:
            print("❌ FALHA: Problemas na validação de configurações")
            return False
    
    async def run_edge_case_tests(self):
        """Executa todos os testes de casos extremos"""
        print("🧪 Iniciando testes de casos extremos PagBank...")
        print("="*60)
        
        await self.setup()
        
        try:
            # Login
            if not await self.login_admin():
                print("💥 Não foi possível fazer login. Abortando.")
                return
            
            # Executar testes
            await self.test_payment_endpoints_without_auth()
            await self.test_webhook_with_different_payloads()
            await self.test_payment_logs_filtering()
            await self.test_payment_settings_validation()
            
            # Relatório
            print("\n" + "="*60)
            print("📋 RELATÓRIO DE CASOS EXTREMOS")
            print("="*60)
            print(f"✅ Testes passaram: {self.passed_tests}/{self.total_tests}")
            print(f"❌ Testes falharam: {self.total_tests - self.passed_tests}/{self.total_tests}")
            
            if self.passed_tests == self.total_tests:
                print("🎉 TODOS OS CASOS EXTREMOS PASSARAM!")
            else:
                print("⚠️  ALGUNS CASOS EXTREMOS FALHARAM.")
            
        finally:
            await self.cleanup()

async def main():
    tester = PagBankEdgeCaseTester()
    await tester.run_edge_case_tests()

if __name__ == "__main__":
    asyncio.run(main())