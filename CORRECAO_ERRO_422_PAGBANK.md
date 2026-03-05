# 🔧 Correção do Erro 422 - Criação de Assinatura PagBank

## 📌 Problema Identificado

Ao tentar criar uma assinatura no PagBank, o sistema retornava erro **422 Unprocessable Entity**.

### Causa Raiz

O payload enviado para a API do PagBank estava com estrutura **incorreta** em três campos principais:

---

## ❌ Estrutura INCORRETA (Antes)

```python
customer_data = {
    "name": "João Silva",
    "email": "joao@example.com",
    "tax_id": "12345678901",
    "phone": {  # ❌ ERRO: deveria ser "phones" (plural, array)
        "area_code": "11",
        "number": "999999999"
    },
    "billing_info": [{  # ❌ ERRO: não deveria ser array, nem ter "type"
        "type": "BILLING",
        "address": {
            "street": "Rua Teste",
            "number": "123",
            "complement": "Apto 45",
            "district": "Centro",  # ❌ ERRO: deveria ser "neighborhood"
            "city": "São Paulo",
            "state": "SP",
            "postal_code": "01234567"  # ❌ ERRO: deveria ser "zip_code"
        }
    }]
}
```

---

## ✅ Estrutura CORRETA (Depois)

```python
customer_data = {
    "name": "João Silva",
    "email": "joao@example.com",
    "tax_id": "12345678901",
    "phones": [{  # ✅ CORRETO: array de telefones
        "country_code": "55",  # ✅ Código do país (Brasil)
        "area_code": "11",
        "number": "999999999",
        "type": "MOBILE"  # ✅ Tipo do telefone
    }],
    "billing_info": {  # ✅ CORRETO: objeto (não array)
        "address": {  # ✅ Sem campo "type"
            "street": "Rua Teste",
            "number": "123",
            "complement": "Apto 45",
            "neighborhood": "Centro",  # ✅ "neighborhood" ao invés de "district"
            "city": "São Paulo",
            "state": "SP",
            "zip_code": "01234567"  # ✅ "zip_code" ao invés de "postal_code"
        }
    }
}
```

---

## 🛠️ Mudanças Implementadas

### Arquivo: `/app/backend/routes/subscription_routes.py`

**Linha 360-381**: Corrigida a estrutura do `customer_data`

#### Mudanças específicas:

1. **Campo `phone` → `phones`**
   - De: `"phone": { "area_code": "11", "number": "999999999" }`
   - Para: `"phones": [{ "country_code": "55", "area_code": "11", "number": "999999999", "type": "MOBILE" }]`

2. **Campo `billing_info`**
   - De: `"billing_info": [{ "type": "BILLING", "address": {...} }]`
   - Para: `"billing_info": { "address": {...} }`

3. **Campos do endereço**
   - `"district"` → `"neighborhood"`
   - `"postal_code"` → `"zip_code"`
   - `"state"` agora usa `.upper()` para garantir formato em maiúsculas

### Arquivo: `/app/backend/services/pagbank_subscription_service_v2.py`

**Linha 282-290**: Adicionados logs detalhados para debug

```python
logger.info(f"[PagBank] Payload enviado: {payload}")
logger.info(f"[PagBank] Status Code: {response.status_code}")
logger.info(f"[PagBank] Response: {response.text}")
```

---

## 📚 Referência da Documentação Oficial

Baseado na documentação oficial do PagBank:
- https://developer.pagbank.com.br/reference/criar-assinatura
- https://developer.pagbank.com.br/docs/assinaturas

### Campos obrigatórios para `customer`:

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | ✅ Sim | Nome completo do assinante |
| `email` | string | ✅ Sim | Email do assinante |
| `tax_id` | string | ✅ Sim | CPF/CNPJ sem formatação |
| `phones` | array | ✅ Sim | Lista de telefones (mínimo 1) |

### Estrutura do `phones`:

```json
{
  "country_code": "55",    // Código do país (55 = Brasil)
  "area_code": "11",       // DDD
  "number": "999999999",   // Número sem zeros à esquerda
  "type": "MOBILE"         // MOBILE ou FIXED
}
```

### Estrutura do `billing_info`:

```json
{
  "address": {
    "street": "Rua Exemplo",
    "number": "123",
    "complement": "Apto 45",      // Opcional
    "neighborhood": "Bairro",
    "city": "São Paulo",
    "state": "SP",                 // 2 letras maiúsculas
    "zip_code": "01234567"        // CEP sem traço
  }
}
```

---

## ✅ Status

- ✅ **Correção implementada**
- ✅ **Código validado** (sem erros de sintaxe)
- ✅ **Backend rodando** corretamente
- ⏳ **Aguardando teste** com dados reais de assinatura

---

## 🧪 Próximos Passos

1. Testar criação de assinatura com dados reais no frontend
2. Verificar se o erro 422 foi resolvido
3. Validar fluxo completo de onboarding
4. Testar cenários de inadimplência

---

## 📝 Notas Adicionais

- As mudanças seguem **exatamente** a estrutura da API oficial do PagBank (2025)
- Logs detalhados foram adicionados para facilitar debugging futuro
- O ambiente sandbox está configurado para testes seguros
- Todas as mudanças são retrocompatíveis com o restante do sistema

---

**Data da correção**: 05/03/2026  
**Versão**: 1.0  
**Agente**: E1 Fork
