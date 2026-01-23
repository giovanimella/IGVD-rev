#!/bin/bash

# ================================================
# IGVD - Instituto Global de Vendas Diretas
# Script de Instalação Automatizada v2.0
# Compatível com Ubuntu 20.04, 22.04, 24.04, 24.10+
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
echo "  Script de Instalação v2.0"
echo "================================================"
echo -e "${NC}"

# Detectar versão do Ubuntu
detect_ubuntu_version() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        UBUNTU_VERSION=$VERSION_ID
        UBUNTU_CODENAME=$VERSION_CODENAME
        echo -e "${GREEN}✓ Detectado: Ubuntu $UBUNTU_VERSION ($UBUNTU_CODENAME)${NC}"
    else
        echo -e "${RED}Não foi possível detectar a versão do Ubuntu${NC}"
        exit 1
    fi
}

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Por favor, execute como root (sudo)${NC}"
    exit 1
fi

detect_ubuntu_version

# Gerar JWT Secret
JWT_SECRET=$(openssl rand -hex 32)
echo -e "${GREEN}✓ JWT Secret gerado${NC}"

# Função para instalar dependências
install_dependencies() {
    echo -e "${BLUE}[1/10] Instalando dependências do sistema...${NC}"
    
    apt update && apt upgrade -y
    apt install -y curl wget git build-essential software-properties-common gnupg lsb-release
    
    # Node.js 20.x
    echo -e "${YELLOW}Instalando Node.js 20.x...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    npm install -g yarn
    
    echo -e "${GREEN}✓ Node.js $(node --version) instalado${NC}"
    
    # Python - usar versão do sistema (3.10+ já vem no Ubuntu 22.04+)
    echo -e "${YELLOW}Configurando Python...${NC}"
    
    # Verificar versão do Python disponível
    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
    echo -e "${GREEN}✓ Python $PYTHON_VERSION detectado${NC}"
    
    # Instalar dependências do Python (sem versão específica)
    apt install -y python3-venv python3-dev python3-pip python3-full
    
    echo -e "${GREEN}✓ Dependências instaladas${NC}"
}

# Função para instalar MongoDB
install_mongodb() {
    echo -e "${BLUE}[2/10] Instalando MongoDB...${NC}"
    
    # Importar chave GPG
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
    
    # Determinar o codename correto para o repositório MongoDB
    # MongoDB ainda não tem repos para versões muito novas, usar jammy como fallback
    MONGO_CODENAME=$UBUNTU_CODENAME
    case $UBUNTU_CODENAME in
        "noble"|"oracular"|"questing"|"plucky")
            MONGO_CODENAME="jammy"
            echo -e "${YELLOW}Usando repositório MongoDB para Ubuntu Jammy (compatível)${NC}"
            ;;
    esac
    
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${MONGO_CODENAME}/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    
    apt update
    apt install -y mongodb-org
    
    systemctl start mongod
    systemctl enable mongod
    
    # Verificar se MongoDB está rodando
    sleep 2
    if systemctl is-active --quiet mongod; then
        echo -e "${GREEN}✓ MongoDB instalado e rodando${NC}"
    else
        echo -e "${RED}⚠ MongoDB instalado mas não iniciou. Verifique com: sudo systemctl status mongod${NC}"
    fi
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
    echo -e "${BLUE}[4/10] Configurando diretórios da aplicação...${NC}"
    
    mkdir -p $APP_DIR
    mkdir -p $APP_DIR/uploads
    mkdir -p $APP_DIR/uploads/logos
    mkdir -p $APP_DIR/uploads/files
    mkdir -p $APP_DIR/uploads/videos
    
    # Se os arquivos já estiverem no diretório atual, copiar
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
    PARENT_DIR="$(dirname "$SCRIPT_DIR")"
    
    if [ -d "$PARENT_DIR/backend" ] && [ -d "$PARENT_DIR/frontend" ]; then
        echo -e "${YELLOW}Copiando arquivos da aplicação...${NC}"
        
        # Copiar backend e frontend se não existirem
        if [ ! -d "$APP_DIR/backend" ]; then
            cp -r "$PARENT_DIR/backend" $APP_DIR/
        fi
        if [ ! -d "$APP_DIR/frontend" ]; then
            cp -r "$PARENT_DIR/frontend" $APP_DIR/
        fi
        
        echo -e "${GREEN}✓ Arquivos copiados${NC}"
    else
        echo -e "${YELLOW}⚠ Arquivos da aplicação não encontrados.${NC}"
        echo -e "${YELLOW}  Certifique-se de que backend/ e frontend/ estão em: $PARENT_DIR${NC}"
    fi
}

