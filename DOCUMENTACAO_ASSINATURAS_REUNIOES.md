# 📚 Documentação Completa - Sistema de Mensalidade Recorrente e Reuniões

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Sistema de Mensalidade Recorrente](#sistema-de-mensalidade-recorrente)
3. [Sistema de Reuniões](#sistema-de-reuniões)
4. [Configuração Inicial](#configuração-inicial)
5. [Guia do Usuário](#guia-do-usuário)
6. [Guia do Administrador](#guia-do-administrador)
7. [Integração PagBank](#integração-pagbank)
8. [Fluxos de Pagamento](#fluxos-de-pagamento)
9. [API Reference](#api-reference)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

Este documento descreve dois novos sistemas implementados na plataforma UniOzoxx:

1. **Sistema de Mensalidade Recorrente**: Gerencia assinaturas mensais dos licenciados com cobrança automática
2. **Sistema de Reuniões**: Permite que licenciados cadastrem reuniões e ganhem pontos por participante

---

## 💳 Sistema de Mensalidade Recorrente

### Funcionalidades

#### Para Licenciados:
- ✅ Cadastro de assinatura durante o onboarding
- ✅ Pagamento mensal automático via cartão de crédito
- ✅ Visualização do status da assinatura
- ✅ Atualização do método de pagamento
- ✅ Notificações por email sobre status de pagamento

#### Para Administradores:
- ✅ Configuração do valor da mensalidade
- ✅ Gestão de todas as assinaturas
- ✅ Dashboard com estatísticas
- ✅ Configuração de ambiente (Sandbox/Produção)
- ✅ Testes de integração com PagBank

### Fluxo do Licenciado

1. **Etapa 1: Registro**
   - Usuário cria conta na plataforma

2. **Etapa 2: Documentos PF**
   - Upload de documentos pessoais (RG, CPF, Comprovante)

3. **Etapa 3: Assinatura** (NOVA!)
   - Preencher dados pessoais e de cobrança
   - Cadastrar cartão de crédito
   - Confirmar assinatura mensal
   - Cobrança automática todo mês

4. **Etapa 4: Acolhimento**
   - Acesso aos módulos de treinamento

### Controle de Inadimplência

#### 1º Mês de Atraso (Status: OVERDUE)
- ✉️ Email automático enviado ao usuário
- 🔒 Acesso bloqueado aos seguintes recursos:
  - Módulos de treinamento
  - Sistema de pontuação
  - Cadastro de apresentações
  - Cadastro de reuniões
  - Acesso ao acervo de arquivos
  - Certificados
  - Recompensas
  - Agenda
  - Comunidade (Timeline)

#### 2º Mês de Atraso (Status: SUSPENDED)
- ✉️ Email de suspensão enviado
- 🚫 Conta suspensa completamente
- 📞 Usuário deve entrar em contato com a empresa
- ℹ️ Mensagem exibida: "Entre em contato com contato@ozoxx.com.br"

### Valores Padrão

- **Mensalidade**: R$ 49,90 (configurável pelo admin)
- **Período de Carência**: 5 dias após vencimento
- **Meses até Suspensão**: 2 meses consecutivos
- **Ambiente Inicial**: Sandbox (para testes)

---

## 👥 Sistema de Reuniões

### Funcionalidades

#### Para Licenciados:
- ✅ Cadastrar nova reunião (título, local, data, hora)
- ✅ Adicionar participantes (nome, email, telefone, CPF)
- ✅ Fechar lista e receber pontos automaticamente
- ✅ Visualizar histórico de reuniões
- ✅ Estatísticas pessoais

#### Para Administradores:
- ✅ Configurar pontos por participante
- ✅ Definir limites (mínimo e máximo de participantes)
- ✅ Visualizar todas as reuniões
- ✅ Dashboard com estatísticas globais

### Fluxo de Uso

1. **Criar Reunião**
   ```
   Licenciado acessa: Menu > Reuniões > Nova Reunião
   Preenche:
   - Título (ex: "Reunião de Vendas - Centro")
   - Descrição (opcional)
   - Local (ex: "Escritório Central")
   - Data e Hora
   ```

2. **Adicionar Participantes**
   ```
   Após criar a reunião:
   - Clicar em "Ver" na reunião
   - Clicar em "Adicionar Participante"
   - Preencher dados:
     * Nome completo *
     * Email *
     * Telefone *
     * CPF (opcional)
   - Repetir para cada participante
   ```

3. **Fechar Lista**
   ```
   Quando terminar de adicionar participantes:
   - Clicar em "Fechar Lista"
   - Confirmar ação
   - Pontos creditados automaticamente
   - Não é mais possível adicionar participantes
   ```

### Sistema de Pontuação

- **Pontos por Participante**: 1 ponto (configurável)
- **Cálculo**: Pontos = Número de Participantes × Pontos Configurados
- **Creditação**: Automática ao fechar a lista
- **Exemplo**: Reunião com 10 participantes = 10 pontos

### Validações

- ✅ Mínimo de 1 participante para fechar lista
- ✅ Máximo de 100 participantes por reunião (configurável)
- ✅ Email e telefone obrigatórios (configurável)
- ✅ Controle de CPF duplicado (configurável)
- ✅ Verificação de assinatura ativa

---

## ⚙️ Configuração Inicial

### 1. Banco de Dados

As configurações já foram inicializadas automaticamente. Para verificar:

```bash
cd /app/backend
python setup_subscription_system.py
```

### 2. Configurar PagBank (Obrigatório para Produção)

#### Passo 1: Obter Token de Assinaturas
1. Acesse: https://assinaturas.pagseguro.uol.com.br (Produção)
   ou https://sandbox.assinaturas.pagseguro.uol.com.br (Teste)
2. Faça login com sua conta PagBank
3. Vá em **Configurações** > **Credenciais**
4. Copie o **Token de Acesso**

#### Passo 2: Configurar no Sistema
1. Acesse o painel administrativo
2. Vá em **Menu > Assinaturas**
3. Cole o token em "Token de Acesso"
4. Preencha o email da conta (referência)
5. Selecione o ambiente (Sandbox para testes, Produção para uso real)
6. Clique em "Testar Conexão PagBank" para verificar
7. Clique em "Salvar"

### 3. Ajustar Valores (Opcional)

#### Mensalidade
```
Menu > Assinaturas > Valor da Mensalidade
Padrão: R$ 49,90
```

#### Pontos por Participante
```
Menu > Reuniões > Pontos por Participante
Padrão: 1 ponto
```

---

## 👤 Guia do Usuário (Licenciado)

### Como Assinar a Plataforma

1. **Acesse o Onboarding**
   - Após enviar documentos PF, você será direcionado para a assinatura
   - Ou acesse diretamente: `/onboarding/subscription`

2. **Preencha seus Dados**
   - Nome completo
   - Email
   - CPF
   - Telefone
   - Endereço de cobrança

3. **Cadastre o Cartão**
   - Número do cartão
   - Nome impresso no cartão
   - CPF do titular
   - Data de nascimento do titular
   - Validade (MM/AA)
   - CVV

4. **Confirme a Assinatura**
   - Revise os dados
   - Clique em "Confirmar Assinatura"
   - Aguarde o processamento

5. **Conclusão**
   - Você será redirecionado para o Dashboard
   - Terá acesso total à plataforma

### Como Cadastrar uma Reunião

1. **Acessar Reuniões**
   ```
   Menu > Reuniões
   ```

2. **Criar Nova Reunião**
   ```
   Botão "Nova Reunião"
   Preencher:
   - Título *
   - Descrição
   - Local *
   - Data *
   - Horário *
   ```

3. **Adicionar Participantes**
   ```
   - Clicar em "Ver" na reunião criada
   - Clicar em "Adicionar Participante"
   - Preencher dados do participante
   - Repetir até adicionar todos
   ```

4. **Fechar Lista**
   ```
   - Revisar participantes
   - Clicar em "Fechar Lista"
   - Confirmar
   - Pontos creditados!
   ```

### Verificar Status da Assinatura

```
Menu > Perfil > Status da Assinatura
Ou
Acesse: /subscription
```

### Atualizar Método de Pagamento

Se seu cartão vencer ou houver problema:
```
1. Acesse Menu > Perfil
2. Clique em "Atualizar Cartão"
3. Cadastre novo cartão
4. Confirme
```

---

## 👨‍💼 Guia do Administrador

### Dashboard de Assinaturas

Acesse: **Menu > Assinaturas**

#### Estatísticas Exibidas:
- 🟢 **Assinaturas Ativas**: Usuários com pagamento em dia
- 🟡 **Inadimplentes**: Usuários com 1 mês de atraso
- 🔴 **Suspensas**: Usuários com 2+ meses de atraso
- 💰 **Receita Mensal Estimada**: Assinaturas ativas × valor

#### Ações Disponíveis:
- ✅ Configurar valor da mensalidade
- ✅ Ajustar período de carência
- ✅ Definir meses até suspensão
- ✅ Configurar notificações por email
- ✅ Testar conexão com PagBank
- ✅ Visualizar todas as assinaturas
- ✅ Ver detalhes de cada assinatura

### Dashboard de Reuniões

Acesse: **Menu > Reuniões**

#### Estatísticas Exibidas:
- 📊 **Total de Reuniões**: Todas as reuniões criadas
- ✅ **Reuniões Fechadas**: Listas finalizadas
- 👥 **Total de Participantes**: Soma de todos os participantes
- 🏆 **Pontos Distribuídos**: Total de pontos dados

#### Configurações:
- 🎯 **Pontos por Participante**: Quantos pontos ganhar por pessoa
- 📝 **Mínimo de Participantes**: Mínimo para fechar lista
- 📈 **Máximo por Reunião**: Limite de participantes
- ✅ **Validações**: Email/telefone obrigatórios, CPF duplicado

### Gerenciar Inadimplências

1. **Monitorar Dashboard**
   - Verificar número de inadimplentes
   - Identificar usuários em risco de suspensão

2. **Entrar em Contato**
   - Emails automáticos já são enviados
   - Para casos especiais, contatar diretamente

3. **Reativar Manualmente** (se necessário)
   - Entre em contato com o suporte técnico
   - Solicitar reativação de conta específica

---

## 🔗 Integração PagBank

### API de Assinaturas

O sistema utiliza a **API de Assinaturas do PagBank** (diferente do Checkout):

- **Documentação Oficial**: https://developer.pagbank.com.br/docs/pagamento-recorrente
- **URL Sandbox**: https://sandbox.api.pagseguro.com/recurring-payments
- **URL Produção**: https://api.assinaturas.pagseguro.com

### Autenticação

```
Authorization: Bearer {TOKEN}
Content-Type: application/json
```

### Endpoints Utilizados

1. **Criar Plano**
   ```
   POST /plans
   ```

2. **Criar Assinatura**
   ```
   POST /subscriptions
   ```

3. **Consultar Assinatura**
   ```
   GET /subscriptions/{subscription_id}
   ```

4. **Cancelar Assinatura**
   ```
   PUT /subscriptions/{subscription_id}/cancel
   ```

5. **Atualizar Método de Pagamento**
   ```
   PUT /subscriptions/{subscription_id}/payment-method
   ```

### Webhooks

URL configurada para receber notificações:
```
https://seudominio.com/api/subscriptions/webhooks/pagbank
```

Eventos recebidos:
- `subscription.charged` - Pagamento realizado
- `subscription.payment_failed` - Falha no pagamento
- `subscription.cancelled` - Assinatura cancelada

---

## 💰 Fluxos de Pagamento

### Fluxo de Sucesso

```mermaid
Usuário cadastra cartão
    ↓
Sistema cria assinatura no PagBank
    ↓
PagBank valida cartão
    ↓
Primeira cobrança realizada
    ↓
Webhook confirma pagamento
    ↓
Status: ACTIVE
    ↓
Usuário avança para próxima etapa do onboarding
```

### Fluxo de Falha

```mermaid
Data de cobrança mensal chega
    ↓
PagBank tenta cobrar cartão
    ↓
Pagamento falha
    ↓
Webhook notifica sistema
    ↓
Status: OVERDUE
    ↓
Email enviado ao usuário
    ↓
Conteúdo bloqueado
    ↓
(Se não pagar por 2 meses)
    ↓
Status: SUSPENDED
    ↓
Email de suspensão
    ↓
Conta suspensa
```

### Fluxo de Regularização

```mermaid
Usuário atualiza cartão
    ↓
Sistema atualiza método no PagBank
    ↓
PagBank tenta cobrar novamente
    ↓
Pagamento aprovado
    ↓
Webhook confirma
    ↓
Status: ACTIVE
    ↓
Conteúdo desbloqueado
    ↓
Email de reativação (opcional)
```

---

## 📡 API Reference

### Endpoints de Assinatura

#### GET /api/subscriptions/settings
Obtém configurações (Admin)

**Response:**
```json
{
  "monthly_fee": 49.90,
  "trial_days": 0,
  "grace_period_days": 5,
  "suspend_after_months": 2,
  "pagbank_environment": "sandbox",
  "send_payment_failed_email": true
}
```

#### PUT /api/subscriptions/settings
Atualiza configurações (Admin)

**Request:**
```json
{
  "monthly_fee": 59.90,
  "suspend_after_months": 3
}
```

#### POST /api/subscriptions/subscribe
Cria assinatura (Licenciado)

**Request:**
```json
{
  "customer_name": "João Silva",
  "customer_email": "joao@email.com",
  "customer_cpf": "12345678900",
  "customer_phone": "11999999999",
  "billing_address": {
    "street": "Rua Exemplo",
    "number": "123",
    "district": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zipcode": "01234567"
  },
  "card_token": "TOKEN_GERADO",
  "card_holder_name": "JOAO SILVA",
  "card_holder_cpf": "12345678900",
  "card_holder_birth_date": "1990-01-01"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Assinatura criada com sucesso!",
  "subscription": {...},
  "pagbank_subscription_id": "SUB123456"
}
```

#### GET /api/subscriptions/my-subscription
Verifica status da assinatura (Licenciado)

**Response:**
```json
{
  "has_active_subscription": true,
  "status": "active",
  "is_blocked": false,
  "overdue_months": 0,
  "next_billing_date": "2026-05-01",
  "monthly_amount": 49.90
}
```

### Endpoints de Reuniões

#### POST /api/meetings
Cria reunião (Licenciado)

**Request:**
```json
{
  "title": "Reunião de Vendas - Centro",
  "description": "Apresentação mensal",
  "location": "Escritório Central",
  "meeting_date": "2026-04-15",
  "meeting_time": "14:00"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reunião criada com sucesso!",
  "meeting": {...}
}
```

#### POST /api/meetings/{meeting_id}/participants
Adiciona participante (Licenciado)

**Request:**
```json
{
  "name": "Maria Santos",
  "email": "maria@email.com",
  "phone": "11988888888",
  "cpf": "98765432100"
}
```

**Response:**
```json
{
  "message": "Participante adicionado com sucesso",
  "participant": {...},
  "total_participants": 5
}
```

#### POST /api/meetings/{meeting_id}/close
Fecha lista e credita pontos (Licenciado)

**Response:**
```json
{
  "success": true,
  "message": "Lista fechada! Você ganhou 5 pontos!",
  "meeting_id": "abc123",
  "participants_count": 5,
  "points_awarded": 5,
  "new_total_points": 125
}
```

#### GET /api/meetings/my/stats
Estatísticas pessoais (Licenciado)

**Response:**
```json
{
  "total_meetings": 10,
  "total_closed_meetings": 8,
  "total_participants": 75,
  "total_points_earned": 75,
  "current_month_meetings": 3,
  "current_month_participants": 25
}
```

---

## 🔧 Troubleshooting

### Problema: Erro ao criar assinatura

**Sintomas:**
- Mensagem: "Erro ao processar assinatura"
- Status 400

**Soluções:**
1. Verificar se o token do PagBank está configurado
2. Testar conexão: Admin > Assinaturas > Testar Conexão
3. Verificar se o ambiente está correto (Sandbox/Produção)
4. Conferir dados do cartão
5. Verificar logs: `/var/log/supervisor/backend.err.log`

### Problema: Assinatura não avança o onboarding

**Sintomas:**
- Assinatura criada mas usuário continua na mesma etapa

**Soluções:**
1. Verificar status da assinatura no banco:
   ```javascript
   db.user_subscriptions.find({user_id: "USER_ID"})
   ```
2. Verificar se webhook está funcionando
3. Forçar atualização do estágio do usuário:
   ```javascript
   db.users.updateOne(
     {id: "USER_ID"},
     {$set: {current_stage: "acolhimento"}}
   )
   ```

### Problema: Reunião não credita pontos

**Sintomas:**
- Lista fechada mas pontos não aparecem

**Soluções:**
1. Verificar configuração de pontos: Admin > Reuniões
2. Verificar status da reunião no banco:
   ```javascript
   db.meetings.find({id: "MEETING_ID"})
   ```
3. Verificar pontos do usuário:
   ```javascript
   db.users.find({id: "USER_ID"}, {points: 1})
   ```

### Problema: Acesso bloqueado mesmo com pagamento

**Sintomas:**
- Usuário pagou mas continua bloqueado

**Soluções:**
1. Verificar status da assinatura:
   ```javascript
   db.user_subscriptions.updateOne(
     {user_id: "USER_ID"},
     {$set: {
       status: "active",
       overdue_months: 0,
       failed_payments_count: 0
     }}
   )
   ```
2. Limpar cache do frontend (Ctrl+Shift+R)
3. Fazer logout e login novamente

### Problema: Webhook não está sendo recebido

**Sintomas:**
- Pagamentos não atualizam automaticamente

**Soluções:**
1. Verificar URL do webhook no PagBank
2. Testar endpoint manualmente:
   ```bash
   curl -X POST https://seudominio.com/api/subscriptions/webhooks/pagbank \
     -H "Content-Type: application/json" \
     -d '{"event_type": "test"}'
   ```
3. Verificar logs de webhook:
   ```javascript
   db.subscription_webhook_events.find().sort({received_at: -1}).limit(10)
   ```

---

## 📞 Suporte

Para dúvidas ou problemas:
- 📧 Email: suporte@ozoxx.com.br
- 📱 Telefone: (00) 0000-0000
- 💬 Chat interno da plataforma

---

## 📅 Changelog

### Versão 1.0.0 (2026-04-01)
- ✨ Sistema de Mensalidade Recorrente implementado
- ✨ Sistema de Reuniões implementado
- ✨ Integração com PagBank API de Assinaturas
- ✨ Sistema de bloqueio por inadimplência
- ✨ Notificações automáticas por email
- ✨ Dashboard administrativo
- ✨ Configurações personalizáveis

---

**Desenvolvido para UniOzoxx** 🚀
