# PRD - Plataforma UniOzoxx LMS

## Visão Geral
UniOzoxx é uma plataforma LMS (Learning Management System) gamificada desenvolvida para gerenciar o processo de onboarding, treinamento e acompanhamento de licenciados da empresa Ozoxx. A plataforma oferece um fluxo completo desde o cadastro até a liberação total de conteúdo, passando por etapas de treinamento presencial e vendas em campo.

## Stack Tecnológico
- **Frontend:** React 18 + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python 3.11)
- **Banco de Dados:** MongoDB
- **Autenticação:** JWT

## Fluxo de Onboarding

### Etapas (por ordem)
1. **Registro** - Definição de senha inicial
2. **Documentos PF** - Upload de documentos pessoa física
3. **Acolhimento** - Módulos iniciais de treinamento
4. **Treinamento Presencial** - Inscrição e participação em turma presencial
5. **Vendas em Campo** - Registro de 10 vendas com clientes reais
6. **Documentos PJ** - Upload de documentos pessoa jurídica
7. **Completo** - Acesso total à plataforma

### Kit Master vs Kit Senior
- **Kit Master:** Pula TODAS as etapas de onboarding, vai direto para "completo"
- **Kit Senior:** Segue o fluxo normal de todas as etapas

---

## Funcionalidades Implementadas

### ✅ Sistema de Autenticação
- Login/logout com JWT
- Recuperação de senha
- Definição de senha para novos usuários via webhook
- Três níveis de acesso: admin, supervisor, licenciado

### ✅ Dashboard Administrativo
- Estatísticas gerais (usuários, módulos, vendas)
- Gráficos de crescimento
- Links para todas as ferramentas de gestão

### ✅ Módulos de Treinamento
- CRUD de módulos e capítulos (admin)
- Vídeos, textos, arquivos PDF
- Sistema de progresso por capítulo
- **Delay de visibilidade:** Módulos podem aparecer após X meses do cadastro do licenciado
- Avaliações com nota mínima configurável
- Certificados gerados automaticamente

### ✅ Sistema de Gamificação
- Pontos por conclusão de capítulos/módulos
- Níveis configuráveis (Iniciante → Expert)
- Badges e desafios
- Leaderboard (ranking)
- Recompensas resgatáveis

### ✅ Treinamento Presencial
- **Admin:** Criar turmas com data, local, capacidade, informações de hotel
- **Admin:** Configurar preços (individual/casal), dias de antecedência para fechamento
- **Licenciado:** Se inscrever em turma disponível (com ou sem cônjuge)
- **Admin:** Marcar que o treinamento ocorreu (status: attendance_open)
- **Admin:** Marcar presença individual (presente/ausente)
- **Automação:** Licenciado marcado como PRESENTE avança para etapa de Vendas em Campo
- **Automação:** Licenciado AUSENTE é realocado para próxima turma
- **PDF:** Geração de lista de presença para impressão

### ✅ Vendas em Campo (NOVO - Janeiro 2026)
- **Licenciado:** Registrar até 10 vendas com dados do cliente:
  - Nome completo
  - Telefone
  - E-mail
  - CPF
  - Número de série do aparelho
  - Origem do aparelho (estoque do Líder ou Fábrica)
  - Valor da venda
- **Link de Pagamento:** Gerado automaticamente (MOCKED - aguardando integração com gateway)
- **Status de Pagamento:** Pendente → Pago
- **Automação:** Ao completar 10 vendas pagas, licenciado avança para Documentos PJ
- **Admin:** Dashboard com relatório completo de vendas

### ✅ Sistema de Comissões (NOVO - Janeiro 2026)
- **Admin:** Criar tipos de comissão (descrição + porcentagem)
- **Admin:** Ativar/desativar tipos de comissão
- **Automação:** Sistema calcula comissões baseado no valor total de vendas pagas

### ✅ Ozoxx Cast (NOVO - Janeiro 2026)
- **Admin:** Upload de vídeos de gravações de lives
- **Admin:** Gerenciar títulos, descrições, status (publicado/oculto)
- **Licenciado:** Assistir vídeos diretamente na plataforma
- Contador de visualizações

