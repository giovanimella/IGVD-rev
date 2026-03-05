#!/usr/bin/env python3
"""
Testes adicionais do sistema de Webhooks - Casos especiais e edge cases
"""

import requests
import json
from pymongo import MongoClient
from datetime import datetime

# Configurações
BASE_URL = "https://sweet-shannon-4.preview.emergentagent.com/api"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

def test_sandbox_with_responsible_id():
    """Testar sandbox com responsible_id"""
    print("🧪 Testando sandbox com responsible_id...")
    
    headers = {
        "X-API-Key": "sandbox_test_key_123",
        "Content-Type": "application/json"
    }
    
    payload = {
        "id": "TEST-SUPERVISOR-001",
        "full_name": "Teste Supervisor Match",
        "email": "teste.supervisor@email.com",
        "responsible_id": "SUP-123"  # Este ID pode ou não existir
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
            print(f"📝 Message: {data.get('message')}")
            
            # Verificar informações do supervisor
            supervisor_data = data.get('data', {})
            print(f"🧑‍💼 Supervisor matched: {supervisor_data.get('supervisor_matched')}")
            print(f"🧑‍💼 Supervisor ID: {supervisor_data.get('supervisor_id')}")
            print(f"🧑‍💼 Supervisor name: {supervisor_data.get('supervisor_name')}")
            
            # Verificar warnings
            warnings = data.get('warnings', [])
            for warning in warnings:
                print(f"⚠️ Warning: {warning}")
                
            return True
        else:
            print(f"❌ Erro: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def test_sandbox_with_birthday():
    """Testar sandbox com campo birthday"""
    print("\n🎂 Testando sandbox com campo birthday...")
    
    headers = {
        "X-API-Key": "sandbox_test_key_123",
        "Content-Type": "application/json"
    }
    
    payload = {
        "id": "TEST-BIRTHDAY-001",
        "full_name": "Teste Birthday",
        "email": "teste.birthday@email.com",
        "birthday": "1990-05-15",
        "kit_type": "master"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhook/sandbox/licensee",
            headers=headers,
            json=payload
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {data.get('success')}")
            
            # Verificar dados processados
            user_data = data.get('data', {})
            print(f"🎂 Birthday: {user_data.get('birthday')}")
            print(f"📦 Kit Type: {user_data.get('kit_type')}")
            print(f"📊 Initial Stage: {user_data.get('initial_stage')}")  # Master deve ser "completo"
            
            return user_data.get('birthday') == "1990-05-15" and user_data.get('kit_type') == "master"
        else:
            print(f"❌ Erro: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def test_sandbox_invalid_birthday():
    """Testar sandbox com birthday inválido"""
    print("\n🚫 Testando sandbox com birthday inválido...")
    
    headers = {
        "X-API-Key": "sandbox_test_key_123",
        "Content-Type": "application/json"
    }
    
    payload = {
        "id": "TEST-INVALID-BIRTHDAY",
        "full_name": "Teste Birthday Inválido",
        "email": "teste.invalid.birthday@email.com",
        "birthday": "15/05/1990"  # Formato inválido
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhook/sandbox/licensee",
            headers=headers,
            json=payload
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"❌ Success: {data.get('success')}")  # Deve ser False
            
            validation_errors = data.get('validation_errors', [])
            print(f"🚫 Validation Errors: {validation_errors}")
            
            # Verificar se detectou erro de formato de data
            birthday_error = any('nascimento' in error.lower() or 'birthday' in error.lower() for error in validation_errors)
            
            print(f"✅ Test passou: success={not data.get('success')}, birthday_error_found={birthday_error}")
            return not data.get('success') and birthday_error
        else:
            print(f"❌ Erro: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def test_production_with_all_fields():
    """Testar produção com todos os campos"""
    print("\n🚀 Testando produção com todos os campos...")
    
    headers = {
        "X-API-Key": "prod_test_key_456",
        "Content-Type": "application/json"
    }
    
    timestamp = int(datetime.now().timestamp())
    
    payload = {
        "id": f"PROD-FULL-{timestamp}",
        "full_name": "Usuário Completo Teste",
        "email": f"usuario.completo.{timestamp}@email.com",
        "phone": "11988887777",
        "birthday": "1985-12-25",
        "kit_type": "master",
        "leader_id": "LEADER-001",
        "leader_name": "Líder Teste",
        "responsible_id": "RESP-001"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhook/licensee",
            headers=headers,
            json=payload
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {data.get('success')}")
            
            user_data = data.get('data', {})
            print(f"👤 ID: {user_data.get('id')}")
            print(f"🎂 Birthday: {user_data.get('birthday')}")
            print(f"📦 Kit Type: {user_data.get('kit_type')}")
            print(f"📊 Initial Stage: {user_data.get('initial_stage')}")  # Master = "completo"
            print(f"🧑‍💼 Supervisor matched: {user_data.get('supervisor_matched')}")
            
            # Verificar no banco se todos os campos foram salvos
            client = MongoClient(MONGO_URL)
            db = client[DB_NAME]
            
            created_user = db.users.find_one({"id": payload["id"]})
            if created_user:
                print("✅ Usuário criado no banco com todos os campos:")
                print(f"  Birthday: {created_user.get('birthday')}")
                print(f"  Phone: {created_user.get('phone')}")
                print(f"  Kit Type: {created_user.get('kit_type')}")
                print(f"  Current Stage: {created_user.get('current_stage')}")
                print(f"  Leader ID: {created_user.get('leader_id')}")
                print(f"  Leader Name: {created_user.get('leader_name')}")
                print(f"  Responsible ID: {created_user.get('responsible_id')}")
                
                client.close()
                return True
            else:
                print("❌ Usuário NÃO encontrado no banco")
                client.close()
                return False
                
        else:
            print(f"❌ Erro: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def test_duplicate_id_production():
    """Testar produção com ID duplicado"""
    print("\n🚫 Testando produção com ID duplicado...")
    
    headers = {
        "X-API-Key": "prod_test_key_456",
        "Content-Type": "application/json"
    }
    
    # Usar um ID que já existe
    payload = {
        "id": "PROD-1772740883",  # ID do teste anterior
        "full_name": "Teste Duplicado",
        "email": "novo.email@test.com"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/webhook/licensee",
            headers=headers,
            json=payload
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 400:
            print("✅ Retornou 400 como esperado (ID duplicado)")
            print(f"📝 Message: {response.text}")
            return True
        else:
            print(f"❌ Esperado 400, recebido {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def test_logs_filtering():
    """Testar filtros nos logs"""
    print("\n📋 Testando filtros nos logs...")
    
    try:
        # Logs apenas de sandbox
        response = requests.get(f"{BASE_URL}/webhook/logs?environment=sandbox&limit=3")
        if response.status_code == 200:
            sandbox_logs = response.json()
            print(f"✅ Logs de sandbox: {len(sandbox_logs)}")
            
            # Verificar se todos são realmente de sandbox
            all_sandbox = all(log.get('environment') == 'sandbox' for log in sandbox_logs)
            print(f"📝 Todos são de sandbox: {all_sandbox}")
        
        # Logs apenas de produção
        response = requests.get(f"{BASE_URL}/webhook/logs?environment=production&limit=3")
        if response.status_code == 200:
            prod_logs = response.json()
            print(f"✅ Logs de produção: {len(prod_logs)}")
            
            # Verificar se todos são realmente de produção
            all_production = all(log.get('environment') == 'production' for log in prod_logs)
            print(f"📝 Todos são de produção: {all_production}")
        
        # Logs apenas incoming
        response = requests.get(f"{BASE_URL}/webhook/logs?type=incoming&limit=5")
        if response.status_code == 200:
            incoming_logs = response.json()
            print(f"✅ Logs incoming: {len(incoming_logs)}")
            
            # Verificar se todos são incoming
            all_incoming = all(log.get('type') == 'incoming' for log in incoming_logs)
            print(f"📝 Todos são incoming: {all_incoming}")
        
        return all_sandbox and all_production and all_incoming
        
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

def main():
    """Executar testes adicionais"""
    print("🔬 TESTES ADICIONAIS DO SISTEMA DE WEBHOOKS")
    print("=" * 50)
    
    results = []
    
    results.append(("Sandbox with responsible_id", test_sandbox_with_responsible_id()))
    results.append(("Sandbox with birthday", test_sandbox_with_birthday()))
    results.append(("Sandbox invalid birthday", test_sandbox_invalid_birthday()))
    results.append(("Production all fields", test_production_with_all_fields()))
    results.append(("Production duplicate ID", test_duplicate_id_production()))
    results.append(("Logs filtering", test_logs_filtering()))
    
    # Resumo
    print("\n" + "=" * 50)
    print("📊 RESUMO DOS TESTES ADICIONAIS")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Resultado: {passed}/{total} testes adicionais passaram")
    
    return passed == total

if __name__ == "__main__":
    main()