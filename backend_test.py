#!/usr/bin/env python3
"""
Teste das novas rotas de vendas e pagamento de inscrição
Testando:
1. POST /api/sales/register - Registrar uma nova venda
2. GET /api/sales/my-sales - Listar as vendas do usuário  
3. POST /api/payments/create-payment - Criar pagamento da taxa de inscrição
"""

import requests
import json
import sys
from datetime import datetime

# Configuração do backend
BACKEND_URL = "https://checkout-revamp-10.preview.emergentagent.com/api"

# Credenciais do licenciado para teste
LICENSEE_EMAIL = "test.licensee@ozoxx.com"
LICENSEE_PASSWORD = "test123"

def print_test_header(test_name):
    """Imprime cabeçalho do teste"""
    print(f"\n{'='*60}")
    print(f"TESTE: {test_name}")
    print(f"{'='*60}")

def print_result(success, message, details=None):
    """Imprime resultado do teste"""
    status = "✅ SUCESSO" if success else "❌ FALHA"
    print(f"{status}: {message}")
    if details:
        print(f"Detalhes: {details}")
    print("-" * 60)

def authenticate_user(email, password):
    """Autentica usuário e retorna token"""
    print_test_header("AUTENTICAÇÃO")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/auth/login",
            json={"email": email, "password": password}
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            user_info = data.get("user", {})
            
            print_result(True, f"Login realizado com sucesso para {email}")
            print(f"Usuário: {user_info.get('full_name', 'N/A')}")
            print(f"Role: {user_info.get('role', 'N/A')}")
            print(f"Stage: {user_info.get('current_stage', 'N/A')}")
            
            return token
        else:
            error_msg = f"Status {response.status_code}: {response.text}"
            print_result(False, "Falha na autenticação", error_msg)
            return None
            
    except Exception as e:
        print_result(False, "Erro na autenticação", str(e))
        return None

def test_sales_my_sales(token):
    """Testa GET /api/sales/my-sales"""
    print_test_header("GET /api/sales/my-sales")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BACKEND_URL}/sales/my-sales", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, "Endpoint funcionando")
            print(f"Total de vendas: {data.get('total_sales', 0)}")
            print(f"Vendas completadas: {data.get('completed_sales', 0)}")
            print(f"Vendas pendentes: {data.get('pending_sales', 0)}")
            print(f"Vendas restantes: {data.get('remaining_sales', 5)}")
            
            sales = data.get('sales', [])
            print(f"Lista de vendas ({len(sales)} itens):")
            for sale in sales:
                print(f"  - Venda {sale.get('sale_number')}: {sale.get('customer_name')} - {sale.get('status')}")
            
            return True, data
        else:
            error_msg = f"Status {response.status_code}: {response.text}"
            print_result(False, "Erro na requisição", error_msg)
            return False, None
            
    except Exception as e:
        print_result(False, "Erro de conexão", str(e))
        return False, None

def test_sales_register(token):
    """Testa POST /api/sales/register"""
    print_test_header("POST /api/sales/register")
    
    # Dados de teste realistas
    sale_data = {
        "sale_number": 1,
        "customer_name": "Maria Silva Santos",
        "customer_phone": "(11) 98765-4321",
        "customer_email": "maria.santos@email.com",
        "customer_cpf": "123.456.789-00",
        "device_serial": "IGVD20240101001",
        "device_source": "leader_stock",
        "sale_value": 299.90
    }
    
    try:
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        response = requests.post(
            f"{BACKEND_URL}/sales/register",
            headers=headers,
            json=sale_data
        )
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, "Venda registrada com sucesso")
            
            sale_info = data.get('sale', {})
            print(f"ID da venda: {sale_info.get('id')}")
            print(f"Número da venda: {sale_info.get('sale_number')}")
            print(f"Cliente: {sale_info.get('customer_name')}")
            print(f"Valor: R$ {sale_info.get('sale_value')}")
            print(f"Status: {sale_info.get('status')}")
            print(f"URL do checkout: {data.get('checkout_url', 'Não disponível')}")
            
            return True, data
        elif response.status_code == 400:
            # Pode ser erro esperado se venda já existe
            error_data = response.json()
            error_detail = error_data.get('detail', response.text)
            if "Já existe uma venda registrada" in error_detail:
                print_result(True, "Endpoint funcionando - venda já existia", error_detail)
                return True, {"existing_sale": True}
            else:
                print_result(False, "Erro de validação", error_detail)
                return False, None
        else:
            error_msg = f"Status {response.status_code}: {response.text}"
            print_result(False, "Erro na requisição", error_msg)
            return False, None
            
    except Exception as e:
        print_result(False, "Erro de conexão", str(e))
        return False, None