# Função para configurar backend
setup_backend() {
    echo -e "${BLUE}[5/10] Configurando Backend...${NC}"
    
    cd $APP_DIR/backend
    
    # Criar ambiente virtual com Python do sistema
    python3 -m venv venv
    source venv/bin/activate
    
    # Atualizar pip
    pip install --upgrade pip setuptools wheel
    
    # Instalar dependências
    echo -e "${YELLOW}Instalando dependências Python...${NC}"
    pip install -r requirements.txt
    
    # Instalar emergentintegrations
    echo -e "${YELLOW}Instalando emergentintegrations...${NC}"
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
    echo -e "${YELLOW}Instalando dependências Node.js...${NC}"
    yarn install
    
    echo -e "${YELLOW}Criando build de produção...${NC}"
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
    
    # Logs
    access_log /var/log/nginx/igvd_access.log;
    error_log /var/log/nginx/igvd_error.log;
    
    # Tamanho máximo de upload
    client_max_body_size 100M;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
    
    # Frontend
    location / {
        root /var/www/igvd/frontend/build;
        try_files $uri $uri/ /index.html;
        
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
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
    
    # Socket.IO
    location /socket.io {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
    
    # Uploads
    location /api/uploads {
        alias /var/www/igvd/uploads;
        expires 30d;
    }
}
NGINX_EOF
    
    # Ativar site
    ln -sf /etc/nginx/sites-available/igvd /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração
    nginx -t
    systemctl reload nginx
    
    echo -e "${GREEN}✓ Nginx configurado${NC}"
}

# Função para configurar SSL
setup_ssl() {
    echo -e "${BLUE}[8/10] Configurando SSL (Let's Encrypt)...${NC}"
    
    apt install -y certbot python3-certbot-nginx
    
    echo -e "${YELLOW}Executando Certbot para ${DOMAIN}...${NC}"
    echo -e "${YELLOW}NOTA: Certifique-se de que o DNS do domínio aponta para este servidor!${NC}"
    
    # Tentar obter certificado
    certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect || {
        echo -e "${RED}⚠ Falha ao obter certificado SSL.${NC}"
        echo -e "${YELLOW}Verifique se:${NC}"
        echo -e "${YELLOW}  1. O domínio ${DOMAIN} aponta para o IP deste servidor${NC}"
        echo -e "${YELLOW}  2. As portas 80 e 443 estão abertas no firewall${NC}"
        echo -e "${YELLOW}Você pode tentar novamente depois com: sudo certbot --nginx -d ${DOMAIN}${NC}"
    }
    
    echo -e "${GREEN}✓ Configuração SSL concluída${NC}"
}

# Função para configurar systemd
setup_systemd() {
    echo -e "${BLUE}[9/10] Configurando serviço do sistema...${NC}"
    
    cat > /etc/systemd/system/igvd-backend.service << SERVICE_EOF
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
    
    # Recarregar systemd e iniciar serviço
    systemctl daemon-reload
    systemctl enable igvd-backend
    systemctl start igvd-backend
    
    # Verificar se está rodando
    sleep 3
    if systemctl is-active --quiet igvd-backend; then
        echo -e "${GREEN}✓ Serviço backend rodando${NC}"
    else
        echo -e "${RED}⚠ Serviço não iniciou. Verifique com: sudo journalctl -u igvd-backend -f${NC}"
    fi
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
    
    # Criar configuração inicial do sistema
    await db.system_config.update_one(
        {"id": "system_config"},
        {"\$set": {
            "id": "system_config",
            "platform_name": "IGVD - Instituto Global de Vendas Diretas"
        }},
        upsert=True
    )
    
    print("Admin criado com sucesso!")

asyncio.run(create_admin())
PYTHON_EOF
    
    deactivate
    echo -e "${GREEN}✓ Administrador criado${NC}"
}

# Configurar firewall
setup_firewall() {
    echo -e "${BLUE}Configurando firewall...${NC}"
    
    # Verificar se ufw está instalado
    if ! command -v ufw &> /dev/null; then
        apt install -y ufw
    fi
    
    ufw allow 22/tcp comment 'SSH'
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    ufw --force enable
    
    echo -e "${GREEN}✓ Firewall configurado${NC}"
}

# Mostrar status final
show_status() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  STATUS DOS SERVIÇOS${NC}"
    echo -e "${BLUE}================================================${NC}"
    
    echo -n "MongoDB:  "
    systemctl is-active mongod && echo -e "${GREEN}✓ Rodando${NC}" || echo -e "${RED}✗ Parado${NC}"
    
    echo -n "Nginx:    "
    systemctl is-active nginx && echo -e "${GREEN}✓ Rodando${NC}" || echo -e "${RED}✗ Parado${NC}"
    
    echo -n "Backend:  "
    systemctl is-active igvd-backend && echo -e "${GREEN}✓ Rodando${NC}" || echo -e "${RED}✗ Parado${NC}"
    
    echo ""
}

