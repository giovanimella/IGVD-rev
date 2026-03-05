#!/usr/bin/env python3
"""
Script para criar Plano de Pagamento Recorrente no PagBank (Sandbox)

Autor: Sistema UniOzoxx
Data: 05/03/2026
Versão: 1.0

Descrição:
    Este script cria um plano de assinatura recorrente no ambiente sandbox do PagBank.
    O plano configurado é cobrado automaticamente todo mês no valor de R$ 49,90.

Uso:
    1. Configure a variável de ambiente PAGBANK_TOKEN_SANDBOX
    2. Execute: python create_pagbank_plan.py
"""

import os
import sys
import json
import requests
from typing import Dict, Any


# ==================== CONFIGURAÇÕES ====================

# URL base do ambiente sandbox PagBank
SANDBOX_BASE_URL = "https://sandbox.api.pagseguro.com"

# Endpoint para criar plano de assinatura
PLAN_ENDPOINT = "/pre-approvals/request"

# Nome da variável de ambiente que contém o token
TOKEN_ENV_VAR = "PAGBANK_TOKEN_SANDBOX"


# ==================== FUNÇÕES AUXILIARES ====================

def print_separator(char: str = "=", length: int = 60):
    """Imprime uma linha separadora para melhor visualização dos logs"""
    print(char * length)


def print_success(message: str):
    """Imprime mensagem de sucesso em verde"""
    print(f"✅ {message}")


def print_error(message: str):
    """Imprime mensagem de erro em vermelho"""
    print(f"❌ {message}")


def print_info(message: str):
    """Imprime mensagem informativa"""
    print(f"ℹ️  {message}")


def validate_token() -> str:
    """
    Valida se o token do PagBank existe na variável de ambiente
    
    Returns:
        str: Token do PagBank
        
    Raises:
        SystemExit: Se o token não for encontrado
    """
    print_info(f"Verificando variável de ambiente: {TOKEN_ENV_VAR}")
    
    token = os.getenv(TOKEN_ENV_VAR)
    
    if not token:
        print_error(f"Token não encontrado!")
        print_error(f"Configure a variável de ambiente: {TOKEN_ENV_VAR}")
        print()
        print("Exemplo:")
        print(f"  export {TOKEN_ENV_VAR}='seu-token-aqui'")
        sys.exit(1)
    
    print_success(f"Token encontrado ({len(token)} caracteres)")
    return token


def build_plan_payload() -> Dict[str, Any]:
    """
    Constrói o payload para criar o plano de assinatura
    
    Returns:
        dict: Payload formatado conforme API do PagBank
    """
    payload = {
        "reference": "plano_teste_api",
        "pre_approval": {
            "name": "Plano Teste API",
            "charge": "AUTO",
            "period": "MONTHLY",
            "amount_per_payment": "49.90"
        },
        "payment_method": {
            "type": "CREDITCARD"
        }
    }
    
    return payload


# ==================== FUNÇÃO PRINCIPAL ====================

def create_recurring_plan() -> Dict[str, Any]:
    """
    Cria um plano de pagamento recorrente no PagBank Sandbox
    
    Esta função:
    1. Valida o token de autenticação
    2. Monta o payload do plano
    3. Envia requisição POST para a API do PagBank
    4. Retorna a resposta formatada
    
    Returns:
        dict: Resposta da API contendo dados do plano criado ou erro
        
    Exemplo de retorno (sucesso):
        {
            "success": True,
            "status_code": 200,
            "data": {
                "code": "ABC123",
                "date": "2026-03-05T10:00:00-03:00"
            }
        }
        
    Exemplo de retorno (erro):
        {
            "success": False,
            "status_code": 400,
            "error": "Detalhes do erro"
        }
    """
    
    print_separator()
    print("🚀 CRIANDO PLANO DE PAGAMENTO RECORRENTE - PAGBANK SANDBOX")
    print_separator()
    print()
    
    # Passo 1: Validar token
    try:
        token = validate_token()
    except SystemExit:
        return {
            "success": False,
            "error": "Token não configurado"
        }
    
    print()
    
    # Passo 2: Construir payload
    print_info("Construindo payload do plano...")
    payload = build_plan_payload()
    
    print_success("Payload construído:")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    print()
    
    # Passo 3: Preparar requisição
    url = f"{SANDBOX_BASE_URL}{PLAN_ENDPOINT}"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    print_info(f"URL: {url}")
    print_info(f"Método: POST")
    print()
    
    # Passo 4: Enviar requisição
    print_info("Enviando requisição para PagBank...")
    print()
    
    try:
        response = requests.post(
            url=url,
            json=payload,
            headers=headers,
            timeout=30
        )
        
        # Passo 5: Processar resposta
        print_separator()
        print("📥 RESPOSTA DA API")
        print_separator()
        print()
        
        print(f"Status Code: {response.status_code}")
        print()
        
        # Tentar parsear JSON da resposta
        try:
            response_data = response.json()
            print("Response JSON:")
            print(json.dumps(response_data, indent=2, ensure_ascii=False))
        except json.JSONDecodeError:
            print("Response Text:")
            print(response.text)
            response_data = {"raw": response.text}
        
        print()
        print_separator()
        
        # Verificar sucesso
        if response.status_code in [200, 201]:
            print_success("Plano criado com sucesso!")
            print()
            
            # Extrair informações importantes
            if isinstance(response_data, dict):
                plan_code = response_data.get("code")
                plan_date = response_data.get("date")
                
                if plan_code:
                    print_info(f"Código do Plano: {plan_code}")
                if plan_date:
                    print_info(f"Data de Criação: {plan_date}")
            
            return {
                "success": True,
                "status_code": response.status_code,
                "data": response_data
            }
        else:
            print_error(f"Falha ao criar plano! (HTTP {response.status_code})")
            print()
            
            # Extrair mensagem de erro se disponível
            if isinstance(response_data, dict):
                error_msg = response_data.get("message") or response_data.get("error")
                if error_msg:
                    print_error(f"Erro: {error_msg}")
            
            return {
                "success": False,
                "status_code": response.status_code,
                "error": response_data
            }
    
    except requests.exceptions.ConnectionError as e:
        print_error("Erro de conexão!")
        print_error(f"Não foi possível conectar ao PagBank: {str(e)}")
        return {
            "success": False,
            "error": f"ConnectionError: {str(e)}"
        }
    
    except requests.exceptions.Timeout as e:
        print_error("Timeout!")
        print_error(f"A requisição demorou mais de 30 segundos: {str(e)}")
        return {
            "success": False,
            "error": f"Timeout: {str(e)}"
        }
    
    except requests.exceptions.RequestException as e:
        print_error("Erro na requisição!")
        print_error(f"Detalhes: {str(e)}")
        return {
            "success": False,
            "error": f"RequestException: {str(e)}"
        }
    
    except Exception as e:
        print_error("Erro inesperado!")
        print_error(f"Detalhes: {str(e)}")
        return {
            "success": False,
            "error": f"Exception: {str(e)}"
        }


# ==================== EXECUÇÃO PRINCIPAL ====================

if __name__ == "__main__":
    """
    Executa o script quando chamado diretamente
    """
    
    # Executar função principal
    result = create_recurring_plan()
    
    # Determinar código de saída
    exit_code = 0 if result.get("success") else 1
    
    print()
    print_separator()
    
    if exit_code == 0:
        print_success("Script executado com sucesso!")
    else:
        print_error("Script finalizado com erros.")
    
    print_separator()
    
    sys.exit(exit_code)
