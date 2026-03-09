# 👥 Usuários de Teste - Sistema IGVD

## 🔑 Credenciais Disponíveis

### 1️⃣ ADMIN (Controle Total)
```
📧 Email: admin@ozoxx.com
🔒 Senha: admin123
👤 Papel: Administrador
```

**Permissões:**
- ✅ Acesso ao painel admin completo
- ✅ Gerenciar todos os usuários
- ✅ Configurar Token PagBank
- ✅ Sincronizar planos do PagBank
- ✅ **Definir plano padrão ⭐**
- ✅ Ver todas as assinaturas
- ✅ Suspender/reativar qualquer assinatura
- ✅ Cancelar definitivamente assinaturas
- ✅ Ver estatísticas completas
- ✅ Gerenciar módulos, campanhas, reuniões, etc.

---

### 2️⃣ LICENCIADO 1 (Usuário Final)
```
📧 Email: teste@ozoxx.com
🔒 Senha: teste123
👤 Papel: Licenciado
```

**Permissões:**
- ✅ Criar sua própria assinatura
- ✅ Suspender sua assinatura
- ✅ Reativar sua assinatura
- ✅ Atualizar cartão de crédito
- ✅ Ver histórico de pagamentos
- ✅ Acessar módulos de treinamento
- ✅ Participar de reuniões
- ✅ Resgatar recompensas

---

### 3️⃣ LICENCIADO 2 (Usuário Final)
```
📧 Email: teste2@ozoxx.com
🔒 Senha: teste123
👤 Papel: Licenciado
👤 Nome: João Silva Teste
```

**Permissões:**
- Mesmas do Licenciado 1
- Útil para testar múltiplas assinaturas simultâneas

---

## 🧪 Roteiro de Testes

### 📋 TESTE 1: Configuração Inicial (Admin)

**Login:** admin@ozoxx.com / admin123

1. **Ir para:** Admin → Assinaturas
2. **Configurar PagBank:**
   - Colar Token Bearer (sandbox ou produção)
   - Salvar configurações
   - Clicar em "Testar Conexão" → Deve retornar sucesso ✅
3. **Gerar Chave Pública:**
   - Clicar em "Gerar Chave Pública"
   - Aguardar confirmação
4. **Sincronizar Planos:**
   - Clicar em "Sincronizar Planos"
   - Verificar planos importados do PagBank
5. **Definir Plano Padrão:**
   - Na lista "Planos Sincronizados"
   - Clicar em "Definir como Padrão" no plano desejado
   - Verificar badge ⭐ Plano Padrão

---

### 📋 TESTE 2: Criar Assinatura (Licenciado)

**Login:** teste@ozoxx.com / teste123

1. **Ir para:** Painel Financeiro
2. **Clicar em:** "Assinar Agora" ou "Criar Assinatura"
3. **Preencher Formulário:**
   - Nome: Usuário Teste
   - CPF: 123.456.789-01
   - Telefone: (11) 99999-9999
   - **Cartão de teste PagBank Sandbox:**
     - Número: 4514 1611 2211 3757
     - Nome: TESTE
     - Validade: 12/30
     - CVV: 123
4. **Enviar:**
   - Sistema deve criptografar cartão
   - Criar assinatura no PagBank
   - ✅ **SEM** erro de tax_ID duplicado
5. **Verificar:**
   - Dashboard deve mostrar assinatura ATIVA
   - Últimos 4 dígitos: 3757
   - Próxima cobrança: data futura

---

### 📋 TESTE 3: Suspender Assinatura (Licenciado)

**Continuar logado como:** teste@ozoxx.com

1. **No Painel Financeiro:**
   - Clicar em "Suspender Assinatura" (botão amarelo)
2. **Confirmar:**
   - Ler modal: "Você pode reativar depois"
   - Clicar em "Confirmar Suspensão"
3. **Verificar:**
   - Toast: "Assinatura suspensa com sucesso"
   - Dashboard mostra alerta amarelo
   - Status: SUSPENSA
   - Botão "Reativar Assinatura" aparece (verde)
