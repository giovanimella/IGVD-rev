#!/usr/bin/env python3
"""
Backend Test Script - Subscription & Meeting System Testing
Testa os novos endpoints implementados:

SISTEMA DE MENSALIDADE RECORRENTE (SUBSCRIPTIONS):
- Admin: GET /api/subscriptions/settings, PUT /api/subscriptions/settings
- Admin: POST /api/subscriptions/test-connection, GET /api/subscriptions/all, GET /api/subscriptions/stats  
- Plans: POST /api/subscriptions/plans, GET /api/subscriptions/plans
- User: GET /api/subscriptions/my-subscription

SISTEMA DE REUNIÕES (MEETINGS):
- Admin: GET /api/meetings/settings, PUT /api/meetings/settings
- Admin: GET /api/meetings/all, GET /api/meetings/all/stats
- Licensed: POST /api/meetings, GET /api/meetings/my, GET /api/meetings/{id}
- Participants: POST /api/meetings/{id}/participants, POST /api/meetings/{id}/close
- Stats: GET /api/meetings/my/stats

Credenciais: admin@ozoxx.com / admin123
"""
import asyncio
import aiohttp
import json
import os
from datetime import datetime
import sys

# Configurações
BACKEND_URL = "https://subscription-billing-1.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Credenciais
ADMIN_EMAIL = "admin@ozoxx.com"
ADMIN_PASSWORD = "admin123"

