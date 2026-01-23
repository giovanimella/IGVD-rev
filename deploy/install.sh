#!/bin/bash

# ================================================
# IGVD - Instituto Global de Vendas Diretas
# Script de Instalação Automatizada
# ================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variáveis de configuração
DOMAIN="igvd.org"
APP_DIR="/var/www/igvd"
DB_NAME="igvd_production"
ADMIN_EMAIL="admin@igvd.org"
ADMIN_PASSWORD="admin123"  # MUDE DEPOIS DO PRIMEIRO LOGIN!

# Chaves (serão configuradas durante instalação)
JWT_SECRET=""
RESEND_API_KEY="re_aJsrcXVW_AR2Rxwo8V6Z7ZYSaVVBCGkMB"
EMERGENT_LLM_KEY="sk-emergent-9DcA5D48605C1EfDdB"

echo -e "${BLUE}"
echo "================================================"
echo "  IGVD - Instituto Global de Vendas Diretas"
echo "  Script de Instalação"
echo "================================================"
echo -e "${NC}"

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Por favor, execute como root (sudo)${NC}"
    exit 1
fi

# Gerar JWT Secret
JWT_SECRET=$(openssl rand -hex 32)
echo -e "${GREEN}✓ JWT Secret gerado${NC}"

# Função para instalar dependências
install_dependencies() {
    echo -e "${BLUE}[1/10] Instalando dependências do sistema...${NC}"
    
    apt update && apt upgrade -y
    apt install -y curl wget git build-essential software-properties-common gnupg
    
    # Node.js 20.x
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    npm install -g yarn
    
    # Python 3.11
    add-apt-repository ppa:deadsnakes/ppa -y
    apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
    
    echo -e "${GREEN}✓ Dependências instaladas${NC}"
}

# Função para instalar MongoDB
install_mongodb() {
    echo -e "${BLUE}[2/10] Instalando MongoDB...${NC}"
    
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    
    # Detectar versão do Ubuntu
    UBUNTU_VERSION=$(lsb_release -cs)
    if [ "$UBUNTU_VERSION" = "noble" ]; then
        UBUNTU_VERSION="jammy"  # MongoDB não tem repo para 24.04 ainda
    fi
    
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${UBUNTU_VERSION}/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    
    apt update
    apt install -y mongodb-org
    
    systemctl start mongod
    systemctl enable mongod
    
    echo -e "${GREEN}✓ MongoDB instalado e iniciado${NC}"
}

# Função para instalar Nginx
install_nginx() {
    echo -e "${BLUE}[3/10] Instalando Nginx...${NC}"
    
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    
    echo -e "${GREEN}✓ Nginx instalado${NC}"
}

# Função para configurar aplicação
setup_application() {
    echo -e "${BLUE}[4/10] Configurando aplicação...${NC}"
    
    mkdir -p $APP_DIR
    mkdir -p $APP_DIR/uploads
    
    # Se os arquivos já estiverem no diretório atual, copiar
    if [ -d "./backend" ] && [ -d "./frontend" ]; then
        cp -r ./backend $APP_DIR/
        cp -r ./frontend $APP_DIR/
        echo -e "${GREEN}✓ Arquivos copiados${NC}"
    else
        echo -e "${YELLOW}⚠ Arquivos não encontrados no diretório atual.${NC}"
        echo -e "${YELLOW}  Copie os arquivos manualmente para $APP_DIR${NC}"
    fi
}

# Função para configurar backend
setup_backend() {
    echo -e "${BLUE}[5/10] Configurando Backend...${NC}"
    
    cd $APP_DIR/backend
    
    # Criar ambiente virtual
    python3.11 -m venv venv
    source venv/bin/activate
    
    # Instalar dependências
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
    
    # Criar .env
    cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=${DB_NAME}
JWT_SECRET=${JWT_SECRET}
RESEND_API_KEY=${RESEND_API_KEY}
EMERGENT_LLM_KEY=${EMERGENT_LLM_KEY}
BACKEND_URL=https://${DOMAIN}
EOF
    
    deactivate
    echo -e "${GREEN}✓ Backend configurado${NC}"
}

# Função para configurar frontend
setup_frontend() {
    echo -e "${BLUE}[6/10] Configurando Frontend...${NC}"
    
    cd $APP_DIR/frontend
    
    # Criar .env
    cat > .env << EOF
REACT_APP_BACKEND_URL=https://${DOMAIN}
EOF
    
    # Instalar dependências e build
    yarn install
    yarn build
    
    echo -e "${GREEN}✓ Frontend configurado e compilado${NC}"
}

