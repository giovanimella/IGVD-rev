"""
Script para testar os novos endpoints de métricas
"""
import requests
import json
import os

API_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')

# Login como admin
login_response = requests.post(f"{API_URL}/api/auth/login", json={
    "email": "admin@ozoxx.com",
    "password": "admin123"
})

if login_response.status_code != 200:
    print("❌ Erro no login")
    print(login_response.text)
    exit(1)

token = login_response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

print("✅ Login realizado com sucesso\n")

# Testar endpoints
endpoints = [
    "/api/stats/admin/engagement-metrics",
    "/api/stats/admin/financial-metrics",
    "/api/stats/admin/top-content",
]

for endpoint in endpoints:
    print(f"📊 Testando: {endpoint}")
    response = requests.get(f"{API_URL}{endpoint}", headers=headers)
    
    if response.status_code == 200:
        print(f"✅ Status: {response.status_code}")
        data = response.json()
        print(f"📄 Resposta:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print(f"❌ Status: {response.status_code}")
        print(f"Erro: {response.text}")
    
    print("-" * 80)
    print()

# Testar broadcast de notificação
print("📢 Testando: POST /api/notifications/broadcast")
broadcast_data = {
    "title": "Teste de Notificação",
    "message": "Esta é uma notificação de teste do sistema",
    "type": "announcement",
    "target": "licensees"
}

response = requests.post(
    f"{API_URL}/api/notifications/broadcast",
    json=broadcast_data,
    headers=headers
)

if response.status_code == 200:
    print(f"✅ Status: {response.status_code}")
    print(f"📄 Resposta:")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
else:
    print(f"❌ Status: {response.status_code}")
    print(f"Erro: {response.text}")

print("\n" + "=" * 80)
print("🎉 Testes concluídos!")
