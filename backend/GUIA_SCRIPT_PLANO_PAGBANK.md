# 📋 Guia de Uso - Script de Criação de Plano PagBank

## 📍 Localização do Script

```
/app/backend/create_pagbank_plan.py
```

## 🎯 Objetivo

Criar um plano de pagamento recorrente (assinatura mensal) no ambiente **sandbox** do PagBank.

---

## ⚙️ Configuração Prévia

### 1. Instalar Dependências

O script usa apenas a biblioteca `requests`, que já está instalada no projeto.

Se precisar instalar manualmente:
```bash
pip install requests
```

### 2. Configurar Token

O script lê o token da variável de ambiente `PAGBANK_TOKEN_SANDBOX`.

#### Opção A: Exportar temporariamente (válido apenas para a sessão atual)
```bash
export PAGBANK_TOKEN_SANDBOX="seu-token-aqui"
```

#### Opção B: Adicionar no arquivo `.env` do backend
```bash
echo 'PAGBANK_TOKEN_SANDBOX="seu-token-aqui"' >> /app/backend/.env
```

#### Opção C: Executar inline (uma linha)
```bash
PAGBANK_TOKEN_SANDBOX="seu-token-aqui" python3 /app/backend/create_pagbank_plan.py
```

---

## 🚀 Como Executar

### Execução Básica
```bash
cd /app/backend
python3 create_pagbank_plan.py
```

### Com variável de ambiente inline
```bash
PAGBANK_TOKEN_SANDBOX="2e612a91-9457-4087-82a7-eaec13da02f91e06e1e44559af96ce205e03862a06bf4b39-9ae4-4659-bb25-4da21732297a" \
python3 create_pagbank_plan.py
```

---

## 📊 Estrutura do Plano Criado

O script cria um plano com as seguintes características:

| Campo | Valor |
|-------|-------|
| **Nome** | Plano Teste API |
| **Referência** | plano_teste_api |
| **Período** | MONTHLY (Mensal) |
| **Valor** | R$ 49,90 |
| **Cobrança** | AUTO (Automática) |
| **Meio de Pagamento** | CREDITCARD (Cartão de Crédito) |

---

## ✅ Saída Esperada (Sucesso)

```
============================================================
🚀 CRIANDO PLANO DE PAGAMENTO RECORRENTE - PAGBANK SANDBOX
============================================================

ℹ️  Verificando variável de ambiente: PAGBANK_TOKEN_SANDBOX
✅ Token encontrado (100 caracteres)

ℹ️  Construindo payload do plano...
✅ Payload construído:
{
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

ℹ️  URL: https://sandbox.api.pagseguro.com/pre-approvals/request
ℹ️  Método: POST

ℹ️  Enviando requisição para PagBank...

============================================================
📥 RESPOSTA DA API
============================================================

Status Code: 200

Response JSON:
{
  "code": "ABC123XYZ",
  "date": "2026-03-05T10:30:00-03:00"
}

============================================================
✅ Plano criado com sucesso!

ℹ️  Código do Plano: ABC123XYZ
ℹ️  Data de Criação: 2026-03-05T10:30:00-03:00

============================================================
✅ Script executado com sucesso!
============================================================
```

---

## ❌ Saída de Erro (Exemplos)

### Erro 1: Token não configurado
```
============================================================
🚀 CRIANDO PLANO DE PAGAMENTO RECORRENTE - PAGBANK SANDBOX
============================================================

ℹ️  Verificando variável de ambiente: PAGBANK_TOKEN_SANDBOX
❌ Token não encontrado!
❌ Configure a variável de ambiente: PAGBANK_TOKEN_SANDBOX

Exemplo:
  export PAGBANK_TOKEN_SANDBOX='seu-token-aqui'

============================================================
❌ Script finalizado com erros.
============================================================
```

### Erro 2: Token inválido (401)
```
Status Code: 401

Response JSON:
{
  "error": "Unauthorized",
  "message": "Invalid token"
}

============================================================
❌ Falha ao criar plano! (HTTP 401)

❌ Erro: Unauthorized
```

### Erro 3: Erro de conexão
```
ℹ️  Enviando requisição para PagBank...

❌ Erro de conexão!
❌ Não foi possível conectar ao PagBank: Connection refused
```

---

## 🔧 Personalização do Plano

Para alterar os valores do plano, edite a função `build_plan_payload()` no script:

```python
def build_plan_payload() -> Dict[str, Any]:
    payload = {
        "reference": "meu_plano_personalizado",  # ← Alterar aqui
        "pre_approval": {
            "name": "Meu Plano",                 # ← Alterar aqui
            "charge": "AUTO",
            "period": "MONTHLY",                  # MONTHLY, YEARLY, etc
            "amount_per_payment": "99.90"        # ← Alterar aqui
        },
        "payment_method": {
            "type": "CREDITCARD"
        }
    }
    return payload
```

---

## 📝 Códigos de Status HTTP

| Código | Significado | Ação |
|--------|-------------|------|
| **200** | Sucesso | Plano criado ✅ |
| **201** | Criado | Plano criado ✅ |
| **400** | Bad Request | Verificar payload |
| **401** | Unauthorized | Token inválido |
| **403** | Forbidden | Sem permissão |
| **422** | Unprocessable | Dados inválidos |
| **500** | Server Error | Erro no PagBank |

---

## 🧪 Testando o Script

### Teste Rápido (Dry Run)
```bash
# Verificar se o script está correto
python3 -m py_compile /app/backend/create_pagbank_plan.py
echo "✅ Syntax OK"
```

### Teste com Token Real
```bash
cd /app/backend

# Usar o token do sistema
TOKEN=$(python3 -c "
from motor.motor_asyncio import AsyncIOMotorClient
import os, asyncio
from dotenv import load_dotenv
load_dotenv('.env')
async def get_token():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db = client[os.getenv('DB_NAME')]
    settings = await db.subscription_settings.find_one({}, {'_id': 0})
    print(settings.get('pagbank_token', ''))
    client.close()
asyncio.run(get_token())
")

# Executar script
PAGBANK_TOKEN_SANDBOX="$TOKEN" python3 create_pagbank_plan.py
```

---

## 📚 Documentação Oficial

- **API PagBank**: https://developer.pagbank.com.br/reference
- **Endpoint específico**: https://developer.pagbank.com.br/reference/criar-plano-de-assinatura
- **Ambiente Sandbox**: https://developer.pagbank.com.br/docs/sandbox

---

## 🆘 Troubleshooting

### Problema: "ModuleNotFoundError: No module named 'requests'"
**Solução**:
```bash
pip install requests
```

### Problema: "Token não encontrado"
**Solução**:
```bash
# Verificar se a variável está definida
echo $PAGBANK_TOKEN_SANDBOX

# Se vazia, definir:
export PAGBANK_TOKEN_SANDBOX="seu-token-aqui"
```

### Problema: "Connection refused"
**Solução**:
- Verificar conexão com internet
- Verificar se a URL do sandbox está correta
- Tentar novamente após alguns minutos

---

## 💡 Dicas

1. **Sempre teste em sandbox primeiro** antes de usar em produção
2. **Guarde o código do plano** retornado pela API
3. **Não compartilhe tokens** publicamente
4. **Use .env para tokens** em produção

---

**Última atualização**: 05/03/2026  
**Versão do Script**: 1.0  
**Status**: ✅ Testado e Funcionando