4. **Verificar no PagBank:**
   - Login no dashboard PagBank
   - Ir em Assinaturas
   - Status deve estar: **SUSPENDED** ✅

---

### 📋 TESTE 4: Reativar Assinatura (Licenciado)

**Continuar logado como:** teste@ozoxx.com

1. **No Painel Financeiro:**
   - Com assinatura SUSPENSA
   - Clicar em "Reativar Assinatura" (botão verde)
2. **Verificar:**
   - Toast: "Assinatura reativada com sucesso! Bem-vindo de volta!"
   - Alerta amarelo desaparece
   - Status: ATIVA
   - Próxima cobrança atualizada
3. **Verificar no PagBank:**
   - Dashboard PagBank
   - Status deve estar: **ACTIVE** ✅
4. **Confirmar acesso:**
   - Tentar acessar módulos
   - Deve funcionar normalmente ✅

---

### 📋 TESTE 5: Atualizar Cartão (Licenciado)

**Continuar logado como:** teste@ozoxx.com

1. **No Painel Financeiro:**
   - Clicar em "Atualizar Cartão"
2. **Preencher:**
   - Número: 4539 7787 8763 9021 (outro cartão teste)
   - Nome: TESTE ATUALIZADO
   - Validade: 06/29
   - CVV: 456
3. **Enviar:**
   - Toast: "Criptografando dados do cartão..."
   - Toast: "Atualizando cartão..."
   - Toast: "Cartão atualizado com sucesso!" ✅
4. **Verificar:**
   - Últimos 4 dígitos atualizados: 9021
   - ✅ **SEM** erro "Field required: encrypted_card"
5. **Verificar no PagBank:**
   - Dashboard PagBank → Customer → Billing Info
   - Cartão deve estar atualizado

---

### 📋 TESTE 6: Erro tax_ID Duplicado (Licenciado)

**Objetivo:** Verificar que usuário pode recriar assinatura após suspensão

**Login:** teste2@ozoxx.com / teste123

1. **Criar primeira assinatura:**
   - Usar CPF: 987.654.321-00
   - Criar assinatura normalmente ✅
2. **Suspender assinatura:**
   - Clicar em "Suspender"
3. **Tentar criar nova assinatura:**
   - Usar o MESMO CPF: 987.654.321-00
   - ✅ **NÃO** deve dar erro de tax_ID
   - Sistema deve reutilizar customer existente
4. **Verificar logs backend:**
   ```bash
   tail -50 /var/log/supervisor/backend.err.log | grep "customer"
   ```
   - Deve aparecer: "Reutilizando customer existente" ou "Customer encontrado"

---

### 📋 TESTE 7: Gerenciar Assinaturas (Admin)

**Login:** admin@ozoxx.com / admin123

1. **Ir para:** Admin → Assinaturas
2. **Ver Lista:**
   - Todas as assinaturas de todos os usuários
   - Status de cada uma
   - Valor mensal
3. **Suspender assinatura de outro usuário:**
   - Clicar em "Suspender" na linha do usuário teste@ozoxx.com
   - Confirmar
   - Verificar que status mudou
4. **Reativar assinatura:**
   - Clicar em "Reativar" na mesma linha
   - Verificar que status voltou para ATIVA
5. **Verificar no PagBank:**
   - Ambas as operações devem refletir no dashboard PagBank ✅

---

### 📋 TESTE 8: Plano Padrão (Admin)

**Login:** admin@ozoxx.com / admin123

1. **Ir para:** Admin → Assinaturas → Seção "Planos Sincronizados"
2. **Ver planos:**
   - Lista de planos sincronizados
   - Verificar qual tem badge ⭐ Plano Padrão
3. **Trocar plano padrão:**
   - Clicar em "Definir como Padrão" em outro plano
   - Confirmar
   - Verificar que badge ⭐ mudou de plano
4. **Criar assinatura sem plan_id:**
   - Logout
   - Login como teste2@ozoxx.com
   - Criar assinatura (sistema usa plano padrão automaticamente)
   - Verificar que usou o plano correto

