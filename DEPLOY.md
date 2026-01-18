# 🚀 Guia de Deploy - UniOzoxx

## 📋 Requisitos do Servidor

Esta aplicação **NÃO funciona** em hospedagem compartilhada comum (tipo cPanel/Plesk).

Você precisa de:

### Opção 1: VPS/Servidor Dedicado
- **Sistema Operacional**: Ubuntu 20.04+ ou Debian 11+
- **RAM**: Mínimo 2GB (recomendado 4GB)
- **CPU**: 2 vCPUs
- **Disco**: 20GB SSD
- **Softwares**:
  - Python 3.10+
  - Node.js 18+
  - MongoDB 5.0+
  - Nginx ou Apache
  - PM2 (gerenciador de processos)

### Opção 2: Serviços Cloud (Mais Fácil)
- **Railway.app** (recomendado para iniciantes)
- **Render.com**
- **DigitalOcean App Platform**
- **Heroku**
- **AWS (EC2 + DocumentDB)**
- **Google Cloud Run**

---

## 🛠️ Instalação em VPS Ubuntu

### 1. Preparar o Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y python3.11 python3.11-venv python3-pip
sudo apt install -y nodejs npm
sudo apt install -y nginx
sudo apt install -y poppler-utils  # Para geração de PDFs

# Instalar yarn
sudo npm install -g yarn

# Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2
```

### 2. Instalar MongoDB

```bash
# Importar chave pública do MongoDB
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Adicionar repositório
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Instalar MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Iniciar e habilitar
sudo systemctl start mongod
sudo systemctl enable mongod

# Verificar status
sudo systemctl status mongod
```

### 3. Clonar e Configurar a Aplicação

```bash
# Criar diretório
sudo mkdir -p /var/www/uniozoxx
cd /var/www/uniozoxx

# Clonar repositório (ou fazer upload dos arquivos)
git clone https://seu-repositorio.git .

# Executar wizard de configuração
python3 setup_wizard.py
```

### 4. Configurar Backend

```bash
cd /var/www/uniozoxx/backend

# Criar ambiente virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Testar se funciona
uvicorn server:app --host 0.0.0.0 --port 8001
# Ctrl+C para parar
```

### 5. Configurar Frontend

```bash
cd /var/www/uniozoxx/frontend

# Instalar dependências
yarn install

# Build de produção
yarn build
```

### 6. Configurar PM2 (Gerenciador de Processos)

```bash
# Criar arquivo de configuração PM2
cat > /var/www/uniozoxx/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'uniozoxx-backend',
      cwd: '/var/www/uniozoxx/backend',
      script: 'venv/bin/uvicorn',
      args: 'server:app --host 0.0.0.0 --port 8001',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# Iniciar aplicação
cd /var/www/uniozoxx
pm2 start ecosystem.config.js

# Salvar configuração para reiniciar automaticamente
pm2 save
pm2 startup
```

### 7. Configurar Nginx

```bash
# Criar configuração do site
sudo nano /etc/nginx/sites-available/uniozoxx
```

Cole o seguinte conteúdo:

```nginx
server {
    listen 80;
    server_name uniozoxx.com.br www.uniozoxx.com.br;

    # Frontend (React build)
    location / {
        root /var/www/uniozoxx/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
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
        
        # Timeout para uploads grandes
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Uploads
    location /uploads {
        alias /var/www/uniozoxx/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Limites de upload
    client_max_body_size 50M;
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/uniozoxx /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 8. Configurar SSL (HTTPS)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d uniozoxx.com.br -d www.uniozoxx.com.br

# Renovação automática (já configurado pelo certbot)
sudo certbot renew --dry-run
```

---

## 🔐 Configuração do MongoDB (Segurança)

### Criar Usuário do Banco de Dados

```bash
# Conectar ao MongoDB
mongosh

# Criar usuário administrador
use admin
db.createUser({
  user: "uniozoxx_admin",
  pwd: "sua_senha_segura_aqui",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" }
  ]
})

# Criar usuário específico para aplicação
use uniozoxx_prod
db.createUser({
  user: "uniozoxx_app",
  pwd: "outra_senha_segura",
  roles: [
    { role: "readWrite", db: "uniozoxx_prod" }
  ]
})

exit
```

### Habilitar Autenticação

```bash
# Editar configuração do MongoDB
sudo nano /etc/mongod.conf

# Adicionar/descomentar:
security:
  authorization: enabled

# Reiniciar MongoDB
sudo systemctl restart mongod
```

Atualize a string de conexão no `.env`:
```
MONGO_URL=mongodb://uniozoxx_app:sua_senha@localhost:27017/uniozoxx_prod?authSource=uniozoxx_prod
```

---

## 🔄 Atualizações

Para atualizar a aplicação:

```bash
cd /var/www/uniozoxx

# Puxar alterações
git pull origin main

# Atualizar backend
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Atualizar frontend
cd ../frontend
yarn install
yarn build

# Reiniciar serviços
pm2 restart all
```

---

## 🐛 Troubleshooting

### Backend não inicia
```bash
# Ver logs
pm2 logs uniozoxx-backend

# Verificar se a porta está em uso
sudo lsof -i :8001
```

### Erro de conexão MongoDB
```bash
# Verificar se MongoDB está rodando
sudo systemctl status mongod

# Ver logs do MongoDB
sudo tail -f /var/log/mongodb/mongod.log
```

### Erro 502 Bad Gateway
```bash
# Verificar se backend está rodando
pm2 status

# Verificar configuração do Nginx
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Frontend não carrega
```bash
# Verificar se o build existe
ls -la /var/www/uniozoxx/frontend/build

# Verificar permissões
sudo chown -R www-data:www-data /var/www/uniozoxx/frontend/build
```

---

## 📊 Monitoramento

```bash
# Status dos processos
pm2 status

# Monitoramento em tempo real
pm2 monit

# Logs em tempo real
pm2 logs

# Reiniciar aplicação
pm2 restart uniozoxx-backend

# Parar aplicação
pm2 stop uniozoxx-backend
```

---

## 🔒 Backup do Banco de Dados

```bash
# Criar backup
mongodump --db uniozoxx_prod --out /backup/$(date +%Y%m%d)

# Restaurar backup
mongorestore --db uniozoxx_prod /backup/20260118/uniozoxx_prod

# Backup automático (crontab)
crontab -e
# Adicionar:
0 3 * * * mongodump --db uniozoxx_prod --out /backup/$(date +\%Y\%m\%d) && find /backup -mtime +7 -delete
```

---

## 🌐 Opção: Deploy no Railway (Mais Simples)

Se você não quer gerenciar servidor, use o Railway:

1. Acesse [railway.app](https://railway.app)
2. Conecte seu repositório GitHub
3. O Railway detecta automaticamente Python + Node.js
4. Adicione um serviço MongoDB
5. Configure as variáveis de ambiente
6. Deploy automático!

---

## 📞 Suporte

Em caso de dúvidas sobre a instalação, verifique:
1. Os logs do sistema (`pm2 logs`)
2. Os logs do Nginx (`/var/log/nginx/error.log`)
3. Os logs do MongoDB (`/var/log/mongodb/mongod.log`)
