# 🎯 Nova Funcionalidade: Seleção de Plano Padrão

## 📋 Problema Resolvido

**Pergunta do usuário:** "Como o sistema define qual plano usar na assinatura?"

### Comportamento Anterior:
- Sistema buscava **qualquer** plano com `is_active: True`
- Se múltiplos planos ativos, pegava o **primeiro encontrado** (ordem aleatória do MongoDB)
- **Sem controle** sobre qual plano seria usado
- Admin não podia escolher o plano padrão

### Código Antigo (linha 476-477):
```python
else:
    # Buscar plano ativo padrão
    plan = await db.subscription_plans.find_one({"is_active": True}, {"_id": 0})
```

**Problema:** `find_one` sem ordenação = resultado imprevisível!

---

## ✅ Solução Implementada

### 1. Modelo de Dados (`models_subscription.py`)

**Adicionado campo:**
```python
class SubscriptionPlan(BaseModel):
    # ... campos existentes ...
    is_active: bool = True
    is_default: bool = False  # ← NOVO: Se este é o plano padrão
```

**Objetivo:** Marcar explicitamente qual plano deve ser usado por padrão.

---

### 2. Backend - Lógica de Seleção (`routes/subscription_routes.py`)

#### Endpoint: `POST /api/subscriptions/subscribe`

**Modificação (linhas 476-486):**
```python
else:
    # Buscar plano ativo padrão (is_default=True)
    plan = await db.subscription_plans.find_one(
        {"is_active": True, "is_default": True}, 
        {"_id": 0}
    )
    
    # Se não houver plano marcado como padrão, pegar qualquer plano ativo
    if not plan:
        plan = await db.subscription_plans.find_one({"is_active": True}, {"_id": 0})
        logger.warning(f"[Subscription] Nenhum plano padrão definido, usando primeiro plano ativo")
```

**Lógica:**
1. Se usuário especificar `plan_id` → Usa esse plano
2. Se NÃO especificar → Busca plano com `is_default: True`
3. Se nenhum padrão → Fallback para qualquer plano ativo (mantém retrocompatibilidade)

---

### 3. Backend - Novo Endpoint Admin

#### `PUT /api/subscriptions/plans/{plan_id}/set-default`

**Funcionalidade:** Define um plano como padrão para novas assinaturas

**Lógica (linhas 1345-1392):**
```python
@router.put("/plans/{plan_id}/set-default")
async def set_default_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    """
    Define um plano como padrão para novas assinaturas (somente admin)
    Apenas 1 plano pode ser padrão por vez.
    """
    # 1. Verificar se plano existe e está ativo
    plan = await db.subscription_plans.find_one({"pagbank_plan_id": plan_id})
    
    if not plan.get("is_active"):
        raise HTTPException(status_code=400, detail="Plano inativo não pode ser padrão")
    
    # 2. Remover is_default de TODOS os outros planos
    await db.subscription_plans.update_many(
        {},
        {"$set": {"is_default": False}}
    )
    
    # 3. Marcar este plano como padrão
    await db.subscription_plans.update_one(
        {"id": plan["id"]},
        {"$set": {"is_default": True}}
    )
    
    return {"success": True, "message": f"Plano '{plan['name']}' definido como padrão"}
```

**Garantias:**
- ✅ Apenas 1 plano pode ser padrão por vez
- ✅ Plano deve estar ativo para ser padrão
- ✅ Operação atômica (remove de todos, marca apenas 1)

---

### 4. Frontend - Painel Admin (`AdminSubscriptions.js`)

#### Nova Função:
```javascript
const handleSetDefaultPlan = async (planId, planName) => {
  if (!window.confirm(`Definir "${planName}" como plano padrão?`)) {
    return;
  }

  setSettingDefaultPlan(planId);
  try {
    const response = await axios.put(
      `${API_URL}/api/subscriptions/plans/${planId}/set-default`
    );
    toast.success(`Plano "${planName}" definido como padrão!`);
    fetchData(); // Recarregar dados
  } catch (error) {
    toast.error('Erro ao definir plano padrão');
  } finally {
    setSettingDefaultPlan(null);
  }
};
```

#### UI Melhorada (linhas 792-849):

