#!/bin/bash

# ================================================
# IGVD - Script de Backup
# ================================================

BACKUP_DIR="/backup/igvd"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="igvd_production"

# Criar diretório de backup
mkdir -p $BACKUP_DIR

echo "🔄 Iniciando backup IGVD - $DATE"

# Backup do MongoDB
echo "📦 Backup do banco de dados..."
mongodump --db $DB_NAME --out $BACKUP_DIR/db_$DATE

# Backup dos uploads
echo "📁 Backup dos arquivos..."
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/igvd/uploads

# Backup das configurações
echo "⚙️ Backup das configurações..."
cp /var/www/igvd/backend/.env $BACKUP_DIR/backend_env_$DATE
cp /var/www/igvd/frontend/.env $BACKUP_DIR/frontend_env_$DATE

# Limpar backups antigos (manter últimos 7 dias)
echo "🧹 Limpando backups antigos..."
find $BACKUP_DIR -type f -mtime +7 -delete
find $BACKUP_DIR -type d -empty -delete

echo "✅ Backup completo: $BACKUP_DIR"
echo "   - Banco: db_$DATE"
echo "   - Uploads: uploads_$DATE.tar.gz"
echo "   - Configs: *_env_$DATE"

# Para restaurar:
# mongorestore --db igvd_production $BACKUP_DIR/db_XXXXXXXX/igvd_production
# tar -xzf $BACKUP_DIR/uploads_XXXXXXXX.tar.gz -C /
