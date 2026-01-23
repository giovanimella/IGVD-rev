#!/bin/bash

# ================================================
# IGVD - Script de Atualização
# ================================================

APP_DIR="/var/www/igvd"

echo "🔄 Atualizando IGVD..."

cd $APP_DIR

# Pull das atualizações (se usando git)
if [ -d ".git" ]; then
    echo "📥 Baixando atualizações do git..."
    git pull origin main
fi

# Atualizar backend
echo "🐍 Atualizando Backend..."
cd $APP_DIR/backend
source venv/bin/activate
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
deactivate

# Reiniciar backend
sudo systemctl restart igvd-backend

# Atualizar frontend
echo "⚛️ Atualizando Frontend..."
cd $APP_DIR/frontend
yarn install
yarn build

# Recarregar Nginx
sudo systemctl reload nginx

echo "✅ Atualização completa!"
echo "   Verifique: https://igvd.org"
