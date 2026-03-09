# 🔧 Correção: Novas Assinaturas Não Funcionavam Após Correção de CPF Duplicado

## ❌ Problema Identificado

Após aplicar a correção de CPF duplicado (que reutiliza o customer existente), as **novas assinaturas** pararam de funcionar.

### Comportamento Anterior (INCORRETO):

1. Sistema detecta customer existente (via `pagbank_customer_id` ou busca por CPF) ✅
2. Envia apenas `{"id": "CUST_XXX"}` sem `billing_info` ❌
3. PagBank não sabe qual cartão usar
4. Assinatura falha ❌

### Raiz do Problema:

Quando um usuário com CPF já cadastrado no PagBank tenta criar uma **nova assinatura** (ex: após cancelar/suspender), o sistema precisa informar ao PagBank qual cartão usar. Se envia apenas o ID do customer sem os dados do cartão, o PagBank não tem como processar o pagamento.

## ✅ Solução Implementada

**Atualizar o `billing_info` do customer ANTES de criar a assinatura.**

Conforme [documentação PagBank](https://developer.pagbank.com.br/reference/alterar-dados-de-pagamento-do-assinante):
- Endpoint: `PUT /customers/{customer_id}/billing_info`
- Atualiza os dados de pagamento do assinante

### Novo Fluxo (CORRETO):

```
1. Sistema detecta customer existente (via pagbank_customer_id ou busca CPF)
   ↓
2. Chama PUT /customers/{customer_id}/billing_info com novo cartão ✅
   ↓
3. PagBank atualiza os dados de pagamento do customer ✅
   ↓
4. Sistema cria assinatura enviando apenas {"id": "CUST_XXX"} ✅
   ↓
5. PagBank usa o cartão recém-atualizado ✅
   ↓
6. Assinatura criada com sucesso! 🎉
```

## 📋 Alterações Realizadas

### Arquivo: `/app/backend/routes/subscription_routes.py`

**Endpoint:** `POST /api/subscriptions/subscribe`

**Código Alterado (linhas 527-577):**

```python
# Preparar dados do cliente conforme documentação PagBank (2024/2025)
if pagbank_customer_id:
    # SOLUÇÃO PARA CUSTOMER EXISTENTE:
    # Primeiro, atualizar os dados do cartão (billing_info) no customer existente
    # Depois, criar a assinatura com apenas o ID
    logger.info(f"[Subscription] Customer existente encontrado: {pagbank_customer_id}")
    logger.info(f"[Subscription] Atualizando billing_info do customer antes de criar assinatura...")
    
    # Atualizar billing_info do customer com o novo cartão
    update_result = await service.update_customer_billing_info(
        customer_id=pagbank_customer_id,
        encrypted_card=subscription_request.encrypted_card,
        security_code=subscription_request.security_code
    )
    
    if not update_result.get("success"):
        error_msg = update_result.get("error", "Erro ao atualizar dados do cartão")
        logger.error(f"[Subscription] Erro ao atualizar billing_info: {error_msg}")
        raise HTTPException(
            status_code=400, 
            detail=f"Erro ao atualizar dados do cartão: {error_msg}"
        )
    
    logger.info(f"[Subscription] Billing_info atualizado com sucesso!")
    
    # Agora criar assinatura usando apenas o ID do customer
    customer_data = {
        "id": pagbank_customer_id
    }
else:
    # Se não existe, criar novo customer com dados completos
    customer_data = {
        "name": subscription_request.customer_name[:50],
        "email": subscription_request.customer_email,
        "tax_id": cpf_clean,
        "phones": [...],
        "billing_info": [{
            "type": "CREDIT_CARD",
            "card": {
                "encrypted": subscription_request.encrypted_card
            }
        }]
    }
```

## 🔄 Fluxos Cobertos

### Cenário 1: Usuário Completamente Novo
1. Sistema não encontra `pagbank_customer_id` no registro
2. Busca por CPF no PagBank → não encontra
3. Cria customer NOVO com dados completos + billing_info
4. ✅ Funciona normalmente

### Cenário 2: Usuário com customer_id Salvo
1. Sistema encontra `pagbank_customer_id` no registro existente
2. **NOVO:** Atualiza billing_info com PUT /customers/{id}/billing_info
3. Cria assinatura com apenas o ID
4. ✅ Funciona - usa cartão recém-atualizado

### Cenário 3: Usuário com CPF já Cadastrado no PagBank (sem customer_id local)
1. Sistema não encontra `pagbank_customer_id` no registro local
2. Busca por CPF no PagBank → encontra customer existente
3. **NOVO:** Atualiza billing_info com PUT /customers/{id}/billing_info
4. Cria assinatura com apenas o ID
5. ✅ Funciona - sem erro de CPF duplicado

### Cenário 4: Reativação de Assinatura Suspensa
1. Usuário tinha assinatura suspensa (customer_id salvo)
2. Tenta criar nova assinatura
3. Sistema encontra customer_id existente
4. **NOVO:** Atualiza billing_info com novo cartão
5. Cria assinatura
6. ✅ Funciona - pode usar mesmo ou novo cartão

## 📝 Logs Esperados

### Customer Existente (com atualização de billing_info):
```
[Subscription] Customer existente encontrado: CUST_ABC123
[Subscription] Atualizando billing_info do customer antes de criar assinatura...
[PagBank] Atualizando billing_info do customer: CUST_ABC123
[PagBank] Status Code: 200
[PagBank] Cartão atualizado com sucesso: {'card_last_digits': '1234', 'card_brand': 'visa'}
[Subscription] Billing_info atualizado com sucesso!
[Subscription] Usando customer existente: CUST_ABC123
[PagBank] Criando assinatura: customer=None, plan=PLAN_XYZ
```

### Customer Novo:
```
[Subscription] Criando novo customer para CPF: 123.456.789-01
[PagBank] Criando assinatura: customer=joao@email.com, plan=PLAN_XYZ
```

## ✅ Resultado Final

- ✅ Novas assinaturas funcionam para usuários novos
- ✅ Novas assinaturas funcionam para usuários com CPF já cadastrado
- ✅ Reativação de assinaturas suspensas funciona
- ✅ Usuário pode usar cartão diferente ao criar nova assinatura
- ✅ Sem erro de CPF duplicado
- ✅ Compatível com todas as correções anteriores

**Data da Correção:** $(date +%Y-%m-%d)
