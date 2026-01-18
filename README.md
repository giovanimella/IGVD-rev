# 🎓 UniOzoxx - Plataforma de Treinamento para Licenciados

Sistema completo de EAD com gamificação, avaliações, certificados, gerenciamento de treinamentos presenciais e muito mais.

## 📋 Stack Tecnológica

- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python 3.10+)
- **Banco de Dados**: MongoDB 5.0+
- **Autenticação**: JWT
- **Email**: Resend

## 🚀 Instalação Rápida

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/uniozoxx.git
cd uniozoxx
```

### 2. Execute o Wizard de Configuração
```bash
python3 setup_wizard.py
```

O wizard irá:
- Coletar configurações (URL, banco de dados, etc.)
- Testar conexão com MongoDB
- Criar usuário administrador
- Gerar arquivos .env
- Inicializar o banco com dados padrão

### 3. Build e Deploy
```bash
./build.sh
```

### 4. Iniciar a Aplicação
```bash
# Usando PM2 (recomendado)
pm2 start ecosystem.config.js

# Ou manualmente
cd backend && source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
```

## 📁 Estrutura do Projeto

```
uniozoxx/
├── frontend/           # Aplicação React
│   ├── src/
│   │   ├── components/ # Componentes reutilizáveis
│   │   ├── pages/      # Páginas da aplicação
│   │   └── ...
│   └── build/          # Build de produção
├── backend/            # API FastAPI
│   ├── routes/         # Endpoints da API
│   ├── models.py       # Modelos de dados
│   ├── server.py       # Servidor principal
│   └── auth.py         # Autenticação JWT
├── setup_wizard.py     # Wizard de configuração
├── init_database.py    # Inicialização do banco
├── build.sh           # Script de build
├── ecosystem.config.js # Configuração PM2
├── DEPLOY.md          # Guia completo de deploy
└── README.md          # Este arquivo
```

## 👥 Tipos de Usuário

| Papel | Descrição |
|-------|-----------|
| **Admin** | Acesso total: módulos, usuários, configurações, relatórios |
| **Supervisor** | Gerencia licenciados, visualiza documentos e progresso |
| **Licenciado** | Consome conteúdo, completa treinamentos, obtém certificados |

## ✨ Funcionalidades

### 📚 Sistema de Módulos e Capítulos
- Conteúdo em vídeo, texto ou documento
- Progresso automático
- Validação de consumo de conteúdo

### 🎮 Gamificação
- Sistema de pontos
- Níveis configuráveis
- Badges e conquistas
- Streaks de acesso
- Desafios semanais

### 📝 Avaliações
- Quiz ao final de cada módulo
- Score mínimo configurável
- Múltiplas tentativas

### 🎓 Certificados
- Geração automática em PDF
- Template configurável
- Disponível após aprovação na avaliação

### 👨‍🏫 Treinamentos Presenciais
- Gerenciamento de turmas
- Inscrição com dados de hospedagem
- Opção de cônjuge
- Pagamento integrado (em desenvolvimento)
- Lista de presença em PDF
- Controle de presença pós-treinamento

### 📁 Repositório de Arquivos
- Sistema de pastas
- Upload de documentos
- Download por licenciados

### 📅 Agenda
- Calendário de compromissos
- Categorias personalizadas
- Widget no dashboard

### 🔔 Notificações
- Notificações em tempo real
- Emails automáticos

## ⚙️ Configuração

### Variáveis de Ambiente (Backend)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=uniozoxx_prod
JWT_SECRET_KEY=sua_chave_secreta
RESEND_API_KEY=re_xxxxx
APP_URL=https://seudominio.com.br
```

### Variáveis de Ambiente (Frontend)
```env
REACT_APP_BACKEND_URL=https://seudominio.com.br
REACT_APP_NAME=UniOzoxx
```

## 📖 Documentação

- [Guia de Deploy](DEPLOY.md) - Instruções detalhadas de instalação
- [API Reference](backend/README.md) - Documentação da API (em breve)

## 🔒 Segurança

- Autenticação via JWT
- Senhas hasheadas com bcrypt
- Rate limiting
- CORS configurável
- Validação de uploads

## 📞 Suporte

Para dúvidas sobre a instalação, consulte:
1. [DEPLOY.md](DEPLOY.md) - Guia de deploy
2. Logs do sistema (`pm2 logs`)

## 📄 Licença

Proprietário - Todos os direitos reservados.
