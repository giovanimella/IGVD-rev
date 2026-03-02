#!/usr/bin/env python3
"""
Backend Test Script - Test das correções específicas
Testa as correções solicitadas:
1. GET /api/training/my-registration - Deve retornar config (não null) mesmo se não existir no banco
2. POST /api/sales/register - Registrar uma venda com dados completos  
3. GET /api/sales/my-progress - Deve funcionar (foi movida antes das rotas dinâmicas)

Credenciais: test.licensee@ozoxx.com / test123
"""
import asyncio
import aiohttp
import json
import os
from datetime import datetime
import sys

# Configurações
BACKEND_URL = "https://checkout-revamp-10.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Credenciais do teste
TEST_EMAIL = "test.licensee@ozoxx.com"
TEST_PASSWORD = "test123"

class BackendTester:
    def __init__(self):
        self.session = None
        self.auth_token = None
        self.passed_tests = 0
        self.total_tests = 0
        
    async def setup(self):
        """Setup da sessão HTTP"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup(self):
        """Cleanup da sessão HTTP"""
        if self.session:
            await self.session.close()
    
    async def login(self):
        """Autentica o usuário de teste"""
        print("🔐 Fazendo login com credenciais do licenciado...")
        
        try:
            async with self.session.post(f"{API_BASE}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    self.auth_token = data.get("access_token")
                    if self.auth_token:
                        print("✅ Login realizado com sucesso")
                        return True
                    else:
                        print("❌ Login falhou: token não retornado")
                        return False
                else:
                    error_text = await resp.text()
                    print(f"❌ Login falhou ({resp.status}): {error_text}")
                    return False
        except Exception as e:
            print(f"❌ Erro no login: {e}")
            return False
    
    def get_auth_headers(self):
        """Retorna headers com autenticação"""
        if not self.auth_token:
            return {}
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    async def test_training_my_registration(self):
        """
        Testa GET /api/training/my-registration
        Deve retornar config (não null) mesmo se não existir no banco
        """
        self.total_tests += 1
        print("\n📋 Testando GET /api/training/my-registration...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/training/my-registration",
                headers=self.get_auth_headers()
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Verificar se retorna config
                    config = data.get("config")
                    if config is None:
                        print("❌ FALHA: config está null")
                        return False
                    
                    # Verificar campos obrigatórios da config
                    required_fields = [
                        "days_before_closing", "terms_and_conditions", 
                        "training_instructions", "solo_price", "couple_price"
                    ]
                    
                    for field in required_fields:
                        if field not in config:
                            print(f"❌ FALHA: campo {field} não encontrado na config")
                            return False
                    
                    print("✅ SUCESSO: config retornada com todos os campos necessários")
                    print(f"   - solo_price: R$ {config.get('solo_price')}")
                    print(f"   - couple_price: R$ {config.get('couple_price')}")
                    print(f"   - days_before_closing: {config.get('days_before_closing')} dias")
                    
                    registration = data.get("registration")
                    if registration:
                        print(f"   - registration: Usuário já tem inscrição existente")
                    else:
                        print(f"   - registration: null (usuário não inscrito)")
                    
                    self.passed_tests += 1
                    return True
                else:
                    error_text = await resp.text()
                    print(f"❌ FALHA ({resp.status}): {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ ERRO na requisição: {e}")
            return False
    
    async def test_sales_register(self):
        """
        Testa POST /api/sales/register
        Deve registrar uma venda com dados completos
        """
        self.total_tests += 1
        print("\n💰 Testando POST /api/sales/register...")
        
        # Dados realistas de uma venda
        sale_data = {
            "sale_number": 1,
            "customer_name": "Maria Silva Santos",
            "customer_phone": "(11) 98765-4321",
            "customer_email": "maria.silva@email.com",
            "customer_cpf": "12345678901",
            "device_serial": "DEV001234567",
            "device_source": "store",
            "sale_value": 299.90
        }
        
        try:
            async with self.session.post(
                f"{API_BASE}/sales/register",
                json=sale_data,
                headers=self.get_auth_headers()
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Verificar resposta
                    if "message" not in data:
                        print("❌ FALHA: campo 'message' não encontrado na resposta")
                        return False
                    
                    sale = data.get("sale")
                    if not sale:
                        print("❌ FALHA: dados da venda não retornados")
                        return False
                    
                    # Verificar campos da venda
                    required_fields = [
                        "id", "user_id", "sale_number", "customer_name",
                        "customer_phone", "customer_email", "customer_cpf",
                        "device_serial", "device_source", "sale_value", "status"
                    ]
                    
                    for field in required_fields:
                        if field not in sale:
                            print(f"❌ FALHA: campo {field} não encontrado na venda")
                            return False
                    
                    print("✅ SUCESSO: Venda registrada com todos os campos necessários")
                    print(f"   - Sale ID: {sale.get('id')}")
                    print(f"   - Cliente: {sale.get('customer_name')}")
                    print(f"   - Valor: R$ {sale.get('sale_value')}")
                    print(f"   - Status: {sale.get('status')}")
                    
                    checkout_url = data.get("checkout_url")
                    if checkout_url:
                        print(f"   - Checkout URL: Gerada com sucesso")
                    else:
                        print(f"   - Checkout URL: Não gerada (esperado se PagSeguro não configurado)")
                    
                    self.passed_tests += 1
                    return True
                    
                elif resp.status == 400:
                    error_text = await resp.text()
                    if "Já existe uma venda" in error_text:
                        print("✅ SUCESSO: Endpoint funcionando (venda duplicada detectada corretamente)")
                        self.passed_tests += 1
                        return True
                    else:
                        print(f"❌ FALHA - Erro 400 inesperado: {error_text}")
                        return False
                else:
                    error_text = await resp.text()
                    print(f"❌ FALHA ({resp.status}): {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ ERRO na requisição: {e}")
            return False
    
    async def test_sales_my_progress(self):
        """
        Testa GET /api/sales/my-progress
        Deve funcionar (foi movida antes das rotas dinâmicas)
        """
        self.total_tests += 1
        print("\n📊 Testando GET /api/sales/my-progress...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/sales/my-progress",
                headers=self.get_auth_headers()
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Verificar campos obrigatórios
                    if "completed" not in data:
                        print("❌ FALHA: campo 'completed' não encontrado")
                        return False
                    
                    if "total" not in data:
                        print("❌ FALHA: campo 'total' não encontrado")
                        return False
                    
                    completed = data.get("completed")
                    total = data.get("total")
                    
                    if total != 5:
                        print(f"❌ FALHA: total deve ser 5, mas retornou {total}")
                        return False
                    
                    if not isinstance(completed, int) or completed < 0:
                        print(f"❌ FALHA: completed deve ser um inteiro >= 0, mas retornou {completed}")
                        return False
                    
                    print("✅ SUCESSO: Endpoint /my-progress funcionando corretamente")
                    print(f"   - Vendas completadas: {completed}")
                    print(f"   - Total necessário: {total}")
                    print(f"   - Progresso: {completed}/{total} ({(completed/total)*100:.1f}%)")
                    
                    self.passed_tests += 1
                    return True
                else:
                    error_text = await resp.text()
                    print(f"❌ FALHA ({resp.status}): {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ ERRO na requisição: {e}")
            return False
    
    async def test_sales_my_sales_bonus(self):
        """
        Teste bônus: Verificar GET /api/sales/my-sales também funciona
        """
        self.total_tests += 1
        print("\n🎯 Testando GET /api/sales/my-sales (teste bônus)...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/sales/my-sales",
                headers=self.get_auth_headers()
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Verificar estrutura da resposta
                    required_fields = ["sales", "total_sales", "completed_sales", "pending_sales", "remaining_sales"]
                    for field in required_fields:
                        if field not in data:
                            print(f"❌ FALHA: campo {field} não encontrado")
                            return False
                    
                    sales = data.get("sales", [])
                    total_sales = data.get("total_sales")
                    
                    print("✅ SUCESSO: Endpoint /my-sales funcionando corretamente")
                    print(f"   - Total de vendas: {total_sales}")
                    print(f"   - Vendas completadas: {data.get('completed_sales')}")
                    print(f"   - Vendas pendentes: {data.get('pending_sales')}")
                    print(f"   - Vendas restantes: {data.get('remaining_sales')}")
                    
                    if sales:
                        print(f"   - Primeira venda: {sales[0].get('customer_name')} - R$ {sales[0].get('sale_value')}")
                    
                    self.passed_tests += 1
                    return True
                else:
                    error_text = await resp.text()
                    print(f"❌ FALHA ({resp.status}): {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ ERRO na requisição: {e}")
            return False
    
    async def run_all_tests(self):
        """Executa todos os testes"""
        print("🚀 Iniciando testes das correções específicas...")
        print(f"📍 Backend URL: {BACKEND_URL}")
        print(f"👤 Usuário: {TEST_EMAIL}")
        print("="*60)
        
        # Setup
        await self.setup()
        
        try:
            # Login
            if not await self.login():
                print("💥 Não foi possível fazer login. Abortando testes.")
                return
            
            # Executar testes principais
            await self.test_training_my_registration()
            await self.test_sales_register()
            await self.test_sales_my_progress()
            
            # Teste bônus
            await self.test_sales_my_sales_bonus()
            
            # Relatório final
            print("\n" + "="*60)
            print("📊 RELATÓRIO FINAL DOS TESTES")
            print("="*60)
            print(f"✅ Testes passaram: {self.passed_tests}/{self.total_tests}")
            print(f"❌ Testes falharam: {self.total_tests - self.passed_tests}/{self.total_tests}")
            
            if self.passed_tests == self.total_tests:
                print("🎉 TODOS OS TESTES PASSARAM! As correções estão funcionando.")
            else:
                print("⚠️  ALGUNS TESTES FALHARAM. Verificar problemas acima.")
            
            success_rate = (self.passed_tests / self.total_tests) * 100
            print(f"📈 Taxa de sucesso: {success_rate:.1f}%")
            
        finally:
            await self.cleanup()

async def main():
    """Função principal"""
    tester = BackendTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Testes interrompidos pelo usuário")
    except Exception as e:
        print(f"\n💥 Erro fatal: {e}")