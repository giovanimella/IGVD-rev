# ================================================
# IGVD - Instituto Global de Vendas Diretas
# Guia de Instalação para Servidor Ubuntu
# Versão 2.0 - Compatível com Ubuntu 20.04 a 24.10+
# ================================================

Este guia irá ajudá-lo a instalar a plataforma IGVD em seu servidor Ubuntu.

## Pré-requisitos

- Servidor Ubuntu 20.04/22.04/24.04/24.10+ (64-bit)
- Mínimo 2GB RAM (recomendado 4GB)
- Mínimo 20GB de espaço em disco
- Acesso root ou sudo
- Domínio configurado: igvd.org

---

## 🚀 Instalação Rápida (Recomendado)

```bash
# 1. Acesse o diretório deploy
cd /var/www/igvd/deploy

# 2. Dê permissão de execução
sudo chmod +x install.sh

# 3. Execute o instalador
sudo ./install.sh

# 4. Escolha opção 1 (Instalação completa)
```

O script irá:
- Detectar sua versão do Ubuntu automaticamente
- Instalar todas as dependências
- Configurar MongoDB, Nginx e SSL
- Criar o usuário administrador

---

## 📋 Instalação Manual (Passo a Passo)

### Passo 1: Atualizar Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### Passo 2: Instalar Dependências

```bash
# Dependências básicas
sudo apt install -y curl wget git build-essential software-properties-common gnupg lsb-release

# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar versão
node --version  # Deve ser v20.x
npm --version

# Instalar Yarn
sudo npm install -g yarn

# Python (usar versão do sistema - Ubuntu 22.04+ já tem Python 3.10+)
sudo apt install -y python3-venv python3-dev python3-pip python3-full

# Verificar versão
python3 --version
```

### Passo 3: Instalar MongoDB

```bash
# Importar chave GPG
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Adicionar repositório (usar jammy para Ubuntu 24.x)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Instalar
sudo apt update
sudo apt install -y mongodb-org

# Iniciar e habilitar
sudo systemctl start mongod
sudo systemctl enable mongod

# Verificar status
sudo systemctl status mongod
```

### Passo 4: Instalar Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Passo 5: Configurar Backend

```bash
cd /var/www/igvd/backend

# Criar ambiente virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependências
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Criar arquivo .env
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=igvd_production
JWT_SECRET=GERE_UMA_CHAVE_SEGURA_AQUI
RESEND_API_KEY=re_aJsrcXVW_AR2Rxwo8V6Z7ZYSaVVBCGkMB
EMERGENT_LLM_KEY=sk-emergent-9DcA5D48605C1EfDdB
BACKEND_URL=https://igvd.org
EOF

# Gerar chave JWT segura (copie e cole no .env)
python3 -c "import secrets; print(secrets.token_hex(32))"

deactivate
```

### Passo 6: Configurar Frontend

```bash
cd /var/www/igvd/frontend

# Criar arquivo .env
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://igvd.org
EOF

# Instalar e compilar
yarn install
yarn build
```

### Passo 7: Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/igvd
```

Cole o conteúdo do arquivo `nginx-igvd.conf` incluído no diretório deploy.

```bash
# Ativar site
sudo ln -sf /etc/nginx/sites-available/igvd /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Passo 8: Obter Certificado SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d igvd.org -d www.igvd.org
```

### Passo 9: Configurar Serviço do Backend

```bash
sudo nano /etc/systemd/system/igvd-backend.service
```

Cole:

```ini
[Unit]
Description=IGVD Backend API
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/igvd/backend
Environment="PATH=/var/www/igvd/backend/venv/bin"
ExecStart=/var/www/igvd/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Ativar:

```bash
sudo chown -R www-data:www-data /var/www/igvd
sudo chmod -R 755 /var/www/igvd
sudo systemctl daemon-reload
sudo systemctl enable igvd-backend
sudo systemctl start igvd-backend
```

### Passo 10: Criar Usuário Admin

```bash
cd /var/www/igvd/backend
source venv/bin/activate

python3 << 'EOF'
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid
import os
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    existing = await db.users.find_one({"email": "admin@igvd.org"})
    if existing:
        print("Admin já existe!")
        return
    
    admin = {
        "id": str(uuid.uuid4()),
        "email": "admin@igvd.org",
        "full_name": "Administrador IGVD",
        "hashed_password": pwd_context.hash("admin123"),
        "role": "admin",
        "is_active": True,
        "created_at": "2024-01-01T00:00:00Z"
    }
    
    await db.users.insert_one(admin)
    print("✅ Admin criado!")
    print("📧 Email: admin@igvd.org")
    print("🔑 Senha: admin123")

asyncio.run(create_admin())
EOF

deactivate
```

---

## 🔥 Firewall

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## 📝 Comandos Úteis

```bash
# Status dos serviços
sudo systemctl status mongod
sudo systemctl status nginx
sudo systemctl status igvd-backend

# Logs do backend
sudo journalctl -u igvd-backend -f

# Logs do Nginx
sudo tail -f /var/log/nginx/igvd_error.log

# Reiniciar serviços
sudo systemctl restart igvd-backend
sudo systemctl restart nginx

# Backup do banco
mongodump --db igvd_production --out /backup/$(date +%Y%m%d)

# Restaurar backup
mongorestore --db igvd_production /backup/20240101/igvd_production
```

---

## 🔄 Atualização

```bash
cd /var/www/igvd

# Pull das atualizações (se usando git)
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate
sudo systemctl restart igvd-backend

# Frontend
cd ../frontend
yarn install
yarn build
sudo systemctl reload nginx
```

---

## ❗ Troubleshooting

### MongoDB não inicia
```bash
sudo tail -f /var/log/mongodb/mongod.log
# Verificar permissões
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown -R mongodb:mongodb /var/log/mongodb
```

### Backend não inicia
```bash
sudo journalctl -u igvd-backend -f
# Verificar se MongoDB está rodando
sudo systemctl status mongod
```

### SSL não funciona
```bash
# Verificar DNS
dig igvd.org
# Tentar novamente
sudo certbot --nginx -d igvd.org
```

### Erro 502 Bad Gateway
```bash
# Verificar se backend está rodando
sudo systemctl status igvd-backend
# Reiniciar
sudo systemctl restart igvd-backend
```

---

## 🔐 Credenciais Padrão

| Usuário | Email | Senha |
|---------|-------|-------|
| Admin | admin@igvd.org | admin123 |

⚠️ **IMPORTANTE:** Mude a senha após o primeiro login!

---

**IGVD - Instituto Global de Vendas Diretas**
Documentação de Deploy v2.0