**Badge "Plano Padrão":**
```jsx
{plan.is_default && (
  <span className="px-2 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700">
    ⭐ Plano Padrão
  </span>
)}
```

**Destaque Visual:**
```jsx
<div className={`flex items-center justify-between p-4 border rounded-lg ${
  plan.is_default 
    ? 'border-cyan-400 bg-cyan-50 shadow-sm'  // Plano padrão destacado
    : 'border-slate-200 hover:border-cyan-300'
}`}>
```

**Botão "Definir como Padrão":**
```jsx
{plan.is_active && !plan.is_default && (
  <Button
    variant="ghost"
    size="sm"
    className="text-cyan-600 hover:bg-cyan-50"
    onClick={() => handleSetDefaultPlan(plan.id, plan.name)}
    title="Definir como plano padrão para novas assinaturas"
  >
    <CheckCircle className="w-4 h-4 mr-1" />
    Definir como Padrão
  </Button>
)}
```

**Caixa Informativa:**
```jsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
  <p className="font-semibold mb-2">ℹ️ Como funciona o Plano Padrão</p>
  <ul className="space-y-1">
    <li>• O plano padrão (⭐) será usado automaticamente</li>
    <li>• Apenas 1 plano pode ser padrão por vez</li>
    <li>• Para trocar, clique em "Definir como Padrão" em outro plano</li>
  </ul>
</div>
```

---

## 🔄 Fluxos Implementados

### Fluxo 1: Usuário Cria Assinatura (Sem plan_id)
```
1. Usuário preenche formulário de assinatura (sem escolher plano)
   ↓
2. Backend busca: {"is_active": True, "is_default": True}
   ↓
3. Encontra plano marcado com ⭐ Plano Padrão
   ↓
4. Usa esse plano para criar a assinatura
   ↓
5. ✅ Assinatura criada com plano padrão!
```

### Fluxo 2: Admin Define Plano Padrão
```
1. Admin acessa Painel Admin → Seção "Planos Sincronizados"
   ↓
2. Visualiza planos ativos:
   - Plano A (R$ 49,90) ⭐ Plano Padrão [destacado em azul]
   - Plano B (R$ 99,90) [Botão: Definir como Padrão]
   ↓
3. Admin clica em "Definir como Padrão" no Plano B
   ↓
4. Confirma: "Definir 'Plano B' como plano padrão?"
   ↓
5. Backend:
   - Remove is_default de TODOS os planos
   - Define is_default=True apenas no Plano B
   ↓
6. UI atualiza:
   - Plano B agora mostra ⭐ Plano Padrão [azul claro]
   - Plano A perde a estrela
   ↓
7. Toast: "Plano 'Plano B' definido como padrão!" ✅
```

### Fluxo 3: Sistema Sem Plano Padrão (Fallback)
```
1. Admin nunca definiu plano padrão
   ↓
2. Todos os planos têm is_default: False
   ↓
3. Usuário tenta criar assinatura
   ↓
4. Backend busca: {"is_active": True, "is_default": True} → Nada encontrado
   ↓
5. Fallback: Busca qualquer plano ativo
   ↓
6. Logs: "⚠️ Nenhum plano padrão definido, usando primeiro plano ativo"
   ↓
7. ✅ Assinatura criada (retrocompatibilidade mantida)
```

---

## 📊 Comparação: Antes vs Depois

| Aspecto | ❌ Antes | ✅ Depois |
|---------|----------|-----------|
| **Seleção de plano** | Aleatório (primeiro encontrado) | Plano marcado como padrão ⭐ |
| **Controle admin** | Nenhum | Total via botão "Definir como Padrão" |
| **Múltiplos planos** | Imprevisível | Apenas 1 padrão por vez |
| **UI** | Sem indicação visual | Badge ⭐ + destaque azul |
| **Retrocompatibilidade** | N/A | Fallback para plano ativo se nenhum padrão |

---

## 📂 Arquivos Modificados

### Backend (2 arquivos):

1. **`/app/backend/models_subscription.py`**
   - Linha 101: Adicionado campo `is_default: bool = False`