---

## 📊 Resumo de Credenciais

| Email | Senha | Papel | Uso Principal |
|-------|-------|-------|---------------|
| admin@ozoxx.com | admin123 | Admin | Configurar sistema, definir plano padrão |
| teste@ozoxx.com | teste123 | Licenciado | Testar assinaturas, suspensão, reativação |
| teste2@ozoxx.com | teste123 | Licenciado | Testar múltiplas assinaturas, tax_ID |

---

## 💳 Cartões de Teste PagBank (Sandbox)

### Cartão 1 - Aprovado
```
Número: 4514 1611 2211 3757
Nome: TESTE
Validade: 12/30
CVV: 123
```

### Cartão 2 - Aprovado (para atualização)
```
Número: 4539 7787 8763 9021
Nome: TESTE DOIS
Validade: 06/29
CVV: 456
```

**Fonte:** [Cartões de teste PagBank](https://developer.pagbank.com.br/reference/cartoes-de-teste)

---

## 🔍 Verificação de Logs

Durante os testes, monitore os logs:

```bash
# Logs do backend em tempo real
tail -f /var/log/supervisor/backend.err.log

# Filtrar apenas assinaturas
tail -f /var/log/supervisor/backend.err.log | grep "Subscription\|PagBank"

# Ver últimas 100 linhas com erros
tail -100 /var/log/supervisor/backend.err.log | grep -E "ERROR|WARNING"
```

---

## ✅ Checklist de Testes Completo

- [ ] Login como admin funciona
- [ ] Configurar Token PagBank
- [ ] Sincronizar planos
- [ ] Definir plano padrão ⭐
- [ ] Login como licenciado funciona
- [ ] Criar assinatura (1ª vez)
- [ ] Suspender assinatura
- [ ] Reativar assinatura
- [ ] Verificar status no PagBank = SUSPENDED/ACTIVE
- [ ] Atualizar cartão
- [ ] Criar assinatura com CPF existente (sem erro tax_ID)
- [ ] Admin suspender assinatura de outro usuário
- [ ] Admin reativar assinatura de outro usuário
- [ ] Sincronizar status com PagBank

---

## 🎯 Testes Prioritários (Suas Correções)

### ✅ Prioridade ALTA:

1. **Reativação de Assinatura:**
   - Login: teste@ozoxx.com
   - Suspender → Reativar
   - Verificar no PagBank se status mudou ✅

2. **CPF Duplicado:**
   - Login: teste2@ozoxx.com
   - Criar assinatura → Suspender → Criar nova
   - NÃO deve dar erro de tax_ID ✅

3. **Atualizar Cartão:**
   - Login: teste@ozoxx.com
   - Atualizar cartão
   - NÃO deve dar erro "encrypted_card required" ✅

4. **Plano Padrão:**
   - Login: admin@ozoxx.com
   - Definir plano padrão
   - Criar assinatura sem plan_id usa plano padrão ✅

---

## 💡 Dicas

- **Ambiente Sandbox:** Use cartões de teste, não será cobrado
- **Logs detalhados:** Todos os endpoints agora têm logs com [Subscription] e [PagBank]
- **Status sincronizado:** Use botão "Sincronizar Status" se houver divergência
- **PagBank Dashboard:** Sempre verifique se mudanças refletiram no PagBank

---

## 🚀 Como Começar

```bash
# 1. Acesse a aplicação
http://seu-dominio.com

# 2. Login como admin
Email: admin@ozoxx.com
Senha: admin123

# 3. Configure o PagBank
Admin → Assinaturas → Token Bearer → Salvar → Gerar Chave

# 4. Sincronize planos
Clicar em "Sincronizar Planos"

# 5. Defina plano padrão
Clicar em "Definir como Padrão" no plano desejado

# 6. Teste com licenciado
Logout → Login: teste@ozoxx.com / teste123
```

---

## ✅ Todos os Usuários Criados e Prontos!

Use as credenciais acima para testar todas as funcionalidades implementadas! 🎉
