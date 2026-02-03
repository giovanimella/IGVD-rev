# IGVD - Instituto Global de Vendas Diretas
## Product Requirements Document (PRD)

---

## 📋 Resumo do Projeto

**Nome Original:** UniOzoxx LMS
**Nome Atual:** IGVD - Instituto Global de Vendas Diretas
**Domínio:** https://igvd.org
**Tipo:** Plataforma LMS para treinamento de licenciados de vendas diretas

---

## ✅ Funcionalidades Implementadas

### 🔐 Autenticação e Usuários
- [x] Login/Logout com JWT
- [x] Três níveis de usuário: Admin, Supervisor, Licenciado
- [x] Recuperação de senha por email
- [x] Definição de senha por link
- [x] **NOVO:** Admin pode avançar/alterar etapa de acolhimento de licenciados

### 📚 Sistema de Módulos e Capítulos
- [x] CRUD completo de módulos
- [x] Capítulos com conteúdo e vídeos
- [x] Sistema de avaliações
- [x] Progresso do usuário
- [x] Módulos com delay de tempo configurável
- [x] **NOVO:** Configuração de rewatching por módulo (admin pode habilitar/desabilitar)
- [x] **NOVO:** Tipo de módulo "Aula ao Vivo" com embed YouTube/Twitch
- [x] **NOVO:** Chat de aula ao vivo (mensagens em tempo real durante transmissão)

### 🎮 Gamificação
- [x] Sistema de badges
- [x] Desafios semanais
- [x] Ranking/Leaderboard
- [x] **NOVO:** Sidebar de Ranking na direita (estilo pódio + lista)
- [x] Sistema de pontuação XP
- [x] Níveis de usuário

### 💰 Vendas e Comissões
- [x] Registro de vendas pelos licenciados
- [x] Sistema de comissões para supervisores
- [x] Relatórios de vendas (PDF)
- [x] Dashboard de vendas admin

### 📅 Agenda e Eventos
- [x] Compromissos pessoais dos licenciados
- [x] **NOVO:** Eventos da empresa (lives, reuniões, campanhas)
- [x] Eventos globais aparecem na agenda de todos

### 🎬 IGVD Cast (ex-Ozoxx Cast)
- [x] Upload de vídeos de lives
- [x] Organização por categorias
- [x] Reprodutor de vídeo

### 🌐 Internacionalização
- [x] **Tradução em tempo real com IA** (Claude Sonnet 4.5)
- [x] Suporte a Português, Inglês, Espanhol
- [x] Cache de traduções no localStorage

### 🌙 Tema e Aparência
- [x] Dark/Light mode
- [x] Nome da plataforma dinâmico (admin pode alterar)
- [x] Logo customizável
- [x] Design responsivo

### 📧 Notificações
- [x] Envio de emails via Resend
- [x] Notificações de vendas confirmadas
- [x] Emails de boas-vindas
- [x] **NOVO:** Badge de notificação no menu "Atendimento" (mensagens não lidas)

### 📁 Outros
- [x] Repositório de arquivos
- [x] Sistema de banners
- [x] Comunicados/Posts
- [x] Certificados PDF
- [x] Favoritos

---

## 🗂️ Arquitetura

```
/app/
├── backend/           # FastAPI + MongoDB
│   ├── routes/        # Endpoints da API
│   ├── models.py      # Modelos Pydantic
│   ├── auth.py        # Autenticação JWT
│   └── server.py      # Ponto de entrada
├── frontend/          # React + Tailwind
│   ├── src/
│   │   ├── components/  # Componentes reutilizáveis
│   │   ├── contexts/    # Contextos React
│   │   ├── pages/       # Páginas da aplicação
│   │   └── locales/     # Arquivos de tradução
│   └── build/         # Build de produção
├── deploy/            # Scripts de instalação
│   ├── INSTALL.md     # Guia completo
│   ├── install.sh     # Script automatizado
│   ├── nginx-igvd.conf
│   ├── backup.sh
│   └── update.sh
└── uploads/           # Arquivos enviados
```

---

## 🔑 Credenciais Padrão

| Usuário | Email | Senha |
|---------|-------|-------|
| Admin | admin@igvd.org | admin123 |
| Supervisor | supervisor@igvd.org | supervisor123 |
| Licenciado | (criar via sistema) | - |

---

## 🔧 Integrações

| Serviço | Uso | Status |
|---------|-----|--------|
| MongoDB | Banco de dados | ✅ Ativo |
| Resend | Envio de emails | ✅ Ativo |
| Emergent LLM (Claude) | Tradução em tempo real | ✅ Ativo |
| Let's Encrypt | SSL/HTTPS | 📋 Para deploy |

---

## 📦 Deploy

### Arquivos Criados
- `/app/deploy/INSTALL.md` - Guia completo de instalação
- `/app/deploy/install.sh` - Script automatizado
- `/app/deploy/nginx-igvd.conf` - Configuração Nginx
- `/app/deploy/backup.sh` - Script de backup
- `/app/deploy/update.sh` - Script de atualização
- `/app/deploy/backend.env.example` - Exemplo de .env backend
- `/app/deploy/frontend.env.example` - Exemplo de .env frontend

### Domínio Configurado
- **Produção:** https://igvd.org

---

## 📋 Backlog / Tarefas Futuras

### P0 (Crítico)
- [ ] Deploy em produção no servidor do cliente

### P1 (Importante)
- [ ] Integração com gateway de pagamento (PagSeguro/MercadoPago)
- [ ] Lembretes automáticos por email

### P2 (Melhorias)
- [ ] App mobile (React Native ou PWA)
- [ ] Dashboard analytics mais detalhado
- [ ] Sistema de chat entre usuários
- [ ] Integração com WhatsApp

---

## 📝 Changelog

### v1.2.0 (Fevereiro 2026)
- **NOVO:** Sidebar de Ranking na direita da tela
  - Pódio visual com top 3 (troféus ouro/prata/bronze)
  - Lista estilizada com avatares em formato losango
  - Botão "Ver Ranking Completo"
  - Visível apenas para licenciados e supervisores

### v1.1.0 (Janeiro 2026)
- Renomeado de "UniOzoxx" para "IGVD - Instituto Global de Vendas Diretas"
- Adicionado sistema de eventos da empresa
- Criados scripts de deploy para Ubuntu
- Configuração para domínio igvd.org

### v1.0.0 (Janeiro 2026)
- Sistema de tradução em tempo real com IA
- Dark/Light mode completo
- Nome da plataforma dinâmico
- Redesign da página de login
- Sistema de vendas e comissões
- IGVD Cast (vídeos de lives)

---

**Última atualização:** Fevereiro 2026
