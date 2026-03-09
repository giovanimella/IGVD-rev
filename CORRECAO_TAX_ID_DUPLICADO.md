# 🔧 Correção do Erro: tax_ID Duplicado ao Criar Assinatura

## ❌ Problema Original

**Erro no PagBank:**
```
"The customer cannot be created, as there is already a customer registered 
with the informed tax_ID. Check that the data is correct and try again."
```

### Por que acontecia:

1. **Primeira assinatura do usuário:**
   - Sistema cria customer NOVO no PagBank com CPF
   - PagBank salva: `CUST_ABC123` com CPF `12345678901`
   - ✅ Funciona normalmente

2. **Usuário cancela/suspende assinatura**
   - Customer continua cadastrado no PagBank
   - CPF `12345678901` permanece associado a `CUST_ABC123`

3. **Usuário tenta criar nova assinatura:**
   - Sistema tenta criar customer NOVO com mesmo CPF ❌
   - PagBank recusa: "CPF já cadastrado" ❌
   - Assinatura não é criada ❌

### Raiz do Problema:
O código **sempre** enviava dados completos do customer (name, email, tax_id), mesmo quando o customer já existia no PagBank.

## ✅ Solução Implementada

Conforme [documentação oficial do PagBank](https://developer.pagbank.com.br/reference/criar-assinatura):

> "Se o assinante foi criado previamente, você pode fornecer apenas o `id`, 
> no formato `CUST_XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`"

### Estratégia de Reutilização de Customer:

```
1. Verificar se usuário já tem pagbank_customer_id salvo
   ↓
2. Se SIM: Usar apenas {"id": "CUST_XXXX"}
   ↓
3. Se NÃO: Buscar customer por CPF no PagBank
   ↓
4. Se encontrou: Usar o ID retornado
   ↓
5. Se não encontrou: Criar customer novo com dados completos
```

## 📋 Alterações Realizadas

### 1. Modelo de Dados (`/app/backend/models_subscription.py`)

**Adicionado campo:**
```python
class UserSubscription(BaseModel):
    # ... campos existentes ...
    pagbank_customer_id: Optional[str] = None  # ID do customer no PagBank (CUST_XXXX)
```

**Objetivo:** Salvar o customer_id retornado pelo PagBank para reutilizar em futuras assinaturas.

---

### 2. Serviço PagBank (`/app/backend/services/pagbank_subscription_service_v2.py`)

#### 2.1. Novo Método: `list_customers()`
```python
async def list_customers(self, cpf: str = None, email: str = None, name: str = None)
```

**Funcionalidade:**
- Busca customers existentes no PagBank
- Pode buscar por CPF, email ou nome
- Endpoint: `GET /customers?q={cpf}`
- Retorna lista de customers encontrados

**Uso:** Verificar se o CPF já está cadastrado antes de criar nova assinatura.

#### 2.2. Novo Método: `get_customer()`
```python
async def get_customer(self, customer_id: str)
```

**Funcionalidade:**
- Consulta customer específico pelo ID
- Endpoint: `GET /customers/{customer_id}`
- Retorna dados completos do customer

**Uso:** Validar se customer_id ainda existe no PagBank.

#### 2.3. Método Modificado: `create_subscription()`

**Agora retorna:**
```python
{
    "success": True,
    "subscription_id": "SUBS_XXXX",
    "customer_id": "CUST_XXXX",  # ← NOVO: ID do customer criado/usado
    "status": "ACTIVE",
    # ... outros campos ...
}
```

---

### 3. Endpoint de Criação (`/app/backend/routes/subscription_routes.py`)

**Endpoint:** `POST /api/subscriptions/subscribe`

#### Lógica Modificada (linhas 490-555):

```python
# 1. Verificar se usuário já tem customer_id salvo
pagbank_customer_id = None

if existing and existing.get("pagbank_customer_id"):
    # Reutilizar customer existente
    pagbank_customer_id = existing.get("pagbank_customer_id")
    logger.info(f"Reutilizando customer existente: {pagbank_customer_id}")
else:
    # Buscar customer por CPF no PagBank
    cpf_clean = ''.join(filter(str.isdigit, subscription_request.customer_cpf))
    search_result = await service.list_customers(cpf=cpf_clean)
    
    if search_result.get("success") and search_result.get("customers"):
        customers = search_result.get("customers", [])
        if len(customers) > 0:
            pagbank_customer_id = customers[0].get("id")
            logger.info(f"Customer encontrado no PagBank: {pagbank_customer_id}")

# 2. Preparar dados do customer
if pagbank_customer_id:
    # ✅ Customer existe: enviar APENAS o ID
    customer_data = {
        "id": pagbank_customer_id
    }
else:
    # ✅ Customer não existe: enviar dados completos
    customer_data = {
        "name": subscription_request.customer_name[:50],
        "email": subscription_request.customer_email,
        "tax_id": cpf_clean,
        "phones": [{...}],
        "billing_info": [{...}]
    }

# 3. Criar assinatura no PagBank
result = await service.create_subscription(...)

# 4. Salvar customer_id retornado
subscription = UserSubscription(
    # ... campos existentes ...
    pagbank_customer_id=result.get("customer_id") or pagbank_customer_id  # ← Salvar!
)
```

---

## 🔄 Fluxos Corrigidos

### Fluxo 1: Primeira Assinatura (Customer Novo)
```
Usuário preenche formulário → Sistema não encontra customer_id
↓
Sistema envia dados completos do customer
↓
PagBank cria customer: CUST_ABC123
↓
PagBank cria assinatura: SUBS_XYZ456
↓
Sistema salva customer_id: CUST_ABC123 ✅
```

### Fluxo 2: Nova Assinatura (Customer Existente)
```
Usuário preenche formulário → Sistema encontra customer_id: CUST_ABC123
↓
Sistema envia APENAS {"id": "CUST_ABC123"} ✅
↓
PagBank reutiliza customer existente ✅
↓
PagBank cria nova assinatura: SUBS_DEF789 ✅
↓
Sistema atualiza registro com nova subscription_id
```

### Fluxo 3: Assinatura após Suspensão
```
Usuário havia suspendido → customer_id salvo no banco: CUST_ABC123
↓
Usuário cria nova assinatura → Sistema reutiliza CUST_ABC123 ✅
↓
PagBank aceita e cria nova assinatura ✅
↓
Sem erro de tax_id duplicado! 🎉
```

---

## 📊 Comparação: Antes vs Depois

### ❌ ANTES (Payload que causava erro):
```json
{
  "reference_id": "user_123_abc",
  "plan": {"id": "PLN_XYZ"},
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "tax_id": "12345678901",  ← CPF DUPLICADO!
    "phones": [...],
    "billing_info": [...]
  }
}
```
**Resultado:** ❌ Erro se CPF já cadastrado

### ✅ DEPOIS (Payload correto):
```json
{
  "reference_id": "user_123_def",
  "plan": {"id": "PLN_XYZ"},
  "customer": {
    "id": "CUST_ABC123"  ← Apenas ID, sem tax_id!
  },
  "payment_method": [{
    "type": "CREDIT_CARD",
    "card": {"security_code": "123"}
  }]
}
```
**Resultado:** ✅ Funciona perfeitamente, reutiliza customer

---

## 🎯 Cenários de Teste

### Teste 1: Primeira vez (sem histórico)
1. Usuário nunca teve assinatura
2. Criar assinatura → Deve criar customer novo
3. Verificar no banco: `pagbank_customer_id` salvo ✅

### Teste 2: Reativar após suspensão
1. Usuário com assinatura suspensa (tem `pagbank_customer_id`)
2. Criar nova assinatura → Deve reutilizar customer
3. Sem erro de tax_id duplicado ✅

### Teste 3: Usuário com assinatura antiga
1. Usuário teve assinatura há muito tempo
2. Banco não tem `pagbank_customer_id` salvo
3. Sistema busca customer por CPF no PagBank
4. Encontra e reutiliza ✅

### Teste 4: Usuário completamente novo
1. CPF nunca usado no sistema nem no PagBank
2. Sistema não encontra customer_id
3. Cria customer novo com sucesso ✅

---

## 📝 Arquivos Alterados

### Backend (3 arquivos):

1. **`models_subscription.py`**
   - Adicionado campo `pagbank_customer_id` no modelo `UserSubscription`

2. **`services/pagbank_subscription_service_v2.py`**
   - Novo método `list_customers()` - Busca customer por CPF
   - Novo método `get_customer()` - Consulta customer por ID
   - Modificado `create_subscription()` - Retorna `customer_id` na resposta

3. **`routes/subscription_routes.py`**
   - Modificado endpoint `/subscribe` com lógica de reutilização de customer
   - Verifica customer_id salvo localmente
   - Busca customer por CPF no PagBank se necessário
   - Envia apenas ID se customer existe
   - Salva customer_id retornado

### Frontend:
Nenhuma alteração necessária! O frontend continua funcionando da mesma forma.

---

## 🚀 Deploy em Produção

Substituir apenas os 3 arquivos backend:

```bash
# 1. Modelo de dados
/app/backend/models_subscription.py

# 2. Serviço PagBank
/app/backend/services/pagbank_subscription_service_v2.py

# 3. Rotas de assinatura
/app/backend/routes/subscription_routes.py

# 4. Reiniciar backend
sudo supervisorctl restart backend
```

---

## 🔍 Verificação de Logs

Após aplicar em produção, os logs devem mostrar:

**Customer reutilizado:**
```
[Subscription] Reutilizando customer existente: CUST_ABC123
[Subscription] Usando customer existente: CUST_ABC123
```

**Customer buscado no PagBank:**
```
[PagBank] Buscando customer por CPF: 12345678901
[PagBank] Encontrados 1 customer(s)
[Subscription] Customer encontrado no PagBank: CUST_ABC123
```

**Customer novo criado:**
```
[Subscription] Criando novo customer para CPF: 123.456.789-01
[PagBank] Criando assinatura: customer=joao@email.com, plan=PLN_XYZ
```

---

## ⚠️ Importante

1. **Migração de dados existentes:**
   - Assinaturas antigas não têm `pagbank_customer_id` salvo
   - Na próxima criação de assinatura, sistema buscará por CPF automaticamente
   - Não precisa migração manual

2. **Retrocompatibilidade:**
   - Sistema funciona para usuários novos e antigos
   - Busca automática garante reutilização de customers

3. **Performance:**
   - Busca por CPF é rápida (índice no PagBank)
   - Executada apenas se customer_id não estiver no banco

4. **Segurança:**
   - Customer_id não permite acesso aos dados sensíveis
   - Apenas referencia o cadastro no PagBank

---

## ✅ Resultado Final

- ✅ Usuários podem criar assinatura mesmo tendo histórico anterior
- ✅ System reutiliza customer existente automaticamente
- ✅ Sem erro de tax_id duplicado
- ✅ Funciona para suspensão/reativação
- ✅ Logs detalhados para debugging

**O erro de CPF duplicado está resolvido!** 🎉