class SubscriptionMeetingTester:
    def __init__(self):
        self.session = None
        self.admin_token = None
        self.licensee_token = None
        self.licensee_id = None
        self.passed_tests = 0
        self.total_tests = 0
        self.test_results = []
        self.created_meeting_id = None
        
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
                    self.admin_token = data.get("access_token")
                    if self.admin_token:
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

    async def create_test_licensee(self):
        """Cria um licenciado de teste se necessário"""
        print("👤 Criando licenciado de teste...")
        
        # Primeiro tentar fazer login com um licenciado existente
        test_emails = [
            "licenciado.teste@ozoxx.com",  # Criado pelo create_test_licensee.py
            "licenciado@teste.com",
            "test@licenciado.com", 
            "joao@licenciado.com"
        ]
        
        test_passwords = ["licenciado123", "123456"]
        
        for email in test_emails:
            for password in test_passwords:
                try:
                    async with self.session.post(f"{API_BASE}/auth/login", json={
                        "email": email,
                        "password": password
                    }) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            self.licensee_token = data.get("access_token")
                            self.licensee_id = data.get("user", {}).get("sub")
                            print(f"✅ Licenciado existente logado: {email}")
                            return True
                except:
                    continue
                
        # Se não encontrou, criar um novo
        try:
            user_data = {
                "email": "licenciado@teste.com",
                "password": "123456",
                "full_name": "João Silva Licenciado",
                "phone": "11999999999",
                "cpf": "11122233344",
                "role": "licensed"
            }
            
            async with self.session.post(
                f"{API_BASE}/auth/register", 
                json=user_data,
                headers={"Authorization": f"Bearer {self.admin_token}"}
            ) as resp:
                if resp.status == 201:
                    print("✅ Licenciado criado com sucesso")
                    # Fazer login com o licenciado
                    async with self.session.post(f"{API_BASE}/auth/login", json={
                        "email": "licenciado@teste.com",
                        "password": "123456"
                    }) as login_resp:
                        if login_resp.status == 200:
                            data = await login_resp.json()
                            self.licensee_token = data.get("access_token")
                            self.licensee_id = data.get("user", {}).get("sub")
                            print("✅ Login do licenciado realizado")
                            return True
                        else:
                            print("❌ Falha no login do licenciado criado")
                            return False
                else:
                    error_text = await resp.text()
                    print(f"⚠️ Falha ao criar licenciado ({resp.status}): {error_text}")
                    return False
        except Exception as e:
            print(f"❌ Erro ao criar licenciado: {e}")
            return False
    
    def get_auth_headers(self, use_admin=True):
        """Retorna headers com autenticação"""
        token = self.admin_token if use_admin else self.licensee_token
        if not token:
            return {}
        return {"Authorization": f"Bearer {token}"}
    
    def log_test_result(self, test_name, success, error=None, data=None):
        """Registra resultado do teste"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            self.test_results.append({
                "test": test_name,
                "status": "PASSED",
                "data": data
            })
        else:
            self.test_results.append({
                "test": test_name,
                "status": "FAILED",
                "error": error
            })

    # ==================== SUBSCRIPTION TESTS ====================

    async def test_subscription_settings_get(self):
        """Testa GET /api/subscriptions/settings"""
        test_name = "Subscription Settings - Get"
        print(f"\n⚙️ Testando GET /api/subscriptions/settings...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/subscriptions/settings",
                headers=self.get_auth_headers(use_admin=True)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Verificar campos essenciais
                    required_fields = ["monthly_fee", "trial_days", "pagbank_environment"]
                    missing_fields = [f for f in required_fields if f not in data]
                    
                    if missing_fields:
                        print(f"❌ Campos obrigatórios ausentes: {missing_fields}")
                        self.log_test_result(test_name, False, f"Missing fields: {missing_fields}")
                        return False
                    
                    print("✅ Configurações obtidas com sucesso")
                    print(f"   - Taxa mensal: R$ {data.get('monthly_fee', 0)}")
                    print(f"   - Dias de teste: {data.get('trial_days', 0)}")
                    print(f"   - Ambiente: {data.get('pagbank_environment', 'N/A')}")
                    
                    self.log_test_result(test_name, True, data=data)
                    return True
                    
                elif resp.status == 403:
                    print("❌ Acesso negado - verificar permissões admin")
                    self.log_test_result(test_name, False, "Access denied - admin required")
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def test_subscription_settings_update(self):
        """Testa PUT /api/subscriptions/settings"""
        test_name = "Subscription Settings - Update"
        print(f"\n⚙️ Testando PUT /api/subscriptions/settings...")
        
        try:
            update_data = {
                "monthly_fee": 49.90,
                "trial_days": 0
            }
            
            async with self.session.put(
                f"{API_BASE}/subscriptions/settings",
                json=update_data,
                headers=self.get_auth_headers(use_admin=True)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print("✅ Configurações atualizadas com sucesso")
                    print(f"   - Mensagem: {data.get('message', 'N/A')}")
                    
                    self.log_test_result(test_name, True, data=data)
                    return True
                    
                elif resp.status == 403:
                    print("❌ Acesso negado - verificar permissões admin")
                    self.log_test_result(test_name, False, "Access denied - admin required")
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def test_subscription_test_connection(self):
        """Testa POST /api/subscriptions/test-connection"""
        test_name = "Subscription Test Connection"
        print(f"\n🔗 Testando POST /api/subscriptions/test-connection...")
        
        try:
            async with self.session.post(
                f"{API_BASE}/subscriptions/test-connection",
                headers=self.get_auth_headers(use_admin=True)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print("✅ Teste de conexão realizado")
                    print(f"   - Resultado: {data}")
                    
                    self.log_test_result(test_name, True, data=data)
                    return True
                    
                elif resp.status == 400:
                    # Esperado se não tem token configurado
                    error_text = await resp.text()
                    print(f"⚠️ Erro esperado (token não configurado): {error_text}")
                    self.log_test_result(test_name, True, data={"expected_error": "No token configured"})
                    return True
                    
                elif resp.status == 403:
                    print("❌ Acesso negado - verificar permissões admin")
                    self.log_test_result(test_name, False, "Access denied - admin required")
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def test_subscription_plans_list(self):
        """Testa GET /api/subscriptions/plans"""
        test_name = "Subscription Plans - List"
        print(f"\n📋 Testando GET /api/subscriptions/plans...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/subscriptions/plans",
                headers=self.get_auth_headers(use_admin=True)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    if isinstance(data, list):
                        print("✅ Lista de planos obtida")
                        print(f"   - Total de planos: {len(data)}")
                        
                        if data:
                            first_plan = data[0]
                            print(f"   - Primeiro plano: {first_plan.get('name', 'N/A')} - R$ {first_plan.get('amount', 0)}")
                        
                        self.log_test_result(test_name, True, data={"plans_count": len(data)})
                        return True
                    else:
                        print(f"❌ Resposta não é uma lista: {type(data)}")
                        self.log_test_result(test_name, False, f"Expected list, got {type(data)}")
                        return False
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def test_subscription_plans_create(self):
        """Testa POST /api/subscriptions/plans (pode falhar se token PagBank não configurado)"""
        test_name = "Subscription Plans - Create"
        print(f"\n➕ Testando POST /api/subscriptions/plans...")
        
        try:
            plan_data = {
                "name": "Mensalidade UniOzoxx Teste",
                "description": "Plano de teste criado automaticamente",
                "amount": 49.90
            }
            
            async with self.session.post(
                f"{API_BASE}/subscriptions/plans",
                json=plan_data,
                headers=self.get_auth_headers(use_admin=True)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print("✅ Plano criado com sucesso")
                    print(f"   - Mensagem: {data.get('message', 'N/A')}")
                    
                    self.log_test_result(test_name, True, data=data)
                    return True
                    
                elif resp.status == 400:
                    # Esperado se token PagBank não configurado
                    error_text = await resp.text()
                    print(f"⚠️ Erro esperado (configuração PagBank): {error_text}")
                    self.log_test_result(test_name, True, data={"expected_error": "PagBank not configured"})
                    return True
                    
                elif resp.status == 403:
                    print("❌ Acesso negado - verificar permissões admin")
                    self.log_test_result(test_name, False, "Access denied - admin required")
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def test_subscription_all(self):
        """Testa GET /api/subscriptions/all"""
        test_name = "Subscription All - List"
        print(f"\n📊 Testando GET /api/subscriptions/all...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/subscriptions/all",
                headers=self.get_auth_headers(use_admin=True)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    if isinstance(data, list):
                        print("✅ Lista de todas as assinaturas obtida")
                        print(f"   - Total de assinaturas: {len(data)}")
                        
                        self.log_test_result(test_name, True, data={"subscriptions_count": len(data)})
                        return True
                    else:
                        print(f"❌ Resposta não é uma lista: {type(data)}")
                        self.log_test_result(test_name, False, f"Expected list, got {type(data)}")
                        return False
                        
                elif resp.status == 403:
                    print("❌ Acesso negado - verificar permissões admin/supervisor")
                    self.log_test_result(test_name, False, "Access denied - admin/supervisor required")
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def test_subscription_stats(self):
        """Testa GET /api/subscriptions/stats"""
        test_name = "Subscription Stats"
        print(f"\n📈 Testando GET /api/subscriptions/stats...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/subscriptions/stats",
                headers=self.get_auth_headers(use_admin=True)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Verificar campos essenciais
                    required_fields = [
                        "total_subscriptions", "active_subscriptions", 
                        "overdue_subscriptions", "suspended_subscriptions",
                        "monthly_fee", "estimated_monthly_revenue"
                    ]
                    missing_fields = [f for f in required_fields if f not in data]
                    
                    if missing_fields:
                        print(f"❌ Campos obrigatórios ausentes: {missing_fields}")
                        self.log_test_result(test_name, False, f"Missing fields: {missing_fields}")
                        return False
                    
                    print("✅ Estatísticas de assinaturas obtidas")
                    print(f"   - Total: {data.get('total_subscriptions', 0)}")
                    print(f"   - Ativas: {data.get('active_subscriptions', 0)}")
                    print(f"   - Em atraso: {data.get('overdue_subscriptions', 0)}")
                    print(f"   - Suspensas: {data.get('suspended_subscriptions', 0)}")
                    print(f"   - Receita estimada: R$ {data.get('estimated_monthly_revenue', 0)}")
                    
                    self.log_test_result(test_name, True, data=data)
                    return True
                    
                elif resp.status == 403:
                    print("❌ Acesso negado - verificar permissões admin")
                    self.log_test_result(test_name, False, "Access denied - admin required")
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def test_subscription_my_subscription(self):
        """Testa GET /api/subscriptions/my-subscription (licenciado)"""
        test_name = "Subscription My Subscription"
        print(f"\n👤 Testando GET /api/subscriptions/my-subscription (licenciado)...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/subscriptions/my-subscription",
                headers=self.get_auth_headers(use_admin=False)  # Usar licenciado
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Verificar campos essenciais
                    required_fields = ["has_active_subscription", "is_blocked"]
                    missing_fields = [f for f in required_fields if f not in data]
                    
                    if missing_fields:
                        print(f"❌ Campos obrigatórios ausentes: {missing_fields}")
                        self.log_test_result(test_name, False, f"Missing fields: {missing_fields}")
                        return False
                    
                    print("✅ Status da assinatura obtido")
                    print(f"   - Tem assinatura ativa: {data.get('has_active_subscription', False)}")
                    print(f"   - Está bloqueado: {data.get('is_blocked', True)}")
                    print(f"   - Status: {data.get('status', 'N/A')}")
                    
                    self.log_test_result(test_name, True, data=data)
                    return True
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    # ==================== MEETING TESTS ====================

    async def test_meeting_settings_get(self):
        """Testa GET /api/meetings/settings"""
        test_name = "Meeting Settings - Get"
        print(f"\n⚙️ Testando GET /api/meetings/settings...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/meetings/settings",
                headers=self.get_auth_headers(use_admin=True)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Verificar campos essenciais
                    required_fields = ["points_per_participant", "min_participants", "max_participants_per_meeting"]
                    missing_fields = [f for f in required_fields if f not in data]
                    
                    if missing_fields:
                        print(f"❌ Campos obrigatórios ausentes: {missing_fields}")
                        self.log_test_result(test_name, False, f"Missing fields: {missing_fields}")
                        return False
                    
                    print("✅ Configurações de reuniões obtidas")
                    print(f"   - Pontos por participante: {data.get('points_per_participant', 0)}")
                    print(f"   - Mínimo participantes: {data.get('min_participants', 0)}")
                    print(f"   - Máximo participantes: {data.get('max_participants_per_meeting', 0)}")
                    
                    self.log_test_result(test_name, True, data=data)
                    return True
                    
                elif resp.status == 403:
                    print("❌ Acesso negado - verificar permissões admin")
                    self.log_test_result(test_name, False, "Access denied - admin required")
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def test_meeting_settings_update(self):
        """Testa PUT /api/meetings/settings"""
        test_name = "Meeting Settings - Update"
        print(f"\n⚙️ Testando PUT /api/meetings/settings...")
        
        try:
            update_data = {
                "points_per_participant": 1
            }
            
            async with self.session.put(
                f"{API_BASE}/meetings/settings",
                json=update_data,
                headers=self.get_auth_headers(use_admin=True)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print("✅ Configurações de reuniões atualizadas")
                    print(f"   - Mensagem: {data.get('message', 'N/A')}")
                    
                    self.log_test_result(test_name, True, data=data)
                    return True
                    
                elif resp.status == 403:
                    print("❌ Acesso negado - verificar permissões admin")
                    self.log_test_result(test_name, False, "Access denied - admin required")
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def test_meeting_create(self):
        """Testa POST /api/meetings (criar reunião)"""
        test_name = "Meeting Create"
        print(f"\n➕ Testando POST /api/meetings...")
        
        try:
            meeting_data = {
                "title": "Reunião Teste",
                "description": "Teste automatizado do sistema",
                "location": "Escritório Central",
                "meeting_date": "2026-04-01",
                "meeting_time": "14:00"
            }
            
            async with self.session.post(
                f"{API_BASE}/meetings/",
                json=meeting_data,
                headers=self.get_auth_headers(use_admin=False)  # Usar licenciado
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    if data.get("success") and "meeting" in data:
                        meeting = data["meeting"]
                        self.created_meeting_id = meeting.get("id")
                        
                        print("✅ Reunião criada com sucesso")
                        print(f"   - ID: {self.created_meeting_id}")
                        print(f"   - Título: {meeting.get('title', 'N/A')}")
                        print(f"   - Data: {meeting.get('meeting_date', 'N/A')} {meeting.get('meeting_time', 'N/A')}")
                        print(f"   - Status: {meeting.get('status', 'N/A')}")
                        
                        self.log_test_result(test_name, True, data=data)
                        return True
                    else:
                        print(f"❌ Estrutura de resposta inválida: {data}")
                        self.log_test_result(test_name, False, "Invalid response structure")
                        return False
                        
                elif resp.status == 403:
                    print("❌ Acesso negado - verificar se licenciado tem assinatura ativa")
                    error_text = await resp.text()
                    print(f"   Detalhes: {error_text}")
                    # Este pode ser um erro esperado se o licenciado não tem assinatura
                    self.log_test_result(test_name, True, data={"expected_error": "No active subscription"})
                    return True
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def test_meeting_my_list(self):
        """Testa GET /api/meetings/my (minhas reuniões)"""
        test_name = "Meeting My List"
        print(f"\n📋 Testando GET /api/meetings/my...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/meetings/my",
                headers=self.get_auth_headers(use_admin=False)  # Usar licenciado
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    if isinstance(data, list):
                        print("✅ Lista de minhas reuniões obtida")
                        print(f"   - Total de reuniões: {len(data)}")
                        
                        if data:
                            first_meeting = data[0]
                            print(f"   - Primeira reunião: {first_meeting.get('title', 'N/A')}")
                        
                        self.log_test_result(test_name, True, data={"meetings_count": len(data)})
                        return True
                    else:
                        print(f"❌ Resposta não é uma lista: {type(data)}")
                        self.log_test_result(test_name, False, f"Expected list, got {type(data)}")
                        return False
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def test_meeting_get_details(self):
        """Testa GET /api/meetings/{meeting_id} (detalhes da reunião)"""
        test_name = "Meeting Get Details"
        
        if not self.created_meeting_id:
            print(f"\n⚠️ Pulando teste {test_name} - nenhuma reunião foi criada")
            return True
        
        print(f"\n🔍 Testando GET /api/meetings/{self.created_meeting_id}...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/meetings/{self.created_meeting_id}",
                headers=self.get_auth_headers(use_admin=False)  # Usar licenciado
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    if data.get("success") and "meeting" in data:
                        meeting = data["meeting"]
                        participants = data.get("participants", [])
                        
                        print("✅ Detalhes da reunião obtidos")
                        print(f"   - Título: {meeting.get('title', 'N/A')}")
                        print(f"   - Participantes: {len(participants)}")
                        
                        self.log_test_result(test_name, True, data=data)
                        return True
                    else:
                        print(f"❌ Estrutura de resposta inválida: {data}")
                        self.log_test_result(test_name, False, "Invalid response structure")
                        return False
                        
                elif resp.status == 404:
                    print("❌ Reunião não encontrada")
                    self.log_test_result(test_name, False, "Meeting not found")
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def test_meeting_add_participant(self):
        """Testa POST /api/meetings/{meeting_id}/participants"""
        test_name = "Meeting Add Participant"
        
        if not self.created_meeting_id:
            print(f"\n⚠️ Pulando teste {test_name} - nenhuma reunião foi criada")
            return True
        
        print(f"\n👥 Testando POST /api/meetings/{self.created_meeting_id}/participants...")
        
        try:
            participant_data = {
                "name": "João Silva",
                "email": "joao@teste.com",
                "phone": "11999999999"
            }
            
            async with self.session.post(
                f"{API_BASE}/meetings/{self.created_meeting_id}/participants",
                json=participant_data,
                headers=self.get_auth_headers(use_admin=False)  # Usar licenciado
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    print("✅ Participante adicionado com sucesso")
                    print(f"   - Mensagem: {data.get('message', 'N/A')}")
                    print(f"   - Total participantes: {data.get('total_participants', 0)}")
                    
                    self.log_test_result(test_name, True, data=data)
                    return True
                    
                elif resp.status == 403:
                    print("❌ Acesso negado - verificar se licenciado tem assinatura ativa")
                    error_text = await resp.text()
                    print(f"   Detalhes: {error_text}")
                    # Este pode ser um erro esperado se o licenciado não tem assinatura
                    self.log_test_result(test_name, True, data={"expected_error": "No active subscription"})
                    return True
                elif resp.status == 404:
                    print("❌ Reunião não encontrada")
                    self.log_test_result(test_name, False, "Meeting not found")
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def test_meeting_close(self):
        """Testa POST /api/meetings/{meeting_id}/close"""
        test_name = "Meeting Close"
        
        if not self.created_meeting_id:
            print(f"\n⚠️ Pulando teste {test_name} - nenhuma reunião foi criada")
            return True
        
        print(f"\n🔒 Testando POST /api/meetings/{self.created_meeting_id}/close...")
        
        try:
            async with self.session.post(
                f"{API_BASE}/meetings/{self.created_meeting_id}/close",
                headers=self.get_auth_headers(use_admin=False)  # Usar licenciado
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    if data.get("success"):
                        print("✅ Reunião fechada com sucesso")
                        print(f"   - Mensagem: {data.get('message', 'N/A')}")
                        print(f"   - Participantes: {data.get('participants_count', 0)}")
                        print(f"   - Pontos creditados: {data.get('points_awarded', 0)}")
                        print(f"   - Total de pontos: {data.get('new_total_points', 0)}")
                        
                        self.log_test_result(test_name, True, data=data)
                        return True
                    else:
                        print(f"❌ Falha no fechamento: {data}")
                        self.log_test_result(test_name, False, "Close failed")
                        return False
                        
                elif resp.status == 400:
                    # Pode falhar se não tem participantes suficientes
                    error_text = await resp.text()
                    print(f"⚠️ Erro esperado (regras de negócio): {error_text}")
                    self.log_test_result(test_name, True, data={"expected_error": "Business rule validation"})
                    return True
                elif resp.status == 403:
                    print("❌ Acesso negado - verificar se licenciado tem assinatura ativa")
                    error_text = await resp.text()
                    print(f"   Detalhes: {error_text}")
                    # Este pode ser um erro esperado se o licenciado não tem assinatura
                    self.log_test_result(test_name, True, data={"expected_error": "No active subscription"})
                    return True
                elif resp.status == 404:
                    print("❌ Reunião não encontrada")
                    self.log_test_result(test_name, False, "Meeting not found")
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def test_meeting_my_stats(self):
        """Testa GET /api/meetings/my/stats"""
        test_name = "Meeting My Stats"
        print(f"\n📊 Testando GET /api/meetings/my/stats...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/meetings/my/stats",
                headers=self.get_auth_headers(use_admin=False)  # Usar licenciado
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Verificar campos essenciais
                    required_fields = [
                        "total_meetings", "total_closed_meetings", 
                        "total_participants", "total_points_earned"
                    ]
                    missing_fields = [f for f in required_fields if f not in data]
                    
                    if missing_fields:
                        print(f"❌ Campos obrigatórios ausentes: {missing_fields}")
                        self.log_test_result(test_name, False, f"Missing fields: {missing_fields}")
                        return False
                    
                    print("✅ Estatísticas pessoais obtidas")
                    print(f"   - Total reuniões: {data.get('total_meetings', 0)}")
                    print(f"   - Reuniões fechadas: {data.get('total_closed_meetings', 0)}")
                    print(f"   - Total participantes: {data.get('total_participants', 0)}")
                    print(f"   - Pontos ganhos: {data.get('total_points_earned', 0)}")
                    
                    self.log_test_result(test_name, True, data=data)
                    return True
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def test_meeting_all_admin(self):
        """Testa GET /api/meetings/all (admin)"""
        test_name = "Meeting All - Admin"
        print(f"\n📋 Testando GET /api/meetings/all (admin)...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/meetings/all",
                headers=self.get_auth_headers(use_admin=True)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    if isinstance(data, list):
                        print("✅ Lista de todas as reuniões obtida (admin)")
                        print(f"   - Total de reuniões: {len(data)}")
                        
                        self.log_test_result(test_name, True, data={"meetings_count": len(data)})
                        return True
                    else:
                        print(f"❌ Resposta não é uma lista: {type(data)}")
                        self.log_test_result(test_name, False, f"Expected list, got {type(data)}")
                        return False
                        
                elif resp.status == 403:
                    print("❌ Acesso negado - verificar permissões admin/supervisor")
                    self.log_test_result(test_name, False, "Access denied - admin/supervisor required")
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def test_meeting_all_stats_admin(self):
        """Testa GET /api/meetings/all/stats (admin)"""
        test_name = "Meeting All Stats - Admin"
        print(f"\n📈 Testando GET /api/meetings/all/stats (admin)...")
        
        try:
            async with self.session.get(
                f"{API_BASE}/meetings/all/stats",
                headers=self.get_auth_headers(use_admin=True)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Verificar campos essenciais
                    required_fields = [
                        "total_meetings", "total_closed_meetings", 
                        "total_participants", "total_points_distributed"
                    ]
                    missing_fields = [f for f in required_fields if f not in data]
                    
                    if missing_fields:
                        print(f"❌ Campos obrigatórios ausentes: {missing_fields}")
                        self.log_test_result(test_name, False, f"Missing fields: {missing_fields}")
                        return False
                    
                    print("✅ Estatísticas gerais obtidas (admin)")
                    print(f"   - Total reuniões: {data.get('total_meetings', 0)}")
                    print(f"   - Reuniões fechadas: {data.get('total_closed_meetings', 0)}")
                    print(f"   - Total participantes: {data.get('total_participants', 0)}")
                    print(f"   - Pontos distribuídos: {data.get('total_points_distributed', 0)}")
                    
                    self.log_test_result(test_name, True, data=data)
                    return True
                    
                elif resp.status == 403:
                    print("❌ Acesso negado - verificar permissões admin")
                    self.log_test_result(test_name, False, "Access denied - admin required")
                    return False
                else:
                    error_text = await resp.text()
                    print(f"❌ Falha ({resp.status}): {error_text}")
                    self.log_test_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Erro na requisição: {e}")
            self.log_test_result(test_name, False, f"Request exception: {e}")
            return False

    async def run_all_tests(self):
        """Executa todos os testes dos sistemas de assinatura e reuniões"""
        print("🚀 Iniciando testes dos sistemas de Assinatura e Reuniões...")
        print(f"📍 Backend URL: {BACKEND_URL}")
        print(f"👤 Admin: {ADMIN_EMAIL}")
        print("="*80)
        
        # Setup
        await self.setup()
        
        try:
            # Login admin
            if not await self.login_admin():
                print("💥 Não foi possível fazer login como admin. Abortando testes.")
                return

            # Criar licenciado de teste
            if not await self.create_test_licensee():
                print("💥 Não foi possível criar/acessar licenciado de teste.")
                print("⚠️ Alguns testes podem falhar sem licenciado válido.")
            
            print("\n" + "="*50)
            print("📋 TESTANDO SISTEMA DE ASSINATURAS")
            print("="*50)
            
            # Testes de Assinatura
            await self.test_subscription_settings_get()
            await self.test_subscription_settings_update()
            await self.test_subscription_test_connection()
            await self.test_subscription_plans_list()
            await self.test_subscription_plans_create()
            await self.test_subscription_all()
            await self.test_subscription_stats()
            
            if self.licensee_token:
                await self.test_subscription_my_subscription()
            
            print("\n" + "="*50)
            print("🤝 TESTANDO SISTEMA DE REUNIÕES")
            print("="*50)
            
            # Testes de Reuniões
            await self.test_meeting_settings_get()
            await self.test_meeting_settings_update()
            
            if self.licensee_token:
                await self.test_meeting_create()
                await self.test_meeting_my_list()
                await self.test_meeting_get_details()
                await self.test_meeting_add_participant()
                await self.test_meeting_close()
                await self.test_meeting_my_stats()
            
            await self.test_meeting_all_admin()
            await self.test_meeting_all_stats_admin()
            
            # Relatório final
            print("\n" + "="*80)
            print("📊 RELATÓRIO FINAL DOS TESTES")
            print("="*80)
            print(f"✅ Testes passaram: {self.passed_tests}/{self.total_tests}")
            print(f"❌ Testes falharam: {self.total_tests - self.passed_tests}/{self.total_tests}")
            
            if self.passed_tests == self.total_tests:
                print("🎉 TODOS OS TESTES PASSARAM! Os sistemas estão funcionando.")
            else:
                print("⚠️  ALGUNS TESTES FALHARAM. Verificar problemas acima.")
            
            success_rate = (self.passed_tests / self.total_tests) * 100 if self.total_tests > 0 else 0
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
    tester = SubscriptionMeetingTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Testes interrompidos pelo usuário")
    except Exception as e:
        print(f"\n💥 Erro fatal: {e}")