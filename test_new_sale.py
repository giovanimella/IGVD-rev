#!/usr/bin/env python3
"""
Additional test to verify POST /api/sales/register with new sale data
"""
import asyncio
import aiohttp
import json
import random

# Configurações
BACKEND_URL = "https://sweet-shannon-4.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Credenciais do teste
TEST_EMAIL = "test.licensee@ozoxx.com"
TEST_PASSWORD = "test123"

async def test_new_sale_registration():
    """Testa registrar uma nova venda com dados completos"""
    session = aiohttp.ClientSession()
    
    try:
        # Login
        async with session.post(f"{API_BASE}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }) as resp:
            if resp.status != 200:
                print("❌ Falha no login")
                return
            
            data = await resp.json()
            auth_token = data.get("access_token")
            
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Gerar número de venda válido (1-5)
        sale_number = random.randint(3, 5)  # Usar 3-5 para evitar conflito com vendas existentes
        
        # Dados de uma nova venda
        sale_data = {
            "sale_number": sale_number,
            "customer_name": "João Silva Pereira",
            "customer_phone": "(21) 99887-6655",
            "customer_email": "joao.pereira@email.com",
            "customer_cpf": "98765432100",
            "device_serial": f"DEV{sale_number}567890",
            "device_source": "leader_stock",
            "sale_value": 1299.99
        }
        
        print(f"🔄 Testando registrar nova venda #{sale_number}...")
        
        async with session.post(
            f"{API_BASE}/sales/register",
            json=sale_data,
            headers=headers
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                print("✅ SUCESSO: Nova venda registrada com sucesso!")
                print(f"   - Sale ID: {data.get('sale', {}).get('id')}")
                print(f"   - Cliente: {data.get('sale', {}).get('customer_name')}")
                print(f"   - Valor: R$ {data.get('sale', {}).get('sale_value')}")
                print(f"   - Status: {data.get('sale', {}).get('status')}")
                
                if data.get("checkout_url"):
                    print(f"   - Checkout URL: Gerada")
                else:
                    print(f"   - Checkout URL: Não gerada (PagSeguro não configurado)")
            else:
                error_text = await resp.text()
                print(f"❌ FALHA ({resp.status}): {error_text}")
    
    finally:
        await session.close()

if __name__ == "__main__":
    asyncio.run(test_new_sale_registration())