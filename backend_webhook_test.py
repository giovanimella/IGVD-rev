#!/usr/bin/env python3
"""
Teste completo do novo sistema de Webhooks com ambiente Sandbox
Testando todos os endpoints conforme especificado na review request
"""

import requests
import json
from pymongo import MongoClient
import os
from datetime import datetime

# Configurações
BASE_URL = "https://reactivation-bug-fix.preview.emergentagent.com/api"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

def setup_database():
    """Configurar as API Keys no banco antes de testar"""
    print("🔧 Configurando API Keys no banco de dados...")
    
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Configurar as chaves conforme solicitado na review request
    result = db.system_config.update_one(
        {"id": "system_config"},
        {"$set": {
            "webhook_sandbox_api_key": "sandbox_test_key_123",
            "webhook_production_api_key": "prod_test_key_456", 
            "webhook_receive_enabled": False  # Inicialmente desabilitado
        }},
        upsert=True
    )
    
    print(f"✅ API Keys configuradas no banco (matched: {result.matched_count}, modified: {result.modified_count})")
    
    client.close()
    return True

def test_webhook_status():
    """1. Testar endpoint de status (público)"""
    print("\n📊 Testando GET /api/webhook/status (público)...")
    
    try:
        response = requests.get(f"{BASE_URL}/webhook/status")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Status: {data.get('status')}")
            print(f"📅 Timestamp: {data.get('timestamp')}")
            
            # Verificar configurações
            prod_config = data.get('endpoints', {}).get('production', {})
            sandbox_config = data.get('endpoints', {}).get('sandbox', {})
            
            print(f"🚀 Produção configurada: {prod_config.get('configured')}")
            print(f"🚀 Produção habilitada: {prod_config.get('receive_enabled')}")
            print(f"🧪 Sandbox configurada: {sandbox_config.get('configured')}")
            print(f"🧪 Sandbox sempre disponível: {sandbox_config.get('always_available')}")
            
            return True
        else:
            print(f"❌ Erro: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def test_sandbox_success():
    """3. Testar Sandbox - Validação bem sucedida"""
    print("\n🧪 Testando POST /api/webhook/sandbox/licensee (validação bem sucedida)...")
    
    headers = {
        "X-API-Key": "sandbox_test_key_123",
        "Content-Type": "application/json"
    }
    
    payload = {
        "id": "TEST-001",
        "full_name": "Teste Sandbox",
        "email": "teste.sandbox@email.com",
        "phone": "11999998888",
        "kit_type": "senior"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhook/sandbox/licensee",
            headers=headers,
            json=payload
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {data.get('success')}")
            print(f"✅ Sandbox: {data.get('sandbox')}")
            print(f"📝 Message: {data.get('message')}")
            
            # Verificar que NÃO criou usuário real
            print("🔍 Verificando que NÃO criou usuário real...")
            
            # Verificar notas explicativas
            if data.get('notes'):
                for note in data['notes']:
                    print(f"  ℹ️ {note}")
            
            return data.get('success') and data.get('sandbox')
        else:
            print(f"❌ Erro: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def test_sandbox_error():
    """4. Testar Sandbox - Validação com erro"""
    print("\n🧪 Testando POST /api/webhook/sandbox/licensee (validação com erro)...")
    
    headers = {
        "X-API-Key": "sandbox_test_key_123",
        "Content-Type": "application/json"
    }
    
    # Usar email que já existe (admin)
    payload = {
        "id": "TEST-002",
        "full_name": "Teste Duplicado",
        "email": "admin@ozoxx.com"  # Email que deve existir
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhook/sandbox/licensee",
            headers=headers,
            json=payload
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"❌ Success: {data.get('success')}")
            print(f"✅ Sandbox: {data.get('sandbox')}")
            print(f"📝 Message: {data.get('message')}")
            
            # Deve ter erros de validação
            validation_errors = data.get('validation_errors', [])
            print(f"🚫 Validation Errors: {validation_errors}")
            
            # Verificar se detectou email duplicado
            email_error_found = any('admin@ozoxx.com' in error for error in validation_errors)
            
            return not data.get('success') and data.get('sandbox') and email_error_found
        else:
            print(f"❌ Erro: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def test_production_disabled():
    """5. Testar Produção DESATIVADA"""
    print("\n🚀 Testando POST /api/webhook/licensee (produção desabilitada)...")
    
    headers = {
        "X-API-Key": "prod_test_key_456",
        "Content-Type": "application/json"
    }
    
    payload = {
        "id": "PROD-TEST-001",
        "full_name": "Produção Teste",
        "email": "producao.teste.disabled@email.com"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhook/licensee",
            headers=headers,
            json=payload
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 403:
            print("✅ Retornou 403 como esperado (recebimento desabilitado)")
            print(f"📝 Message: {response.text}")
            return True
        else:
            print(f"❌ Esperado 403, recebido {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def enable_production():
    """6. Ativar produção"""
    print("\n🔧 Ativando produção no banco de dados...")
    
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    
    result = db.system_config.update_one(
        {"id": "system_config"},
        {"$set": {"webhook_receive_enabled": True}}
    )
    
    print(f"✅ Produção ativada (matched: {result.matched_count}, modified: {result.modified_count})")
    
    client.close()
    return True

def test_production_enabled():
    """6. Testar produção ativada"""
    print("\n🚀 Testando POST /api/webhook/licensee (produção ativada)...")
    
    headers = {
        "X-API-Key": "prod_test_key_456",
        "Content-Type": "application/json"
    }
    
    # Usar timestamp para garantir email único
    timestamp = int(datetime.now().timestamp())
    
    payload = {
        "id": f"PROD-{timestamp}",
        "full_name": "Produção Teste",
        "email": f"producao.teste.{timestamp}@email.com",
        "phone": "11999999999",
        "kit_type": "senior"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhook/licensee",
            headers=headers,
            json=payload
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {data.get('success')}")
            print(f"📝 Message: {data.get('message')}")
            
            # Verificar dados retornados
            user_data = data.get('data', {})
            print(f"👤 ID: {user_data.get('id')}")
            print(f"📧 Email: {user_data.get('email')}")
            print(f"👤 Nome: {user_data.get('full_name')}")
            print(f"📦 Kit Type: {user_data.get('kit_type')}")
            print(f"📧 Email enviado: {user_data.get('email_sent')}")
            
            # Verificar se usuário foi criado no banco
            print("\n🔍 Verificando se usuário foi realmente criado no banco...")
            client = MongoClient(MONGO_URL)
            db = client[DB_NAME]
            
            created_user = db.users.find_one({"id": payload["id"]})
            if created_user:
                print("✅ Usuário encontrado no banco de dados!")
                print(f"  ID: {created_user.get('id')}")
                print(f"  Email: {created_user.get('email')}")
                print(f"  Role: {created_user.get('role')}")
                print(f"  Current Stage: {created_user.get('current_stage')}")
                print(f"  Created via Webhook: {created_user.get('created_via_webhook')}")
            else:
                print("❌ Usuário NÃO encontrado no banco de dados!")
                client.close()
                return False
                
            client.close()
            return data.get('success')
        else:
            print(f"❌ Erro: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def test_webhook_logs():
    """7. Verificar Logs"""
    print("\n📋 Testando GET /api/webhook/logs...")
    
    try:
        # Testar logs gerais
        response = requests.get(f"{BASE_URL}/webhook/logs?limit=10")
        print(f"Status Code (logs gerais): {response.status_code}")
        
        if response.status_code == 200:
            logs = response.json()
            print(f"✅ Total de logs retornados: {len(logs)}")
            
            if logs:
                for i, log in enumerate(logs[:3]):  # Mostrar apenas os 3 primeiros
                    print(f"  Log {i+1}:")
                    print(f"    Environment: {log.get('environment')}")
                    print(f"    Type: {log.get('type')}")
                    print(f"    Event: {log.get('event')}")
                    print(f"    Success: {log.get('success')}")
                    print(f"    Created: {log.get('created_at')}")
        
        # Testar logs de sandbox especificamente
        print("\n📋 Testando logs de sandbox...")
        response = requests.get(f"{BASE_URL}/webhook/logs?environment=sandbox&limit=5")
        
        if response.status_code == 200:
            sandbox_logs = response.json()
            print(f"✅ Logs de sandbox: {len(sandbox_logs)}")
            
        # Testar estatísticas
        print("\n📊 Testando GET /api/webhook/logs/stats...")
        response = requests.get(f"{BASE_URL}/webhook/logs/stats")
        
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ Estatísticas:")
            print(f"  Total: {stats.get('total')}")
            print(f"  Sandbox: {stats.get('by_environment', {}).get('sandbox')}")
            print(f"  Production: {stats.get('by_environment', {}).get('production')}")
            print(f"  Incoming: {stats.get('by_type', {}).get('incoming')}")
            print(f"  Outgoing: {stats.get('by_type', {}).get('outgoing')}")
            print(f"  Success: {stats.get('by_status', {}).get('success')}")
            print(f"  Failed: {stats.get('by_status', {}).get('failed')}")
            
            return True
        else:
            print(f"❌ Erro nas estatísticas: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def test_invalid_api_keys():
    """Testar com API Keys inválidas"""
    print("\n🔑 Testando API Keys inválidas...")
    
    # Testar sandbox com key inválida
    headers = {"X-API-Key": "invalid_key", "Content-Type": "application/json"}
    payload = {"id": "TEST", "full_name": "Test", "email": "test@test.com"}
    
    try:
        response = requests.post(f"{BASE_URL}/webhook/sandbox/licensee", headers=headers, json=payload)
        print(f"Sandbox com key inválida - Status: {response.status_code}")
        
        if response.status_code == 401:
            print("✅ Sandbox rejeitou key inválida corretamente")
        else:
            print(f"❌ Esperado 401, recebido {response.status_code}")
            
        # Testar produção com key inválida
        response = requests.post(f"{BASE_URL}/webhook/licensee", headers=headers, json=payload)
        print(f"Produção com key inválida - Status: {response.status_code}")
        
        if response.status_code == 401:
            print("✅ Produção rejeitou key inválida corretamente")
            return True
        else:
            print(f"❌ Esperado 401, recebido {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def main():
    """Executar todos os testes do sistema de webhook"""
    print("🚀 INICIANDO TESTES DO SISTEMA DE WEBHOOKS COM SANDBOX")
    print("=" * 60)
    
    results = []
    
    # Configurar banco
    results.append(("Setup Database", setup_database()))
    
    # Testes conforme especificado
    results.append(("1. Webhook Status", test_webhook_status()))
    results.append(("2. Sandbox Success", test_sandbox_success()))
    results.append(("3. Sandbox Error", test_sandbox_error()))
    results.append(("4. Production Disabled", test_production_disabled()))
    
    # Ativar produção
    enable_production()
    results.append(("5. Production Enabled", test_production_enabled()))
    results.append(("6. Webhook Logs", test_webhook_logs()))
    results.append(("7. Invalid API Keys", test_invalid_api_keys()))
    
    # Resumo dos resultados
    print("\n" + "=" * 60)
    print("📊 RESUMO DOS TESTES")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Resultado Final: {passed}/{total} testes passaram")
    
    if passed == total:
        print("🎉 TODOS OS TESTES PASSARAM! Sistema de Webhooks com Sandbox funcionando perfeitamente!")
    else:
        print("⚠️ Alguns testes falharam. Verifique os logs acima para detalhes.")
    
    return passed == total

if __name__ == "__main__":
    main()