### ✅ Sistema de Idiomas (NOVO - Janeiro 2026)
- Seletor de idioma no topbar
- 3 idiomas: Português (Brasil), English, Español
- Arquivos de tradução criados em `/frontend/src/locales/`
- **Nota:** Estrutura de i18n criada, textos dos componentes ainda em português

### ✅ API Webhook para Cadastro Externo
- Endpoint: POST /api/webhook/licensee
- Aceita: id, full_name, email, phone, leader_id, leader_name, **kit_type** (master/senior)
- **Kit Master:** Define current_stage = "completo" (pula onboarding)
- **Kit Senior:** Define current_stage = "registro" (fluxo normal)
- Autenticação via API Key (header X-API-Key)
- Logs de todas as chamadas

### ✅ Outros Recursos
- Chat de suporte interno
- Sistema de notificações
- Favoritos
- Agenda/calendário
- Banners e comunicados
- Repositório de arquivos

---

## Integrações Pendentes

### 🔜 Gateway de Pagamento
- PagSeguro ou MercadoPago (escolha do cliente)
- Necessário para:
  - Pagamento de inscrição no treinamento presencial
  - Link de pagamento para vendas em campo
- **Status:** MOCKED com placeholder

### 🔜 Notificações Automatizadas
- Confirmação de inscrição em treinamento
- Lembretes antes do treinamento
- Follow-up pós-treinamento

---

## Arquitetura do Projeto

```
/app/
├── backend/
│   ├── routes/
│   │   ├── auth_routes.py
│   │   ├── training_routes.py (presença, turmas)
│   │   ├── sales_routes.py (vendas, comissões)
│   │   ├── ozoxx_cast_routes.py (vídeos)
│   │   ├── webhook_routes.py (kit_type)
│   │   └── ... (outras rotas)
│   ├── models.py
│   ├── auth.py
│   └── server.py
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Sales.js (vendas do licenciado)
│       │   ├── OzoxxCast.js (vídeos para licenciados)
│       │   ├── Training.js (inscrição em treinamento)
│       │   └── admin/
│       │       ├── AdminSales.js (dashboard de vendas)
│       │       ├── AdminOzoxxCast.js (gerenciar vídeos)
│       │       └── AdminTraining.js (gerenciar turmas)
│       ├── components/
│       │   ├── LanguageSelector.js
│       │   └── ...
│       ├── contexts/
│       │   ├── LanguageContext.js
│       │   └── AuthContext.js
│       └── locales/
│           ├── pt-BR.json
│           ├── en.json
│           └── es.json
├── memory/
│   └── PRD.md
├── test_reports/
│   └── iteration_6.json
└── DEPLOY.md
```

---

## Credenciais de Teste

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Admin | admin@ozoxx.com | admin123 |
| Supervisor | supervisor@uniozoxx.com | supervisor123 |
| Licenciado | licenciado.teste@ozoxx.com | licenciado123 |

---

## Changelog

### Janeiro 2026
- ✅ Sistema de presença no treinamento presencial
- ✅ Etapa de vendas em campo (10 vendas)
- ✅ Dashboard de vendas para admin
- ✅ Sistema de comissões configuráveis
- ✅ Ozoxx Cast (gravações de lives)
- ✅ Suporte a kit_type (Master/Senior) no webhook
- ✅ Delay de visibilidade em módulos
- ✅ Sistema de seleção de idioma (estrutura)

### Dezembro 2025
- ✅ Sistema completo de treinamento presencial
- ✅ Remoção da etapa de pagamento de licença do onboarding
- ✅ Pacote de deployment (DEPLOY.md)

---

## Próximas Tarefas (Backlog)

### P1 - Alta Prioridade
1. Integração com gateway de pagamento (PagSeguro/MercadoPago)
2. Aplicar traduções i18n nos componentes

### P2 - Média Prioridade
1. Notificações automatizadas de treinamento
2. Relatórios exportáveis (Excel/PDF)

### P3 - Baixa Prioridade
1. Dashboard mobile responsivo otimizado
2. Modo escuro (dark mode)
