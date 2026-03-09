# 📦 LISTA DE ARQUIVOS PARA APLICAR EM PRODUÇÃO

## 🔧 Correção 1: Suspender/Reativar Assinatura
## 🔧 Correção 2: Erro tax_ID Duplicado

---

## 📂 Arquivos Alterados (5 arquivos backend)

### 1️⃣ `/app/backend/models_subscription.py`
**Mudança:** Adicionado campo `pagbank_customer_id` no modelo `UserSubscription`
**Linha 131:** Novo campo para salvar ID do customer do PagBank

### 2️⃣ `/app/backend/services/pagbank_subscription_service_v2.py`
**Mudanças:**
- **Linha 544-643:** Novo método `list_customers()` - Busca customer por CPF
- **Linha 645-694:** Novo método `get_customer()` - Consulta customer por ID  
- **Linha 391-402:** Modificado `create_subscription()` - Retorna `customer_id`

### 3️⃣ `/app/backend/routes/subscription_routes.py`
**Mudanças:**
- **Linha 749-821:** Endpoint `cancel_my_subscription` - Usa SUSPEND (não CANCEL)
- **Linha 824-871:** Endpoint `admin_cancel_subscription` - Usa SUSPEND
- **Linha 875-990:** Endpoint `reactivate_my_subscription` - Chama PagBank ACTIVATE
- **Linha 993-1113:** Endpoint `admin_reactivate_subscription` - Chama PagBank ACTIVATE
- **Linha 1116-1178:** NOVO endpoint `admin_cancel_subscription_permanently` - Cancelamento definitivo
- **Linha 490-555:** Endpoint `subscribe` - Reutiliza customer existente

### 4️⃣ `/app/frontend/src/components/FinancialPanel.js`
**Mudanças:**
- **Linha 10:** Adicionado state `reactivating`
- **Linha 69-90:** Nova função `handleReactivateSubscription()`
- **Linha 102-144:** Alertas diferenciados para SUSPENDED vs CANCELLED
- **Linha 342-367:** Modal de suspensão atualizado (amarelo, mensagem clara)
- **Linha 537-555:** Botão de suspensão atualizado

### 5️⃣ `/app/frontend/src/pages/admin/AdminSubscriptions.js`
**Mudanças:**
- **Linha 192-204:** Função `handleCancelUserSubscription` - Mensagem atualizada
- **Linha 736-765:** Botões admin (Suspender/Reativar) com cores corretas

---

## 🚀 Comandos para Aplicar em Produção

### Opção 1: Substituir arquivos manualmente

```bash
# 1. Fazer backup dos arquivos atuais
cd /app
mkdir -p backup_$(date +%Y%m%d_%H%M%S)
cp backend/models_subscription.py backup_*/
cp backend/services/pagbank_subscription_service_v2.py backup_*/
cp backend/routes/subscription_routes.py backup_*/
cp frontend/src/components/FinancialPanel.js backup_*/
cp frontend/src/pages/admin/AdminSubscriptions.js backup_*/

# 2. Copiar arquivos corrigidos para produção
# (baixe os arquivos do ambiente de desenvolvimento)

# 3. Reiniciar backend
sudo supervisorctl restart backend

# 4. Verificar logs
tail -f /var/log/supervisor/backend.err.log

# 5. Testar criação de assinatura
```

---

## ✅ Checklist de Validação Pós-Deploy

### Backend:

- [ ] Backend reiniciado sem erros
- [ ] Logs não mostram erros de sintaxe
- [ ] Endpoint `/api/subscriptions/subscribe` responde

### Teste de tax_ID duplicado:

- [ ] Usuário com assinatura antiga tenta criar nova
- [ ] **SEM** erro "tax_ID already registered" ✅
- [ ] Assinatura criada com sucesso
- [ ] Logs mostram: "Reutilizando customer existente" ou "Customer encontrado no PagBank"
- [ ] Campo `pagbank_customer_id` salvo no banco

### Teste de Suspensão/Reativação:

- [ ] Suspender assinatura ativa
- [ ] Verificar no PagBank: status = SUSPENDED
- [ ] Reativar assinatura
- [ ] Verificar no PagBank: status = ACTIVE
- [ ] Acesso liberado corretamente

---

## 🎯 Resumo dos 5 Arquivos a Substituir

```
1. backend/models_subscription.py               ← Modelo com novo campo
2. backend/services/pagbank_subscription_service_v2.py  ← Métodos de busca de customer
3. backend/routes/subscription_routes.py        ← Lógica de reutilização + suspend/activate
4. frontend/src/components/FinancialPanel.js    ← UI de suspensão/reativação
5. frontend/src/pages/admin/AdminSubscriptions.js  ← UI admin
```

---

## 🆘 Troubleshooting

### Se ainda ocorrer erro de tax_ID:

```bash
# Verificar logs do backend
tail -100 /var/log/supervisor/backend.err.log | grep "PagBank\|Subscription"

# Buscar se customer_id está sendo salvo
# (no MongoDB ou logs)
```

### Logs esperados na criação de assinatura:

```
[Subscription] Criando assinatura para user=123, plan=PLN_ABC
[Subscription] Reutilizando customer existente: CUST_XYZ
[Subscription] Usando customer existente: CUST_XYZ
[PagBank] Criando assinatura: customer=joao@email.com, plan=PLN_ABC
[PagBank] Status Code: 201
[PagBank] Assinatura criada: id=SUBS_DEF
[Subscription] Customer ID salvo: CUST_XYZ
```

---

## 🎉 O que foi Corrigido

### ✅ Correção 1: Suspensão/Reativação
- Botão "Cancelar" agora **SUSPENDE** (reversível)
- Botão "Reativar" agora chama API do PagBank
- Status correto no PagBank após reativação
- UI clara: amarelo para suspensão, verde para reativação

### ✅ Correção 2: CPF Duplicado
- Sistema reutiliza customer existente automaticamente
- Busca customer por CPF antes de criar novo
- Salva `customer_id` para uso futuro
- Sem erro de tax_ID duplicado

**Sistema completo e funcional!** 🚀
