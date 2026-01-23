# ================================================
# IGVD - Instituto Global de Vendas Diretas
# Guia de Instalação para Servidor Ubuntu
# ================================================

Este guia irá ajudá-lo a instalar a plataforma IGVD em seu servidor Ubuntu.

## Pré-requisitos

- Servidor Ubuntu 20.04/22.04/24.04 (64-bit)
- Mínimo 2GB RAM (recomendado 4GB)
- Mínimo 20GB de espaço em disco
- Acesso root ou sudo
- Domínio configurado: igvd.org

## Passo 1: Atualizar Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

## Passo 2: Instalar Dependências

```bash
# Instalar dependências básicas
sudo apt install -y curl wget git build-essential software-properties-common

# Instalar Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar versão
node --version  # Deve ser v20.x
npm --version

# Instalar Yarn
sudo npm install -g yarn

# Instalar Python 3.11+
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Definir Python 3.11 como padrão (opcional)
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
```

## Passo 3: Instalar MongoDB

```bash
# Importar chave GPG do MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Adicionar repositório (Ubuntu 22.04)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Instalar MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Iniciar e habilitar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verificar status
sudo systemctl status mongod
```

## Passo 4: Instalar Nginx

```bash
sudo apt install -y nginx

# Iniciar e habilitar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Passo 5: Instalar Certbot (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

## Passo 6: Copiar Arquivos da Aplicação

Copie toda a pasta da aplicação para o servidor:

```bash
# Criar diretório da aplicação
sudo mkdir -p /var/www/igvd
sudo chown $USER:$USER /var/www/igvd

# Copiar arquivos (do seu computador local)
# Use scp, rsync ou git clone

# Se usando git:
cd /var/www/igvd
git clone <seu-repositorio> .

# Ou via scp (do computador local):
# scp -r /caminho/local/app/* usuario@seu-servidor:/var/www/igvd/
```

## Passo 7: Configurar Backend

```bash
cd /var/www/igvd/backend

# Criar ambiente virtual Python
python3.11 -m venv venv
source venv/bin/activate

# Instalar dependências
pip install --upgrade pip
pip install -r requirements.txt

# Instalar emergentintegrations (para tradução com IA)
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Criar arquivo .env
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=igvd_production
JWT_SECRET=SUA_CHAVE_JWT_SECRETA_AQUI_GERE_UMA_FORTE
RESEND_API_KEY=re_aJsrcXVW_AR2Rxwo8V6Z7ZYSaVVBCGkMB
EMERGENT_LLM_KEY=sk-emergent-9DcA5D48605C1EfDdB
BACKEND_URL=https://igvd.org
EOF

# Gerar uma chave JWT segura (copie e cole no .env)
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## Passo 8: Configurar Frontend

```bash
cd /var/www/igvd/frontend

# Instalar dependências
yarn install

# Criar arquivo .env
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://igvd.org
EOF

# Build de produção
yarn build
```

## Passo 9: Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/igvd
```

Cole o seguinte conteúdo:

```nginx
server {
    listen 80;
    server_name igvd.org www.igvd.org;
    
    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name igvd.org www.igvd.org;
    
    # SSL será configurado pelo Certbot
    
    # Logs
    access_log /var/log/nginx/igvd_access.log;
    error_log /var/log/nginx/igvd_error.log;
    
    # Tamanho máximo de upload (para arquivos)
    client_max_body_size 100M;
    
    # Frontend (React build estático)
    location / {
        root /var/www/igvd/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket para chat/notificações
    location /ws {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
    
    # Arquivos de upload
    location /api/uploads {
        alias /var/www/igvd/uploads;
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

Ativar o site:

```bash
sudo ln -s /etc/nginx/sites-available/igvd /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remover site padrão
sudo nginx -t  # Testar configuração
sudo systemctl reload nginx
```

## Passo 10: Obter Certificado SSL

```bash
sudo certbot --nginx -d igvd.org -d www.igvd.org
```

Siga as instruções e escolha redirecionar HTTP para HTTPS.

## Passo 11: Configurar Serviço do Backend (Systemd)

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

Ativar e iniciar:

```bash
# Ajustar permissões
sudo chown -R www-data:www-data /var/www/igvd
sudo chmod -R 755 /var/www/igvd

# Criar diretório de uploads
sudo mkdir -p /var/www/igvd/uploads
sudo chown -R www-data:www-data /var/www/igvd/uploads

# Habilitar e iniciar serviço
sudo systemctl daemon-reload
sudo systemctl enable igvd-backend
sudo systemctl start igvd-backend

# Verificar status
sudo systemctl status igvd-backend
```

## Passo 12: Criar Usuário Admin

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
    
    # Verificar se já existe
    existing = await db.users.find_one({"email": "admin@igvd.org"})
    if existing:
        print("Admin já existe!")
        return
    
    admin = {
        "id": str(uuid.uuid4()),
        "email": "admin@igvd.org",
        "full_name": "Administrador IGVD",
        "hashed_password": pwd_context.hash("admin123"),  # MUDE ESTA SENHA!
        "role": "admin",
        "is_active": True,
        "created_at": "2024-01-01T00:00:00Z"
    }
    
    await db.users.insert_one(admin)
    print("✅ Admin criado com sucesso!")
    print("📧 Email: admin@igvd.org")
    print("🔑 Senha: admin123")
    print("⚠️  IMPORTANTE: Mude a senha após o primeiro login!")

asyncio.run(create_admin())
EOF
```

## Passo 13: Verificar Instalação

1. Acesse https://igvd.org
2. Faça login com admin@igvd.org / admin123
3. Mude a senha imediatamente!

## Comandos Úteis

```bash
# Ver logs do backend
sudo journalctl -u igvd-backend -f

# Reiniciar backend
sudo systemctl restart igvd-backend

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs do Nginx
sudo tail -f /var/log/nginx/igvd_error.log

# Ver logs do MongoDB
sudo tail -f /var/log/mongodb/mongod.log

# Backup do banco de dados
mongodump --db igvd_production --out /backup/$(date +%Y%m%d)

# Restaurar backup
mongorestore --db igvd_production /backup/20240101/igvd_production
```

## Renovação Automática do SSL

O Certbot já configura renovação automática. Para testar:

```bash
sudo certbot renew --dry-run
```

## Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## Atualização da Aplicação

```bash
cd /var/www/igvd

# Pull das atualizações
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart igvd-backend

# Frontend
cd ../frontend
yarn install
yarn build
sudo systemctl reload nginx
```

---

## Suporte

Em caso de problemas, verifique:
1. Logs do backend: `sudo journalctl -u igvd-backend -f`
2. Logs do Nginx: `sudo tail -f /var/log/nginx/igvd_error.log`
3. Status dos serviços: `sudo systemctl status mongod igvd-backend nginx`

---

**IGVD - Instituto Global de Vendas Diretas**
Documentação de Deploy v1.0