# Função para configurar Nginx
setup_nginx() {
    echo -e "${BLUE}[7/10] Configurando Nginx...${NC}"
    
    cat > /etc/nginx/sites-available/igvd << 'NGINX_EOF'
server {
    listen 80;
    server_name igvd.org www.igvd.org;
    
    location / {
        root /var/www/igvd/frontend/build;
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
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
    }
    
    location /ws {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
    
    location /api/uploads {
        alias /var/www/igvd/uploads;
        expires 30d;
    }
    
    client_max_body_size 100M;
}
NGINX_EOF
    
    ln -sf /etc/nginx/sites-available/igvd /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    nginx -t
    systemctl reload nginx
    
    echo -e "${GREEN}✓ Nginx configurado${NC}"
}

# Função para configurar SSL
setup_ssl() {
    echo -e "${BLUE}[8/10] Configurando SSL (Let's Encrypt)...${NC}"
    
    apt install -y certbot python3-certbot-nginx
    
    echo -e "${YELLOW}Executando Certbot...${NC}"
    certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect
    
    echo -e "${GREEN}✓ SSL configurado${NC}"
}

# Função para configurar systemd
setup_systemd() {
    echo -e "${BLUE}[9/10] Configurando serviço do sistema...${NC}"
    
    cat > /etc/systemd/system/igvd-backend.service << 'SERVICE_EOF'
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
SERVICE_EOF
    
    # Ajustar permissões
    chown -R www-data:www-data $APP_DIR
    chmod -R 755 $APP_DIR
    
    systemctl daemon-reload
    systemctl enable igvd-backend
    systemctl start igvd-backend
    
    echo -e "${GREEN}✓ Serviço configurado e iniciado${NC}"
}

# Função para criar admin
create_admin() {
    echo -e "${BLUE}[10/10] Criando usuário administrador...${NC}"
    
    cd $APP_DIR/backend
    source venv/bin/activate
    
    python3 << PYTHON_EOF
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
    
    existing = await db.users.find_one({"email": "${ADMIN_EMAIL}"})
    if existing:
        print("Admin já existe!")
        return
    
    admin = {
        "id": str(uuid.uuid4()),
        "email": "${ADMIN_EMAIL}",
        "full_name": "Administrador IGVD",
        "hashed_password": pwd_context.hash("${ADMIN_PASSWORD}"),
        "role": "admin",
        "is_active": True,
        "created_at": "2024-01-01T00:00:00Z"
    }
    
    await db.users.insert_one(admin)
    print("Admin criado com sucesso!")

asyncio.run(create_admin())
PYTHON_EOF
    
    deactivate
    echo -e "${GREEN}✓ Administrador criado${NC}"
}

# Configurar firewall
setup_firewall() {
    echo -e "${BLUE}Configurando firewall...${NC}"
    
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    
    echo -e "${GREEN}✓ Firewall configurado${NC}"
}

# Menu principal
main() {
    echo -e "${YELLOW}Escolha uma opção:${NC}"
    echo "1) Instalação completa"
    echo "2) Apenas dependências"
    echo "3) Apenas MongoDB"
    echo "4) Apenas Nginx + SSL"
    echo "5) Apenas configurar aplicação"
    echo "6) Apenas criar admin"
    echo "0) Sair"
    
    read -p "Opção: " choice
    
    case $choice in
        1)
            install_dependencies
            install_mongodb
            install_nginx
            setup_application
            setup_backend
            setup_frontend
            setup_nginx
            setup_ssl
            setup_systemd
            create_admin
            setup_firewall
            
            echo ""
            echo -e "${GREEN}================================================${NC}"
            echo -e "${GREEN}  INSTALAÇÃO COMPLETA!${NC}"
            echo -e "${GREEN}================================================${NC}"
            echo ""
            echo -e "🌐 Acesse: ${BLUE}https://${DOMAIN}${NC}"
            echo -e "📧 Email: ${BLUE}${ADMIN_EMAIL}${NC}"
            echo -e "🔑 Senha: ${BLUE}${ADMIN_PASSWORD}${NC}"
            echo ""
            echo -e "${RED}⚠️  IMPORTANTE: Mude a senha após o primeiro login!${NC}"
            ;;
        2) install_dependencies ;;
        3) install_mongodb ;;
        4) 
            install_nginx
            setup_nginx
            setup_ssl
            ;;
        5)
            setup_application
            setup_backend
            setup_frontend
            setup_systemd
            ;;
        6) create_admin ;;
        0) exit 0 ;;
        *) echo "Opção inválida" ;;
    esac
}

main