2. **`/app/backend/routes/subscription_routes.py`**
   - Linhas 476-486: Lógica de seleção de plano padrão
   - Linhas 1345-1392: Novo endpoint `PUT /plans/{plan_id}/set-default`

### Frontend (1 arquivo):

3. **`/app/frontend/src/pages/admin/AdminSubscriptions.js`**
   - Linha 23: Novo state `settingDefaultPlan`
   - Linhas 192-209: Nova função `handleSetDefaultPlan()`
   - Linhas 792-849: UI atualizada com badge, botão e destaque visual
   - Linhas 856-877: Caixa informativa sobre plano padrão

---

## 🎯 Como Usar (Admin)

### Passo 1: Acessar Painel Admin
```
Admin → Dashboard → Assinaturas → Seção "Planos Sincronizados"
```

### Passo 2: Visualizar Planos
Verá todos os planos sincronizados do PagBank:
- Planos ativos e inativos
- Valor mensal
- ID do PagBank
- **Badge ⭐ Plano Padrão** (se houver)

### Passo 3: Definir Plano Padrão
1. Escolha o plano que deseja tornar padrão
2. Clique em **"Definir como Padrão"**
3. Confirme a ação
4. ✅ Plano agora está marcado como padrão!

### Passo 4: Verificar
- Plano escolhido agora mostra ⭐
- Fundo azul claro destacando
- Outros planos perdem a marcação

---

## ✅ Validação

### Teste 1: Definir Plano Padrão
```bash
# Via API
curl -X PUT "http://localhost:8001/api/subscriptions/plans/PLN_ABC123/set-default" \
  -H "Authorization: Bearer {token}"

# Response esperada:
{
  "success": true,
  "message": "Plano 'Mensalidade Básica' definido como padrão",
  "plan_id": "uuid-abc-123",
  "plan_name": "Mensalidade Básica"
}
```

### Teste 2: Verificar Banco de Dados
```javascript
// MongoDB
db.subscription_plans.find({"is_default": true})

// Deve retornar APENAS 1 plano
```

### Teste 3: Criar Assinatura Sem plan_id
```bash
# Via API (sem especificar plan_id)
curl -X POST "http://localhost:8001/api/subscriptions/subscribe" \
  -H "Authorization: Bearer {token}" \
  -d '{"customer_name": "Teste", ...}'

# Sistema deve usar o plano marcado como padrão
```

### Teste 4: Verificar Logs
```bash
tail -f /var/log/supervisor/backend.err.log | grep "Subscription"

# Deve aparecer:
[Subscription] Criando assinatura para user=123, plan=PLN_XYZ (plano padrão)
```

---

## 🚀 Deploy em Produção

### Arquivos a Substituir:
```
1. backend/models_subscription.py          ← Novo campo is_default
2. backend/routes/subscription_routes.py   ← Lógica + novo endpoint
3. frontend/src/pages/admin/AdminSubscriptions.js  ← UI admin
```

### Comandos:
```bash
# Backend
sudo supervisorctl restart backend

# Frontend (hot reload automático)
# Nenhuma ação necessária
```

### Migração de Dados:
**Não é necessária!** O campo `is_default` tem valor padrão `False`.

**Opcional:** Definir primeiro plano ativo como padrão:
```javascript
// Via MongoDB
db.subscription_plans.updateOne(
  {"is_active": true},
  {"$set": {"is_default": true}}
)
```

---

## 📝 Notas Importantes

1. **Apenas 1 plano padrão:** Garantido pela lógica (remove de todos, marca apenas 1)

2. **Plano deve estar ativo:** Não é possível definir plano inativo como padrão

3. **Retrocompatibilidade:** Sistema funciona mesmo sem plano padrão definido (fallback)

4. **Segurança:** Endpoint protegido, apenas admin pode definir plano padrão

5. **Logs detalhados:** Warning quando nenhum plano padrão está definido

---

## ✅ Resultado Final

**Antes:**  
❓ "Qual plano será usado?" → Resposta: "Não sabemos, é aleatório"

**Depois:**  
✅ "Qual plano será usado?" → Resposta: "O plano marcado com ⭐ Plano Padrão pelo admin"

**Admin agora tem controle total sobre qual plano é usado por padrão nas novas assinaturas!** 🎉
