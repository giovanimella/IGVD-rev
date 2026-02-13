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

### 🌐 Comunidade (Timeline)
- [x] **NOVO:** Timeline social (estilo Twitter) para licenciados trocarem experiências
- [x] Criar posts com texto e imagens
- [x] Reações (curtir, amei, celebrar, apoiar, interessante)
- [x] Comentários nos posts
- [x] Fixar posts (admin/supervisor)
- [x] Moderação de conteúdo (excluir posts/comentários)
- [x] **NOVO:** Filtro de palavras proibidas (bloquear ou censurar automaticamente)

### 📋 Termos de Aceite Digital
- [x] **NOVO:** Admin pode criar e gerenciar termos de uso
- [x] Versionamento de termos
- [x] Modal de aceite obrigatório para novos usuários
- [x] Registro de aceites com IP e timestamp
- [x] Visualização de aceites por termo (admin)
- [x] Termos podem ser ativados/desativados

### 📱 Notificações WhatsApp (Evolution API)
- [x] **NOVO:** Configuração de integração com Evolution API
- [x] Enviar mensagens personalizadas para usuários
- [x] Disparos automáticos: Aniversários, Lembretes de Acesso
- [x] Histórico de mensagens enviadas
- [x] Toggle por tipo de notificação (novos módulos, dicas, aulas ao vivo)

### 🏠 Landing Page Configurável
- [x] **NOVO:** Página inicial pública com design moderno
- [x] Fundo claro com formas orgânicas coloridas
- [x] Admin pode configurar: Textos, Cores, Logo, Imagem principal
- [x] Seção de features com ícones
- [x] CTA e rodapé personalizáveis
- [x] Paletas de cores predefinidas

### 📊 CRM de Apresentações
- [x] **NOVO:** Registro de apresentações diárias
- [x] Meta de 2 apresentações por dia (seg-sex)
- [x] Dashboard com cards de lembrete
- [x] Histórico e estatísticas
- [x] Upload de fotos

### 🏆 Ranking de Frequência
- [x] **NOVO:** Ranking baseado na constância mensal
- [x] Cálculo de % de dias com meta cumprida
- [x] Integrado ao sistema de rankings

### 📁 Categorias de Usuários
- [x] **NOVO:** CRUD de categorias (admin)
- [x] Atribuição de categorias a usuários
- [x] Menu de categorias no painel admin

### 📅 Follow-up Automatizado
- [x] **NOVO:** Eventos automáticos pós-venda
- [x] 3 compromissos se vendeu (3d, 2sem, 1mês)
- [x] 1 lembrete se não vendeu (1 semana)

### 📁 Outros
- [x] Repositório de arquivos
- [x] Sistema de banners
- [x] Comunicados/Posts
- [x] Certificados PDF
- [x] Favoritos
- [x] **FIX:** Template de certificado agora mostra status "Configurado" corretamente

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
| Admin | admin@ozoxx.com | admin123 |
| Licenciado Teste | licenciado.teste@ozoxx.com | licenciado123 |
| Supervisor | supervisor@igvd.org | supervisor123 |

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
- [ ] Implementação completa da integração WhatsApp (Evolution API)
  - Aguardando credenciais do usuário (URL da instância e API Key)
- [ ] Lembretes automáticos por email
- [ ] Dashboard Avançado do Supervisor - melhorias de previsão de conclusão
- [ ] Filtro de módulos por categoria de usuário (visibilidade controlada)

### P2 (Melhorias)
- [ ] App mobile (React Native ou PWA)
- [ ] Dashboard analytics mais detalhado
- [ ] Sistema de chat entre usuários
- [ ] Relatórios de apresentações para admin

---

## 📝 Changelog

### v1.5.0 (Fevereiro 2026)
- **NOVO:** Sistema de CRM para Apresentações
  - Registro de apresentações diárias por licenciados
  - Meta de 2 apresentações por dia (exceto fins de semana)
  - Upload de fotos das apresentações
  - Dashboard com cards de lembrete de meta diária
  - Histórico completo de apresentações
  
- **NOVO:** Ranking de Frequência
  - Ranking baseado na constância mensal de apresentações
  - Calcula % de dias úteis com meta cumprida (2+ apresentações)
  - Reset automático mensal
  - Integrado ao sistema de rankings existente
  
- **NOVO:** Categorias de Usuários
  - Admin pode criar e gerenciar categorias
  - Atribuir categorias a usuários
  - Link de categorias no menu do admin
  - Preparação para filtro de conteúdo por categoria
  
- **NOVO:** Sistema de Follow-up Automatizado
  - Se venda: 3 compromissos automáticos (3 dias, 2 semanas, 1 mês)
  - Se não venda: 1 lembrete para envio de material (1 semana)
  - Eventos criados automaticamente na agenda do licenciado
  
- **FIX:** Corrigido bug de sintaxe no Dashboard.js
- **FIX:** Adicionados links de navegação faltantes no Sidebar

### v1.4.0 (Fevereiro 2026)
- **NOVO:** Comunidade (Timeline Social)
  - Posts com texto e imagens
  - Sistema de reações (5 tipos)
  - Comentários
  - Moderação (fixar, excluir)
  - Filtro de palavras proibidas configurável
  
- **NOVO:** Termos de Aceite Digital
  - Criação/edição de termos versionados pelo admin
  - Modal obrigatório para novos usuários
  - Registro completo de aceites (IP, timestamp, user-agent)
  
- **NOVO:** Landing Page Configurável
  - Design moderno com fundo claro e formas orgânicas
  - Admin pode personalizar textos, cores, logo e imagens
  - Paletas de cores predefinidas
  
- **NOVO:** Notificações WhatsApp
  - Integração preparada para Evolution API
  - Interface de configuração e envio de mensagens
  - Disparos automáticos (aniversários, lembretes)
  
- **FIX:** Modal de Termos de Aceite corrigido
  - Não aparece mais repetidamente em todas as páginas
  - Lógica de verificação otimizada

### v1.3.0 (Fevereiro 2026)
- **NOVO:** Módulo de Aula ao Vivo
  - Novo tipo de módulo com embed YouTube/Twitch
  - Chat em tempo real durante transmissões
  - Badge "Ao Vivo" nos cards de módulos
  - Página dedicada para assistir transmissões
  
- **NOVO:** Configuração de Rewatching por Módulo
  - Admin pode habilitar/desabilitar reassistir capítulos para cada módulo
  - Botão "Reassistir" aparece para capítulos concluídos quando habilitado
  
- **NOVO:** Admin pode alterar etapa de acolhimento de licenciados
  - Modal de confirmação com aviso de segurança
  - Seleção visual das 6 etapas: Registro, Documentos, Pagamento, Treinamento, Acolhimento, Completo
  - Coluna "Etapa" na tabela de usuários com badge clicável
  
- **NOVO:** Badge de notificação no menu "Atendimento"
  - Contador de mensagens não lidas (atualiza a cada 30s)
  - Animação pulse para chamar atenção
  
- **FIX:** Template de certificado agora mostra status "Configurado" corretamente
  - Corrigido endpoint de `/api/system/config` para `/api/system/config/full`

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
