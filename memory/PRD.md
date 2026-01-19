# PRD - Plataforma UniOzoxx LMS

## Visão Geral
UniOzoxx é uma plataforma LMS (Learning Management System) gamificada desenvolvida para gerenciar o processo de onboarding, treinamento e acompanhamento de licenciados da empresa Ozoxx.

## Stack Tecnológico
- **Frontend:** React 18 + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python 3.11)
- **Banco de Dados:** MongoDB
- **Autenticação:** JWT

---

## Funcionalidades Implementadas

### ✅ Sistema de Autenticação
- Login/logout com JWT
- Recuperação de senha
- Três níveis de acesso: admin, supervisor, licenciado

### ✅ Modo Escuro/Claro (COMPLETO - Janeiro 2026)
- Toggle no topbar para alternar entre temas
- Preferência salva no localStorage
- Dark mode aplicado em TODAS as páginas
- Tooltips dos gráficos Recharts adaptados via CSS variables

### ✅ Identidade da Plataforma Dinâmica (COMPLETO - Janeiro 2026)
- Nome da plataforma configurável pelo Admin (`Admin > Painel Sistema`)
- Nome dinâmico aplicado em:
  - Tela de login
  - Sidebar/menu lateral
  - Todos os templates de email (boas-vindas, reset de senha, webhook)
  - Relatórios PDF de vendas/comissões
  - Rodapé dos emails
  - Campo "De:" dos emails enviados
- Endpoint público `/api/system/config` para acesso sem autenticação
- Endpoint privado `/api/system/config/full` para administradores

### ✅ Nova Tela de Login (COMPLETO - Janeiro 2026)
- Design minimalista e centralizado
- Logo centralizada no topo
- Nome da plataforma dinâmico
- Removido layout dividido (sem lado esquerdo com gradiente)
- Suporte a dark mode

### ✅ Sistema de Idiomas i18n (COMPLETO - Janeiro 2026)
- Seletor de idioma no topbar com 3 opções:
  - 🇧🇷 Português (Brasil)
  - 🇺🇸 English
  - 🇪🇸 Español
- Arquivos de tradução completos em `/frontend/src/locales/`:
  - `pt-BR.json` - 350+ chaves traduzidas
  - `en.json` - 350+ chaves traduzidas
  - `es.json` - 350+ chaves traduzidas
- Cobertura de traduções:
  - Sidebar completo
  - Dashboard
  - Módulos e capítulos
  - Agenda
  - Certificados
  - Favoritos
  - Arquivos
  - Recompensas
  - Perfil
  - Treinamento presencial
  - Vendas
  - Admin dashboard
  - Admin usuários
  - Admin sistema
  - Supervisor pages
  - Estágios de onboarding
  - Mensagens de erro
  - Mensagens de sucesso
- **STATUS:** Estrutura completa, aplicação incremental nos componentes

### ✅ Emails Dinâmicos (COMPLETO - Janeiro 2026)
Templates de email atualizados para usar nome dinâmico da plataforma:
- Email de boas-vindas (novo usuário)
- Email de reset de senha
- Email de cadastro via webhook
- Todos incluem rodapé com `© {platform_name} - Plataforma de Treinamento`
- Campo "De:" usa formato `{platform_name} <email@domain.com>`

### ✅ Módulos de Treinamento
- CRUD de módulos e capítulos
- Vídeos, textos, arquivos PDF
- Sistema de progresso
- **Delay de visibilidade:** Módulos aparecem após X meses do cadastro
- Avaliações e certificados

### ✅ Sistema de Gamificação
- Pontos, níveis, badges, desafios
- Leaderboard (ranking)
- Recompensas resgatáveis

### ✅ Treinamento Presencial
- Admin cria turmas com data, local, capacidade
- Licenciado se inscreve (com ou sem cônjuge)
- Admin marca que treinamento ocorreu
- Admin marca presença individual (presente/ausente)
- Licenciado PRESENTE avança para Vendas em Campo
- PDF de lista de presença

### ✅ Vendas em Campo
- Licenciado registra até 10 vendas com dados do cliente
- Link de pagamento placeholder (aguarda gateway)
- Notificação automática quando venda é confirmada
- Ao completar 10 vendas → avança para Documentos PJ

### ✅ Relatório de Vendas por Mês + PDF (NOVO - Janeiro 2026)
- Filtro por mês e ano
- Resumo com vendas e comissões do período
- Lista completa de vendas
- **Exportar PDF** com relatório completo

### ✅ Sistema de Comissões
- Admin cria tipos de comissão (descrição + %)
- Sistema calcula comissões automaticamente
- Visualização no dashboard e no relatório PDF

### ✅ Notificação de Venda Confirmada (NOVO - Janeiro 2026)
- Quando pagamento é confirmado, cria notificação automática
- Aparece no sino de notificações do licenciado
- Inclui dados da venda (cliente, valor)

### ✅ Ozoxx Cast
- Admin faz upload de vídeos de lives
- Licenciados assistem na plataforma
- Contador de visualizações

### ✅ API Webhook com Kit Type
- Kit Master: pula onboarding, vai direto para "completo"
- Kit Senior: segue fluxo normal

---

## Integrações Pendentes

### 🔜 Gateway de Pagamento
- PagSeguro ou MercadoPago
- Para pagamento de treinamento e vendas
- **Status:** MOCKED com placeholder

---

## Arquitetura

```
/app/
├── backend/
│   └── routes/
│       ├── sales_routes.py (vendas, comissões, PDF)
│       ├── training_routes.py (presença)
│       ├── ozoxx_cast_routes.py
│       └── ...
├── frontend/
│   └── src/
│       ├── contexts/
│       │   ├── ThemeContext.js (dark mode)
│       │   └── LanguageContext.js (i18n)
│       ├── components/
│       │   ├── ThemeToggle.js
│       │   └── LanguageSelector.js
│       ├── locales/
│       │   ├── pt-BR.json
│       │   ├── en.json
│       │   └── es.json
│       └── pages/
│           └── admin/
│               └── AdminSales.js (relatório mensal + PDF)
└── memory/
    └── PRD.md
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

### Janeiro 2026 (Sessão Atual)
- ✅ **Modo Escuro/Claro** - Toggle no topbar
- ✅ **Sistema de idiomas i18n** - PT-BR, EN, ES
- ✅ **Relatório de vendas por mês** - Filtro mensal + exportar PDF
- ✅ **Notificação de venda confirmada** - Automática ao confirmar pagamento

### Janeiro 2026 (Sessão Anterior)
- ✅ Sistema de presença no treinamento presencial
- ✅ Etapa de vendas em campo (10 vendas)
- ✅ Dashboard de vendas para admin
- ✅ Sistema de comissões configuráveis
- ✅ Ozoxx Cast (gravações de lives)
- ✅ Kit Master/Senior no webhook
- ✅ Delay de visibilidade em módulos

---

## Próximas Tarefas (Backlog)

### P1 - Alta Prioridade
1. Integração com gateway de pagamento (PagSeguro/MercadoPago)

### P2 - Média Prioridade
1. Aplicar traduções i18n em mais componentes internos
2. Notificações push para novas turmas de treinamento

### P3 - Baixa Prioridade
1. Dashboard mobile otimizado
2. Relatórios exportáveis em Excel
