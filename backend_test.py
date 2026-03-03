#!/usr/bin/env python3
"""
Backend Test Script - Sales Report Endpoints Testing
Testa os novos endpoints de relatório de vendas:

1. GET /api/sales/report/summary - Resumo geral das vendas (admin)
2. GET /api/sales/report/all - Todas as vendas (admin)
3. GET /api/sales/report/by-month?year=2026&month=3 - Relatório mensal (admin)
4. GET /api/sales/commission-types - Tipos de comissão (admin)

Credenciais: admin@igvd.com.br / admin123
"""
import asyncio
import aiohttp
import json
import os
from datetime import datetime
import sys

# Configurações
BACKEND_URL = "https://pagbank-checkout.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Credenciais do admin
ADMIN_EMAIL = "admin@ozoxx.com"
ADMIN_PASSWORD = "admin123"

class SalesReportTester:
    def __init__(self):
        self.session = None
        self.auth_token = None
        self.passed_tests = 0
        self.total_tests = 0
        self.test_results = []
        
    async def setup(self):
        """Setup da sessão HTTP"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup(self):
        """Cleanup da sessão HTTP"""
        if self.session:
            await self.session.close()
    
    async def login_admin(self):
        """Autentica o usuário admin"""
        print("🔐 Fazendo login como admin...")
        
        try:
            async with self.session.post(f"{API_BASE}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            }) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    self.auth_token = data.get("access_token")
                    if self.auth_token:
                        print("✅ Login admin realizado com sucesso")
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
    
    async def test_sales_report_summary(self):
        """
        Testa GET /api/sales/report/summary
        Deve retornar resumo geral das vendas
        """
        self.total_tests += 1
        test_name = "Sales Report Summary"
        print(f"\n📊 Testando GET /api/sales/report/summary...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/sales/report/summary",
                headers=self.get_auth_headers()
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Verificar campos obrigatórios do resumo
                    required_fields = [
                        "total_sales", "paid_sales", "pending_sales", 
                        "total_amount", "pending_amount", "month_sales",
                        "month_paid", "month_amount", "licensees_with_sales"
                    ]
                    
                    missing_fields = []
                    for field in required_fields:
                        if field not in data:
                            missing_fields.append(field)
                    
                    if missing_fields:
                        print(f"❌ FALHA: Campos obrigatórios não encontrados: {missing_fields}")
                        self.test_results.append({
                            "test": test_name,
                            "status": "FAILED",
                            "error": f"Missing required fields: {missing_fields}"
                        })
                        return False
                    
                    # Verificar tipos de dados
                    numeric_fields = [
                        "total_sales", "paid_sales", "pending_sales", 
                        "total_amount", "pending_amount", "month_sales",
                        "month_paid", "month_amount", "licensees_with_sales"
                    ]
                    
                    for field in numeric_fields:
                        if not isinstance(data.get(field), (int, float)):
                            print(f"❌ FALHA: Campo {field} deve ser numérico, recebido: {type(data.get(field))}")
                            self.test_results.append({
                                "test": test_name,
                                "status": "FAILED",
                                "error": f"Field {field} is not numeric"
                            })
                            return False
                    
                    print("✅ SUCESSO: Resumo de vendas retornado corretamente")
                    print(f"   - Total de vendas: {data.get('total_sales')}")
                    print(f"   - Vendas pagas: {data.get('paid_sales')}")
                    print(f"   - Vendas pendentes: {data.get('pending_sales')}")
                    print(f"   - Valor total: R$ {data.get('total_amount'):.2f}")
                    print(f"   - Vendas do mês: {data.get('month_sales')}")
                    print(f"   - Licenciados com vendas: {data.get('licensees_with_sales')}")
                    
                    self.passed_tests += 1
                    self.test_results.append({
                        "test": test_name,
                        "status": "PASSED",
                        "data": data
                    })
                    return True
                    
                elif resp.status == 403:
                    print("❌ FALHA: Acesso negado - verificar permissões admin")
                    self.test_results.append({
                        "test": test_name,
                        "status": "FAILED",
                        "error": "Access denied - admin permissions required"
                    })
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ FALHA ({resp.status}): {error_text}")
                    self.test_results.append({
                        "test": test_name,
                        "status": "FAILED",
                        "error": f"HTTP {resp.status}: {error_text}"
                    })
                    return False
                    
        except Exception as e:
            print(f"❌ ERRO na requisição: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "FAILED",
                "error": f"Request exception: {e}"
            })
            return False
    
    async def test_sales_report_all(self):
        """
        Testa GET /api/sales/report/all
        Deve retornar lista de vendas e estatísticas
        """
        self.total_tests += 1
        test_name = "All Sales Report"
        print(f"\n📋 Testando GET /api/sales/report/all...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/sales/report/all",
                headers=self.get_auth_headers()
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Verificar estrutura da resposta
                    if "sales" not in data:
                        print("❌ FALHA: Campo 'sales' não encontrado")
                        self.test_results.append({
                            "test": test_name,
                            "status": "FAILED",
                            "error": "Missing 'sales' field in response"
                        })
                        return False
                    
                    if "licensee_stats" not in data:
                        print("❌ FALHA: Campo 'licensee_stats' não encontrado")
                        self.test_results.append({
                            "test": test_name,
                            "status": "FAILED",
                            "error": "Missing 'licensee_stats' field in response"
                        })
                        return False
                    
                    sales = data.get("sales", [])
                    licensee_stats = data.get("licensee_stats", [])
                    
                    print("✅ SUCESSO: Relatório de todas as vendas retornado")
                    print(f"   - Total de vendas encontradas: {len(sales)}")
                    print(f"   - Estatísticas de licenciados: {len(licensee_stats)}")
                    
                    # Verificar estrutura das vendas se existirem
                    if sales:
                        first_sale = sales[0]
                        required_sale_fields = [
                            "id", "user_id", "sale_number", "customer_name", 
                            "customer_email", "sale_value", "status"
                        ]
                        
                        missing_sale_fields = []
                        for field in required_sale_fields:
                            if field not in first_sale:
                                missing_sale_fields.append(field)
                        
                        if missing_sale_fields:
                            print(f"⚠️  Aviso: Campos ausentes na primeira venda: {missing_sale_fields}")
                        else:
                            print(f"   - Primeira venda: {first_sale.get('customer_name')} - R$ {first_sale.get('sale_value')}")
                    
                    # Verificar estrutura das estatísticas se existirem
                    if licensee_stats:
                        first_stat = licensee_stats[0]
                        required_stat_fields = [
                            "user_id", "name", "total_sales", "paid_sales", "total_amount"
                        ]
                        
                        missing_stat_fields = []
                        for field in required_stat_fields:
                            if field not in first_stat:
                                missing_stat_fields.append(field)
                        
                        if missing_stat_fields:
                            print(f"⚠️  Aviso: Campos ausentes na primeira estatística: {missing_stat_fields}")
                        else:
                            print(f"   - Top licenciado: {first_stat.get('name')} - {first_stat.get('paid_sales')} vendas")
                    
                    self.passed_tests += 1
                    self.test_results.append({
                        "test": test_name,
                        "status": "PASSED",
                        "sales_count": len(sales),
                        "stats_count": len(licensee_stats)
                    })
                    return True
                    
                elif resp.status == 403:
                    print("❌ FALHA: Acesso negado - verificar permissões admin")
                    self.test_results.append({
                        "test": test_name,
                        "status": "FAILED",
                        "error": "Access denied - admin permissions required"
                    })
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ FALHA ({resp.status}): {error_text}")
                    self.test_results.append({
                        "test": test_name,
                        "status": "FAILED",
                        "error": f"HTTP {resp.status}: {error_text}"
                    })
                    return False
                    
        except Exception as e:
            print(f"❌ ERRO na requisição: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "FAILED",
                "error": f"Request exception: {e}"
            })
            return False
    
    async def test_monthly_sales_report(self):
        """
        Testa GET /api/sales/report/by-month?year=2026&month=3
        Deve retornar relatório mensal
        """
        self.total_tests += 1
        test_name = "Monthly Sales Report"
        print(f"\n📅 Testando GET /api/sales/report/by-month?year=2026&month=3...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/sales/report/by-month?year=2026&month=3",
                headers=self.get_auth_headers()
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Verificar campos obrigatórios
                    required_fields = [
                        "year", "month", "total_sales", "paid_sales", 
                        "pending_sales", "total_amount", "pending_amount",
                        "sales", "licensee_stats"
                    ]
                    
                    missing_fields = []
                    for field in required_fields:
                        if field not in data:
                            missing_fields.append(field)
                    
                    if missing_fields:
                        print(f"❌ FALHA: Campos obrigatórios não encontrados: {missing_fields}")
                        self.test_results.append({
                            "test": test_name,
                            "status": "FAILED",
                            "error": f"Missing required fields: {missing_fields}"
                        })
                        return False
                    
                    # Verificar se ano e mês estão corretos
                    if data.get("year") != 2026 or data.get("month") != 3:
                        print(f"❌ FALHA: Ano/mês incorretos. Esperado: 2026/3, Recebido: {data.get('year')}/{data.get('month')}")
                        self.test_results.append({
                            "test": test_name,
                            "status": "FAILED",
                            "error": f"Incorrect year/month in response"
                        })
                        return False
                    
                    print("✅ SUCESSO: Relatório mensal retornado corretamente")
                    print(f"   - Período: {data.get('month')}/{data.get('year')}")
                    print(f"   - Total de vendas: {data.get('total_sales')}")
                    print(f"   - Vendas pagas: {data.get('paid_sales')}")
                    print(f"   - Valor total: R$ {data.get('total_amount'):.2f}")
                    
                    sales = data.get("sales", [])
                    licensee_stats = data.get("licensee_stats", [])
                    
                    print(f"   - Vendas no período: {len(sales)}")
                    print(f"   - Licenciados ativos: {len(licensee_stats)}")
                    
                    self.passed_tests += 1
                    self.test_results.append({
                        "test": test_name,
                        "status": "PASSED",
                        "period": f"{data.get('month')}/{data.get('year')}",
                        "sales_in_period": len(sales)
                    })
                    return True
                    
                elif resp.status == 403:
                    print("❌ FALHA: Acesso negado - verificar permissões admin")
                    self.test_results.append({
                        "test": test_name,
                        "status": "FAILED",
                        "error": "Access denied - admin permissions required"
                    })
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ FALHA ({resp.status}): {error_text}")
                    self.test_results.append({
                        "test": test_name,
                        "status": "FAILED",
                        "error": f"HTTP {resp.status}: {error_text}"
                    })
                    return False
                    
        except Exception as e:
            print(f"❌ ERRO na requisição: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "FAILED",
                "error": f"Request exception: {e}"
            })
            return False
    
    async def test_commission_types(self):
        """
        Testa GET /api/sales/commission-types
        Deve retornar tipos de comissão
        """
        self.total_tests += 1
        test_name = "Commission Types"
        print(f"\n💼 Testando GET /api/sales/commission-types...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/sales/commission-types",
                headers=self.get_auth_headers()
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Deve retornar uma lista
                    if not isinstance(data, list):
                        print(f"❌ FALHA: Esperado lista, recebido: {type(data)}")
                        self.test_results.append({
                            "test": test_name,
                            "status": "FAILED",
                            "error": f"Expected list, got {type(data)}"
                        })
                        return False
                    
                    print("✅ SUCESSO: Tipos de comissão retornados")
                    print(f"   - Total de tipos: {len(data)}")
                    
                    # Verificar estrutura dos tipos se existirem
                    if data:
                        first_type = data[0]
                        expected_fields = ["id", "description", "percentage", "active"]
                        
                        missing_fields = []
                        for field in expected_fields:
                            if field not in first_type:
                                missing_fields.append(field)
                        
                        if missing_fields:
                            print(f"⚠️  Aviso: Campos ausentes no primeiro tipo: {missing_fields}")
                        else:
                            print(f"   - Primeiro tipo: {first_type.get('description')} - {first_type.get('percentage')}%")
                            
                        for i, commission_type in enumerate(data):
                            desc = commission_type.get('description', 'N/A')
                            perc = commission_type.get('percentage', 0)
                            active = commission_type.get('active', False)
                            print(f"   - Tipo {i+1}: {desc} ({perc}%) - {'Ativo' if active else 'Inativo'}")
                    else:
                        print("   - Nenhum tipo de comissão encontrado (tipos padrão serão criados)")
                    
                    self.passed_tests += 1
                    self.test_results.append({
                        "test": test_name,
                        "status": "PASSED",
                        "types_count": len(data)
                    })
                    return True
                    
                elif resp.status == 403:
                    print("❌ FALHA: Acesso negado - verificar permissões admin")
                    self.test_results.append({
                        "test": test_name,
                        "status": "FAILED",
                        "error": "Access denied - admin permissions required"
                    })
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ FALHA ({resp.status}): {error_text}")
                    self.test_results.append({
                        "test": test_name,
                        "status": "FAILED",
                        "error": f"HTTP {resp.status}: {error_text}"
                    })
                    return False
                    
        except Exception as e:
            print(f"❌ ERRO na requisição: {e}")
            self.test_results.append({
                "test": test_name,
                "status": "FAILED",
                "error": f"Request exception: {e}"
            })
            return False
    
    async def run_all_tests(self):
        """Executa todos os testes dos endpoints de relatório"""
        print("🚀 Iniciando testes dos endpoints de relatório de vendas...")
        print(f"📍 Backend URL: {BACKEND_URL}")
        print(f"👤 Admin: {ADMIN_EMAIL}")
        print("="*70)
        
        # Setup
        await self.setup()
        
        try:
            # Login admin
            if not await self.login_admin():
                print("💥 Não foi possível fazer login como admin. Abortando testes.")
                return
            
            # Executar todos os testes
            await self.test_sales_report_summary()
            await self.test_sales_report_all()
            await self.test_monthly_sales_report()
            await self.test_commission_types()
            
            # Relatório final
            print("\n" + "="*70)
            print("📊 RELATÓRIO FINAL DOS TESTES DE RELATÓRIO DE VENDAS")
            print("="*70)
            print(f"✅ Testes passaram: {self.passed_tests}/{self.total_tests}")
            print(f"❌ Testes falharam: {self.total_tests - self.passed_tests}/{self.total_tests}")
            
            if self.passed_tests == self.total_tests:
                print("🎉 TODOS OS TESTES PASSARAM! Os endpoints de relatório estão funcionando.")
            else:
                print("⚠️  ALGUNS TESTES FALHARAM. Verificar problemas acima.")
            
            success_rate = (self.passed_tests / self.total_tests) * 100
            print(f"📈 Taxa de sucesso: {success_rate:.1f}%")
            
            # Resumo detalhado dos resultados
            print(f"\n📋 DETALHES DOS TESTES:")
            for result in self.test_results:
                status_icon = "✅" if result["status"] == "PASSED" else "❌"
                print(f"{status_icon} {result['test']}: {result['status']}")
                if result["status"] == "FAILED":
                    print(f"   Erro: {result.get('error', 'Erro desconhecido')}")
            
        finally:
            await self.cleanup()

async def main():
    """Função principal"""
    tester = SalesReportTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Testes interrompidos pelo usuário")
    except Exception as e:
        print(f"\n💥 Erro fatal: {e}")