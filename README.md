# 🎓 IGVD - Instituto Global de Vendas Diretas - Plataforma LMS

Sistema completo de gestão de aprendizagem (LMS) com gamificação, gestão de assinaturas, sistema de pontos, treinamentos presenciais, campanhas e dashboard analítico avançado.

---

## 📋 Stack Tecnológica

- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- **Backend**: FastAPI (Python 3.10+)
- **Banco de Dados**: MongoDB 5.0+
- **Autenticação**: JWT com bcrypt
- **Pagamentos**: PagBank (assinaturas recorrentes)
- **Email**: Resend
- **Notificações**: Sistema interno + WhatsApp (Evolution API)

---

## 🚀 Instalação Rápida

### 1. Clone o repositório
```bash
git clone <seu-repositorio>
cd app
```

### 2. Configure o Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure o Frontend
```bash
cd frontend
yarn install
```

### 4. Configure variáveis de ambiente

**Backend (.env):**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=igvd_prod
JWT_SECRET_KEY=sua_chave_secreta_aqui
RESEND_API_KEY=re_xxxxx
APP_URL=https://seudominio.com
```

**Frontend (.env):**
```env
REACT_APP_BACKEND_URL=https://seudominio.com
REACT_APP_NAME=IGVD
```

### 5. Iniciar Aplicação
```bash
# Backend
cd backend && uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend (em outro terminal)
cd frontend && yarn start
```

---

## 📁 Estrutura do Projeto

```
app/
├── backend/              # API FastAPI
│   ├── routes/          # 30+ endpoints organizados
│   ├── models.py        # Modelos Pydantic
│   ├── models_subscription.py  # Modelos de assinatura
│   ├── server.py        # Servidor principal
│   ├── auth.py          # Autenticação JWT
│   └── create_admin.py  # Script para criar admin
├── frontend/            # Aplicação React
│   ├── src/
│   │   ├── components/ # Componentes reutilizáveis
│   │   ├── pages/      # Páginas (admin, supervisor, licenciado)
│   │   ├── contexts/   # Context API (Auth, Theme)
│   │   └── App.js      # Roteamento principal
│   └── build/          # Build de produção
├── uploads/            # Arquivos enviados
│   ├── avatars/
│   ├── documents/
│   ├── videos/
│   ├── presentations/
│   ├── timeline/
│   └── landing/
└── README.md          # Este arquivo
```

---

## 👥 Tipos de Usuário

| Papel | Descrição | Acesso |
|-------|-----------|--------|
| **Admin** | Controle total do sistema | Todas as funcionalidades |
| **Supervisor** | Gestão de licenciados | Dashboard, relatórios, gerenciamento |
| **Licenciado** | Usuário final | Módulos, recompensas, timeline, perfil |

---

## ✨ Funcionalidades Principais

### 🎓 **Sistema de Aprendizagem (LMS)**

#### Módulos e Capítulos
- ✅ Conteúdo em vídeo, texto, PDF ou apresentação
- ✅ Progresso automático por capítulo
- ✅ Validação de tempo mínimo de visualização
- ✅ Categorias e tags para organização
- ✅ Pré-requisitos entre módulos
- ✅ Sistema de favoritos

#### Avaliações (Quiz)
- ✅ Questões múltipla escolha
- ✅ Score mínimo configurável
- ✅ Múltiplas tentativas
- ✅ Feedback imediato
- ✅ Histórico de tentativas

#### Certificados Digitais
- ✅ Geração automática em PDF
- ✅ Template personalizável
- ✅ QR Code de validação
- ✅ Assinatura digital
- ✅ Disponível após aprovação

---

### 🎮 **Gamificação Completa**

#### Sistema de Pontos com Expiração
- ✅ **Pontos por acesso diário** (configurável)
- ✅ **Pontos por treinamento presencial** (configurável)
- ✅ **Pontos por conclusão de módulos**
- ✅ **Sistema de expiração individual** - Cada ponto tem validade configurável
- ✅ Admin pode adicionar/remover pontos manualmente
- ✅ Histórico completo de transações
- ✅ Resumo de pontos expirando

#### Níveis e Badges
- ✅ Sistema de XP e níveis configuráveis
- ✅ 20+ badges de conquistas
- ✅ Streaks de acesso consecutivo
- ✅ Desafios semanais
- ✅ Leaderboard (ranking)

#### Recompensas
- ✅ Loja de recompensas por pontos
- ✅ **Foto da recompensa visível** na página de resgate
- ✅ Sistema de aprovação de resgates
- ✅ Histórico de resgates
- ✅ Status (pendente, aprovado, entregue)

---

### 📊 **Dashboard Admin Avançado**

#### Métricas de Engajamento
- ✅ **Usuários ativos hoje**
- ✅ **Usuários ativos na semana**
- ✅ **Taxa média de conclusão de módulos**
- ✅ **Tempo médio de onboarding**

#### Métricas Financeiras
- ✅ **MRR (Receita Mensal Recorrente)**
- ✅ **Taxa de Churn** (cancelamentos)
- ✅ **Assinaturas expirando em 7 dias**
- ✅ Assinaturas ativas vs suspensas

#### Monitoramento de Conteúdo
- ✅ **Top 10 módulos mais acessados**
- ✅ **Top 10 capítulos mais visualizados**
- ✅ Taxa de conclusão por módulo
- ✅ Usuários únicos por conteúdo

#### Ações Rápidas
- ✅ **Enviar notificação push** para múltiplos usuários
- ✅ Gerenciar usuários
- ✅ Gerenciar módulos
- ✅ Gerenciar recompensas

#### Gráficos Interativos
- ✅ Crescimento de usuários (linha do tempo)
- ✅ Distribuição por etapa de onboarding (pizza)
- ✅ Métricas em tempo real

---

### 💳 **Sistema de Assinaturas (PagBank)**

#### Gestão de Assinaturas
- ✅ Integração completa com PagBank
- ✅ Planos mensais recorrentes
- ✅ Gerenciamento de cartões
- ✅ **Licenciado pode reativar assinatura cancelada**
- ✅ **Admin pode reativar ou cancelar qualquer assinatura**
- ✅ Webhooks para sincronização automática
- ✅ Teste de conexão com API

#### Status e Controles
- ✅ Status: active, trial, suspended, cancelled, overdue
- ✅ Sincronização manual de status
- ✅ Histórico de pagamentos
- ✅ Alertas de vencimento
- ✅ Métricas de assinaturas no dashboard

---

### 🎯 **Campanhas de Incentivo**

#### Tipos de Métricas
- ✅ Frequência de apresentações
- ✅ Média de notas
- ✅ Total de pontos
- ✅ **Total de apresentações no período**
- ✅ **Total de reuniões finalizadas**
- ✅ **Participantes em reuniões**

#### Gestão de Campanhas
- ✅ Criação com período e meta
- ✅ Recompensas configuráveis
- ✅ Ranking de participantes
- ✅ Progresso individual
- ✅ Ícones e cores personalizáveis

---

### 👨‍🏫 **Treinamentos Presenciais**

#### Gerenciamento de Turmas
- ✅ Criação de turmas com data/local
- ✅ Inscrições online
- ✅ Formulário com dados de hospedagem
- ✅ Opção de trazer cônjuge
- ✅ **Pontos automáticos ao concluir** (configurável)

#### Controles
- ✅ Lista de presença em PDF
- ✅ Marcar presença pós-treinamento
- ✅ Controle de vagas
- ✅ Status (aberta, fechada, concluída)
- ✅ Avanço automático de etapa

---

### 📱 **Comunidade Social (Timeline)**

#### Funcionalidades
- ✅ Posts estilo Twitter/LinkedIn
- ✅ Upload de imagens
- ✅ Sistema de likes e reações
- ✅ Comentários em posts
- ✅ Posts fixados (admin)
- ✅ **Filtro de palavras proibidas** (configurável)

#### Segurança
- ✅ Validação de conteúdo
- ✅ Bloqueio automático de palavras
- ✅ Moderação de posts
- ✅ Exclusão de posts/comentários

---

### 📄 **Termos de Aceite Digital**

- ✅ Gerenciamento de termos pelo admin
- ✅ Controle de versões
- ✅ Modal de aceite obrigatório
- ✅ Registro de IP e user-agent
- ✅ Comprovante de aceite em PDF
- ✅ Histórico de aceites

---

### 📲 **Notificações WhatsApp (Evolution API)**

#### Tipos de Notificação
- ✅ Novos módulos disponíveis
- ✅ Dicas diárias
- ✅ Lembretes de acesso
- ✅ Aniversariantes do dia
- ✅ Aulas ao vivo
- ✅ Mensagens personalizadas

#### Controles
- ✅ Configuração de API
- ✅ Teste de conexão
- ✅ Envio em massa
- ✅ Histórico de mensagens
- ✅ Status de entrega

---

### 🌐 **Landing Page Configurável**

#### Personalização Total
- ✅ Logo customizável
- ✅ Cores e tema
- ✅ Imagem hero
- ✅ Textos editáveis
- ✅ Seção de features
- ✅ SEO (meta tags)
- ✅ Página pública ("/")

---

### 🎯 **Sistema de Onboarding**

#### Etapas do Licenciado
1. **Registro** - Cadastro inicial
2. **Documentos PF** - Upload de documentos pessoais
3. **Acolhimento** - Módulos introdutórios
4. **Treinamento Presencial** - Participação em turma
5. **Vendas em Campo** - 10 vendas obrigatórias
6. **Documentos PJ** - Documentos jurídicos
7. **Completo** - Onboarding finalizado

#### Funcionalidades
- ✅ **Etapas clicáveis** no dashboard
- ✅ Progresso visual (barra)
- ✅ Admin pode alterar etapa manualmente
- ✅ Avanço automático por ações
- ✅ Validações por etapa

---

### 📋 **Painel do Supervisor**

#### Dashboard Avançado
- ✅ Estatísticas de licenciados
- ✅ Progresso por etapa
- ✅ Licenciados recentes
- ✅ Ações rápidas

#### Detalhes do Licenciado
- ✅ **Página completa de detalhes** (clique no nome)
- ✅ Informações pessoais
- ✅ Pontos e nível
- ✅ Etapa do onboarding
- ✅ Vendas em campo
- ✅ **Download de documentos**
- ✅ Recompensas pendentes
- ✅ Progresso nos módulos
- ✅ Status de pagamento

---

### 🔔 **Sistema de Notificações**

#### Notificações Internas
- ✅ Badge de contagem
- ✅ Dropdown com últimas notificações
- ✅ Tipos: info, success, warning, error
- ✅ Links para recursos relacionados
- ✅ Marcar como lida

#### Notificações Push
- ✅ **Broadcast para grupos** (licenciados, supervisores, todos)
- ✅ Modal de envio no dashboard admin
- ✅ Contador de envios

---

### 👤 **Gerenciamento de Usuários**

#### Admin
- ✅ **Criar usuários** (qualquer nível)
- ✅ **Editar dados** (nome, telefone, nível)
- ✅ **Deletar usuários**
- ✅ Clique no nome para editar
- ✅ Badges coloridos por nível
- ✅ Estatísticas por tipo

#### Perfil do Usuário
- ✅ Edição de dados pessoais
- ✅ Troca de senha
- ✅ Upload de avatar
- ✅ Visualização de pontos e nível
- ✅ Histórico de atividades

---

### 📁 **Gestão de Arquivos**

#### Upload e Download
- ✅ Upload de múltiplos arquivos
- ✅ Categorização por tipo
- ✅ Controle de acesso
- ✅ Download de documentos
- ✅ Visualização inline

#### Tipos Suportados
- ✅ Vídeos (.mp4, .mov, .avi)
- ✅ Documentos (.pdf, .doc, .docx)
- ✅ Apresentações (.ppt, .pptx)
- ✅ Imagens (.jpg, .png, .gif)

---

### 📅 **Agenda e Compromissos**

- ✅ Calendário visual
- ✅ Criar compromissos
- ✅ Categorias personalizadas
- ✅ Widget no dashboard
- ✅ Notificações de eventos

---

### 🎥 **Apresentações e Reuniões**

#### Apresentações
- ✅ Registro de apresentações diárias
- ✅ Controle de frequência
- ✅ Metas configuráveis
- ✅ Estatísticas mensais

#### Reuniões
- ✅ Criação de reuniões
- ✅ Controle de participantes
- ✅ Status (aberta, fechada)
- ✅ Relatórios

---

### 🏆 **Vendas em Campo**

- ✅ Registro de vendas
- ✅ Meta de 10 vendas
- ✅ Validação automática
- ✅ Avanço de etapa ao completar
- ✅ Histórico completo

---

### 🎬 **Ozoxx Cast (Podcast)**

- ✅ Episódios com áudio
- ✅ Player integrado
- ✅ Categorias
- ✅ Sistema de favoritos
- ✅ Histórico de reprodução

---

### 📊 **Analytics e Relatórios**

#### Métricas Disponíveis
- ✅ Total de usuários
- ✅ Módulos por categoria
- ✅ Taxa de conclusão
- ✅ Engajamento por período
- ✅ Progresso por usuário
- ✅ Resgates pendentes
- ✅ Assinaturas ativas

#### Exportação
- ✅ Relatórios em PDF
- ✅ Listas de presença
- ✅ Certificados
- ✅ Comprovantes de aceite

---

## 🔧 Painel do Sistema (Admin)

### Abas Disponíveis

#### 1️⃣ **Gestão**
- Estatísticas gerais
- Ações rápidas

#### 2️⃣ **Configurações**
- Nome da plataforma
- Score mínimo de aprovação
- Upload de logo
- Aparência

#### 3️⃣ **Conteúdo**
- Gerenciar módulos
- Gerenciar capítulos
- Categorias
- Tags

#### 4️⃣ **Integrações**
- Webhooks
- APIs externas
- Evolution API (WhatsApp)
- PagBank

#### 5️⃣ **Segurança**
- Logs de acesso
- Controle de permissões
- Backup de dados

#### 6️⃣ **Pontos** ⭐ NOVO
- **Configurar validade dos pontos** (em meses)
- **Configurar pontos por acesso diário**
- **Configurar pontos por treinamento**
- **Adicionar/remover pontos manualmente**
- Visualizar pontos expirando
- Top 10 usuários afetados
- Processar expiração manual

---

## 📱 Menu Lateral (Sidebar)

### Admin
- 📊 Dashboard
- 👥 Usuários
- 📚 Módulos
- 🎁 Recompensas
- 🏆 Campanhas
- 👨‍🏫 Treinamentos
- 💳 Assinaturas
- 📄 Termos de Aceite
- 📱 WhatsApp
- 🛡️ Filtro de Palavras
- 🌐 Landing Page
- 💬 Comunidade
- ⚙️ Sistema

### Supervisor
- 📊 Dashboard
- 📊 Painel Avançado
- 👥 Meus Licenciados
- 📚 Módulos
- 🏆 Ranking
- 💬 Comunidade
- 👤 Perfil

### Licenciado
- 📊 Dashboard
- 📚 Meus Módulos
- 🎁 Recompensas
- 🏆 Ranking
- 📅 Agenda
- 👨‍🏫 Treinamentos
- 💬 Comunidade
- 🎬 Ozoxx Cast
- 👤 Perfil

---

## 🔒 Segurança

- ✅ Autenticação JWT com refresh token
- ✅ Senhas hasheadas com bcrypt
- ✅ CORS configurável
- ✅ Rate limiting
- ✅ Validação de inputs (Pydantic)
- ✅ Upload seguro de arquivos
- ✅ Proteção contra XSS
- ✅ HTTPS obrigatório em produção

---

## 📦 Dependências Principais

### Backend
```
fastapi
uvicorn
pymongo
motor (async MongoDB)
pydantic
python-jose (JWT)
passlib (bcrypt)
python-multipart
httpx
resend
```

### Frontend
```
react
react-router-dom
axios
tailwindcss
@radix-ui/react-*
lucide-react
recharts
sonner (toasts)
```

---

## 🚀 Deploy em Produção

### Pré-requisitos
- Python 3.10+
- Node.js 18+
- MongoDB 5.0+
- Nginx (proxy reverso)
- SSL/TLS (Let's Encrypt)

### Passos
1. Clone o repositório
2. Configure variáveis de ambiente
3. Build do frontend: `yarn build`
4. Instale dependências do backend
5. Configure Nginx
6. Inicie com PM2 ou Supervisor
7. Configure SSL com Certbot

Consulte `DEPLOY.md` para instruções detalhadas.

---

## 📈 Histórico de Atualizações

### Versão 2.5.0 (Março 2026) - Última Atualização

#### ✅ Dashboard Admin Aprimorado
- Adicionadas 11 novas métricas (engajamento + financeiro)
- Gráfico de top conteúdos mais acessados
- Modal de envio de notificação push
- Cards redesenhados e responsivos

#### ✅ Sistema de Pontos Expandido
- Pontos por acesso diário (configurável)
- Pontos por treinamento presencial (configurável)
- Interface para adicionar pontos manualmente
- Sistema de expiração individual por transação
- Painel completo de gerenciamento

#### ✅ Gestão de Assinaturas
- Licenciado pode reativar assinatura cancelada
- Admin pode reativar/cancelar qualquer assinatura
- Botões de ação na tabela de assinaturas
- Métricas financeiras no dashboard (MRR, Churn)

#### ✅ Campanhas de Incentivo
- 3 novos tipos de métricas: apresentações, reuniões, participantes
- 6 tipos de métricas disponíveis
- Suporte completo a diferentes KPIs

#### ✅ Recompensas
- Foto da recompensa visível na página de resgate
- Layout aprimorado dos cards
- Melhor experiência visual

#### ✅ Melhorias de UX
- Abas do painel do sistema redesenhadas (sem linha cortando)
- Cards de pontos perfeitamente alinhados
- Layout responsivo aprimorado
- Correções de sintaxe e erros

### Versão 2.4.0 (Fevereiro 2026)

#### ✅ Comunidade Social (Timeline)
- Posts estilo Twitter/LinkedIn
- Sistema de likes e comentários
- Upload de imagens
- Filtro de palavras proibidas

#### ✅ Dashboard Avançado do Supervisor
- Métricas detalhadas de licenciados
- Gráficos interativos
- Página de detalhes do licenciado completa

#### ✅ Termos de Aceite Digital
- Gestão de termos pelo admin
- Modal de aceite obrigatório
- Registro completo com IP
- Comprovante em PDF

#### ✅ Notificações WhatsApp
- Integração com Evolution API
- 6 tipos de notificações automáticas
- Envio em massa
- Histórico de mensagens

#### ✅ Landing Page Configurável
- Editor visual no painel admin
- Personalização completa
- SEO otimizado
- Página pública

### Versão 2.3.0 (Janeiro 2026)

#### ✅ Etapas Clicáveis
- Dashboard do licenciado com etapas clicáveis
- Navegação rápida entre etapas
- Feedback visual aprimorado

#### ✅ Página de Detalhes do Licenciado
- Visualização completa pelo supervisor
- Download de documentos
- Progresso detalhado

#### ✅ Dashboard do Supervisor
- Seção específica com estatísticas
- Cards e ações rápidas
- Lista de licenciados recentes

#### ✅ Gerenciamento de Usuários
- Criar usuários (qualquer nível)
- Editar dados
- Deletar usuários
- Modal responsivo

#### ✅ Correções de Sistema
- Menu dropdown na foto do perfil
- Sistema de etapas sincronizado
- Chat temporariamente desabilitado

---

## 🎯 Roadmap Futuro

### Em Desenvolvimento
- [ ] Integração com mais gateways de pagamento
- [ ] App mobile (React Native)
- [ ] Videoconferência integrada
- [ ] Certificados NFT
- [ ] Marketplace de cursos

### Planejado
- [ ] Multi-idioma
- [ ] Analytics avançado (Google Analytics, Mixpanel)
- [ ] Automações de marketing
- [ ] Integrações CRM
- [ ] API pública

---

## 💡 Créditos

- **Desenvolvido para:** Instituto Global de Vendas Diretas (IGVD)
- **Tecnologia:** React + FastAPI + MongoDB
- **Versão:** 2.5.0
- **Última Atualização:** Março 2026

---

## 📞 Suporte

Para dúvidas técnicas ou suporte:
1. Consulte a documentação em `/app/GUIA_COMPLETO_PRODUCAO.md`
2. Verifique os logs: `sudo supervisorctl tail backend` ou `sudo supervisorctl tail frontend`
3. Documentação de deploy: `/app/DEPLOY.md`

---

## 📄 Licença

Proprietário - Todos os direitos reservados © 2026 IGVD

---

**🎉 Sistema pronto para produção com 100+ funcionalidades!**
