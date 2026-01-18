#!/bin/bash

# ============================================
# UniOzoxx - Script de Build para Produção
# ============================================

set -e  # Parar em caso de erro

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         UniOzoxx - Build de Produção                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "setup_wizard.py" ]; then
    echo -e "${RED}Erro: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# 1. Verificar dependências
echo -e "${YELLOW}[1/5] Verificando dependências...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python3 não encontrado. Instale Python 3.10+${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js não encontrado. Instale Node.js 18+${NC}"
    exit 1
fi

if ! command -v yarn &> /dev/null; then
    echo -e "${YELLOW}Yarn não encontrado. Instalando...${NC}"
    npm install -g yarn
fi

echo -e "${GREEN}✓ Dependências OK${NC}"

# 2. Verificar arquivos .env
echo -e "${YELLOW}[2/5] Verificando configuração...${NC}"

if [ ! -f "backend/.env" ]; then
    echo -e "${RED}Arquivo backend/.env não encontrado!${NC}"
    echo "Execute: python3 setup_wizard.py"
    exit 1
fi

if [ ! -f "frontend/.env" ]; then
    echo -e "${RED}Arquivo frontend/.env não encontrado!${NC}"
    echo "Execute: python3 setup_wizard.py"
    exit 1
fi

echo -e "${GREEN}✓ Configuração OK${NC}"

# 3. Configurar Backend
echo -e "${YELLOW}[3/5] Configurando Backend...${NC}"

cd backend

# Criar ambiente virtual se não existir
if [ ! -d "venv" ]; then
    echo "Criando ambiente virtual..."
    python3 -m venv venv
fi

# Ativar ambiente virtual
source venv/bin/activate

# Instalar dependências
echo "Instalando dependências Python..."
pip install --upgrade pip
pip install -r requirements.txt

# Criar diretórios necessários
mkdir -p uploads
mkdir -p uploads/documents
mkdir -p uploads/files
mkdir -p uploads/logos
mkdir -p uploads/profiles

cd ..

echo -e "${GREEN}✓ Backend configurado${NC}"

# 4. Build do Frontend
echo -e "${YELLOW}[4/5] Build do Frontend...${NC}"

cd frontend

echo "Instalando dependências Node.js..."
yarn install

echo "Gerando build de produção..."
yarn build

cd ..

echo -e "${GREEN}✓ Frontend compilado${NC}"

# 5. Inicializar banco de dados
echo -e "${YELLOW}[5/5] Inicializando banco de dados...${NC}"

cd backend
source venv/bin/activate
cd ..

python3 init_database.py

echo -e "${GREEN}✓ Banco de dados inicializado${NC}"

# Finalizado
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              ✓ BUILD CONCLUÍDO COM SUCESSO!                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Próximos passos:${NC}"
echo ""
echo "  1. Iniciar o backend:"
echo "     cd backend && source venv/bin/activate"
echo "     uvicorn server:app --host 0.0.0.0 --port 8001"
echo ""
echo "  2. Ou usar PM2 para gerenciar processos:"
echo "     pm2 start ecosystem.config.js"
echo ""
echo "  3. Configurar Nginx conforme DEPLOY.md"
echo ""