# Menu principal
main() {
    echo ""
    echo -e "${YELLOW}Escolha uma opção:${NC}"
    echo "1) Instalação completa (recomendado)"
    echo "2) Apenas dependências (Node.js, Python)"
    echo "3) Apenas MongoDB"
    echo "4) Apenas Nginx"
    echo "5) Apenas configurar aplicação (backend + frontend)"
    echo "6) Apenas SSL (Let's Encrypt)"
    echo "7) Apenas criar admin"
    echo "8) Ver status dos serviços"
    echo "0) Sair"
    echo ""
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
            show_status
            
            echo ""
            echo -e "${GREEN}================================================${NC}"
            echo -e "${GREEN}  ✅ INSTALAÇÃO COMPLETA!${NC}"
            echo -e "${GREEN}================================================${NC}"
            echo ""
            echo -e "🌐 Acesse: ${BLUE}https://${DOMAIN}${NC}"
            echo -e "📧 Email:  ${BLUE}${ADMIN_EMAIL}${NC}"
            echo -e "🔑 Senha:  ${BLUE}${ADMIN_PASSWORD}${NC}"
            echo ""
            echo -e "${RED}⚠️  IMPORTANTE: Mude a senha após o primeiro login!${NC}"
            echo ""
            echo -e "${YELLOW}Comandos úteis:${NC}"
            echo "  Ver logs do backend:  sudo journalctl -u igvd-backend -f"
            echo "  Reiniciar backend:    sudo systemctl restart igvd-backend"
            echo "  Ver logs do Nginx:    sudo tail -f /var/log/nginx/igvd_error.log"
            ;;
        2) install_dependencies ;;
        3) install_mongodb ;;
        4) 
            install_nginx
            setup_nginx
            ;;
        5)
            setup_application
            setup_backend
            setup_frontend
            setup_systemd
            ;;
        6) setup_ssl ;;
        7) create_admin ;;
        8) show_status ;;
        0) exit 0 ;;
        *) echo "Opção inválida" ;;
    esac
}

main