def test_payments_create_payment(token):
    """Testa POST /api/payments/create-payment"""
    print_test_header("POST /api/payments/create-payment")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(f"{BACKEND_URL}/payments/create-payment", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, "Pagamento criado com sucesso")
            print(f"Referência: {data.get('reference_id')}")
            print(f"Valor: R$ {data.get('amount')}")
            print(f"Checkout URL: {data.get('checkout_url', 'Não disponível')}")
            print(f"Sucesso: {data.get('success')}")
            print(f"Mensagem: {data.get('message')}")
            
            return True, data
        else:
            error_msg = f"Status {response.status_code}: {response.text}"
            print_result(False, "Erro na requisição", error_msg)
            return False, None
            
    except Exception as e:
        print_result(False, "Erro de conexão", str(e))
        return False, None

def test_additional_sales_endpoints(token):
    """Testa endpoints adicionais de vendas"""
    print_test_header("ENDPOINTS ADICIONAIS DE VENDAS")
    
    # Teste GET /api/sales/my-progress
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BACKEND_URL}/sales/my-progress", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print_result(True, "GET /api/sales/my-progress")
            print(f"Progresso: {data.get('completed')}/{data.get('total')} vendas")
        else:
            print_result(False, "GET /api/sales/my-progress", f"Status {response.status_code}")
            
    except Exception as e:
        print_result(False, "GET /api/sales/my-progress", str(e))

def main():
    """Função principal do teste"""
    print("TESTE DAS ROTAS DE VENDAS E PAGAMENTO DE INSCRIÇÃO")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Testando com usuário: {LICENSEE_EMAIL}")
    print(f"Hora do teste: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Autenticar usuário
    token = authenticate_user(LICENSEE_EMAIL, LICENSEE_PASSWORD)
    if not token:
        print("\n❌ FALHA CRÍTICA: Não foi possível autenticar o usuário")
        print("Verifique as credenciais ou se o usuário existe no sistema")
        return False
    
    # Contador de sucessos
    total_tests = 0
    successful_tests = 0
    
    # Teste 1: Listar vendas do usuário
    success, _ = test_sales_my_sales(token)
    total_tests += 1
    if success:
        successful_tests += 1
    
    # Teste 2: Registrar nova venda
    success, _ = test_sales_register(token)
    total_tests += 1
    if success:
        successful_tests += 1
    
    # Teste 3: Criar pagamento de inscrição
    success, _ = test_payments_create_payment(token)
    total_tests += 1
    if success:
        successful_tests += 1
    
    # Testes adicionais
    test_additional_sales_endpoints(token)
    
    # Resumo final
    print("\n" + "=" * 60)
    print("RESUMO DOS TESTES")
    print("=" * 60)
    print(f"Total de testes principais: {total_tests}")
    print(f"Sucessos: {successful_tests}")
    print(f"Falhas: {total_tests - successful_tests}")
    print(f"Taxa de sucesso: {(successful_tests/total_tests)*100:.1f}%")
    
    if successful_tests == total_tests:
        print("\n🎉 TODOS OS TESTES PASSARAM!")
        print("✅ Todas as rotas estão funcionando corretamente")
        print("✅ POST /api/sales/register - OK")
        print("✅ GET /api/sales/my-sales - OK") 
        print("✅ POST /api/payments/create-payment - OK")
        return True
    else:
        print(f"\n⚠️ {total_tests - successful_tests} teste(s) falharam")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)