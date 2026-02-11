# CHECKLIST COMPLETO - SISTEMA DE CERTIFICADOS
## Conferência para Servidor de Produção

---

## 📋 RESUMO DO PROBLEMA

**Status:**
- ✅ **Ambiente de Testes:** Funcionando
- ❌ **Servidor de Produção:** Não funcionando

**Objetivo:** Conferir todos os arquivos e dependências necessários

---

## 🗂️ ARQUIVOS DO BACKEND

### 1. Rotas - `/app/backend/routes/certificate_routes.py`
**Verificar:**
- [ ] Arquivo existe no servidor
- [ ] Permissões de leitura (644)
- [ ] Importações corretas no início

**Imports necessários:**
```python
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from models import Certificate
from auth import get_current_user, require_role
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import Color
from reportlab.lib.utils import ImageReader
from pdf2image import convert_from_path
from PIL import Image
from io import BytesIO
from pathlib import Path
import os, uuid, shutil, datetime
```

**Endpoints implementados:**
- `POST /api/certificates/template/upload` - Upload de template
- `GET /api/certificates/template/preview` - Preview do template
- `PUT /api/certificates/template/config` - Configurar posições
- `POST /api/certificates/template/test` - Testar geração
- `GET /api/certificates/my` - Listar certificados do usuário
- `GET /api/certificates/check/{module_id}` - Verificar elegibilidade
- `POST /api/certificates/generate/{module_id}` - Gerar certificado
- `GET /api/certificates/download/{certificate_id}` - Download
- `GET /api/certificates/all` - Listar todos (admin)
- `GET /api/certificates/stats` - Estatísticas (admin)

### 2. Modelos - `/app/backend/models.py`
**Verificar:**
- [ ] Model `Certificate` definido
- [ ] Campos corretos

**Model Certificate esperado:**
```python
class Certificate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    module_id: str
    user_name: str
    module_title: str
    completion_date: str
    certificate_path: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
```

**Model Module deve ter:**
```python
has_certificate: bool = False
certificate_template_url: Optional[str] = None
```

**Model SystemConfig deve ter:**
```python
certificate_template_path: Optional[str] = None
certificate_name_y_position: int = 400
certificate_module_y_position: int = 360
certificate_date_y_position: int = 320
```

### 3. Registro das Rotas - `/app/backend/server.py`
**Verificar:**
- [ ] Import correto
- [ ] Router incluído

**Import esperado:**
```python
from routes import certificate_routes
```

**Inclusão do router:**
```python
app.include_router(certificate_routes.router, prefix="/api")
```

### 4. Dependências Python - `/app/backend/requirements.txt`
**Verificar se estão instaladas:**
```txt
pdf2image==1.17.0
pypdf==6.6.0
reportlab==4.4.7
Pillow==11.1.0  (ou versão compatível)
```

**Instalar se necessário:**
```bash
pip install pdf2image==1.17.0 pypdf==6.6.0 reportlab==4.4.7 Pillow
```

### 5. Dependências do Sistema (Linux)
**CRÍTICO - pdf2image requer poppler-utils:**

**Verificar se está instalado:**
```bash
which pdftoppm
which pdfinfo
```

**Se não estiver, instalar:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y poppler-utils

# CentOS/RHEL
sudo yum install -y poppler-utils

# Alpine (Docker)
apk add --no-cache poppler-utils
```

**Testar instalação:**
```bash
pdftoppm -v
# Deve retornar a versão do poppler
```

---

## 📁 DIRETÓRIOS E PERMISSÕES

### 1. Diretórios Necessários
**Verificar existência e permissões:**

```bash
# Diretório base
ls -la /app/uploads/

# Diretório de certificados
ls -la /app/uploads/certificates/
ls -la /app/uploads/certificates/generated/

# Diretório de templates
ls -la /app/uploads/certificate_templates/
```

**Criar se não existirem:**
```bash
mkdir -p /app/uploads/certificates/generated
mkdir -p /app/uploads/certificate_templates
```

**Permissões corretas:**
```bash
# O usuário que roda o backend precisa escrever
chown -R <usuario_backend>:<grupo> /app/uploads/certificates/
chown -R <usuario_backend>:<grupo> /app/uploads/certificate_templates/
chmod -R 755 /app/uploads/certificates/
chmod -R 755 /app/uploads/certificate_templates/
```

### 2. Template de Certificado
**Verificar:**
- [ ] Arquivo existe: `/app/uploads/certificate_templates/certificate_template.pdf`
- [ ] Tamanho do arquivo > 0
- [ ] Formato PDF válido
- [ ] Orientação: A4 Horizontal (Landscape)

**Testar PDF:**
```bash
file /app/uploads/certificate_templates/certificate_template.pdf
# Deve retornar: PDF document

pdfinfo /app/uploads/certificate_templates/certificate_template.pdf
# Deve mostrar informações do PDF
```

### 3. Banco de Dados - Coleções
**Verificar coleções no MongoDB:**

```bash
# Conectar ao MongoDB
mongosh

# Usar database
use <nome_do_database>

# Verificar coleções
show collections

# Deve ter:
# - certificates
# - system_config
# - modules
# - users
# - user_assessments
# - user_progress
```

**Verificar configuração do sistema:**
```javascript
db.system_config.findOne({id: "system_config"})

// Deve ter:
// {
//   certificate_template_path: "/app/uploads/certificate_templates/certificate_template.pdf",
//   certificate_name_y_position: 400,
//   certificate_module_y_position: 360,
//   certificate_date_y_position: 320
// }
```

---

## 🌐 ARQUIVOS DO FRONTEND

### 1. Página de Certificados do Licenciado
**Arquivo:** `/app/frontend/src/pages/MyCertificates.js`

**Verificar:**
- [ ] Arquivo existe
- [ ] Imports corretos
- [ ] Componente exportado

**Imports necessários:**
```javascript
import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { Award, Download, BookOpen, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
```

**Endpoints chamados:**
- `GET ${API_URL}/api/certificates/my`
- `GET ${API_URL}/api/certificates/download/${certId}`

### 2. Página de Certificados do Admin
**Arquivo:** `/app/frontend/src/pages/admin/AdminCertificates.js`

**Verificar:**
- [ ] Arquivo existe
- [ ] Funcionalidades implementadas

**Funcionalidades esperadas:**
- Upload de template PDF
- Preview do template
- Teste de geração
- Configuração de posições (Y)
- Lista de certificados emitidos
- Estatísticas

**Endpoints chamados:**
- `POST ${API_URL}/api/certificates/template/upload`
- `GET ${API_URL}/api/certificates/template/preview`
- `POST ${API_URL}/api/certificates/template/test`
- `PUT ${API_URL}/api/certificates/template/config`
- `GET ${API_URL}/api/certificates/all`
- `GET ${API_URL}/api/certificates/stats`

### 3. Rota no App.js
**Arquivo:** `/app/frontend/src/App.js`

**Verificar rotas:**
```javascript
// Licenciado
<Route
  path="/certificates"
  element={
    <PrivateRoute roles={['licenciado']}>
      <MyCertificates />
    </PrivateRoute>
  }
/>

// Admin
<Route
  path="/admin/certificates"
  element={
    <PrivateRoute roles={['admin']}>
      <AdminCertificates />
    </PrivateRoute>
  }
/>
```

### 4. Variável de Ambiente
**Arquivo:** `/app/frontend/.env`

**Verificar:**
```bash
REACT_APP_BACKEND_URL=http://seu-dominio-ou-ip:8001
# Ou para produção:
REACT_APP_BACKEND_URL=https://api.seu-dominio.com
```

---

## 🔍 TESTES E DIAGNÓSTICO

### 1. Testar Backend Direto (sem frontend)

**A. Verificar rota está registrada:**
```bash
curl http://localhost:8001/docs
# Procurar por: /api/certificates
```

**B. Testar listar certificados (com token):**
```bash
# 1. Fazer login e pegar token
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ozoxx.com","password":"admin123"}'

# 2. Usar token para listar certificados
curl http://localhost:8001/api/certificates/my \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**C. Testar upload de template:**
```bash
curl -X POST http://localhost:8001/api/certificates/template/upload \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -F "file=@/caminho/para/template.pdf"
```

**D. Verificar se template foi salvo:**
```bash
ls -la /app/uploads/certificate_templates/certificate_template.pdf
```

**E. Testar geração de certificado de teste:**
```bash
curl -X POST http://localhost:8001/api/certificates/template/test \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  --output teste_certificado.pdf

# Abrir o PDF gerado
file teste_certificado.pdf
```

### 2. Verificar Logs do Backend

**Logs importantes:**
```bash
# Logs do supervisor
tail -f /var/log/supervisor/backend.err.log

# Procurar por:
# - Erros de import (ModuleNotFoundError)
# - Erros de PDF (pdf2image, pypdf, reportlab)
# - Erros de permissão (Permission denied)
# - Erros de arquivo não encontrado (FileNotFoundError)
```

**Mensagens esperadas ao gerar certificado:**
```
[Certificate] Starting generation for Nome do Usuario
[Certificate] Template: /app/uploads/certificate_templates/certificate_template.pdf
[Certificate] Image size: 3508x2480
[Certificate] PDF height: 841.88, Y positions (img): name=..., module=..., date=...
[Certificate] Drawing name '...' at y=400
[Certificate] Drawing module '...' at y=360
[Certificate] Drawing date '...' at y=320
[Certificate] Saved to /app/uploads/certificates/generated/cert_....pdf
```

### 3. Testes Específicos por Erro

#### Erro: "ModuleNotFoundError: No module named 'pdf2image'"
**Solução:**
```bash
pip install pdf2image==1.17.0
sudo apt-get install poppler-utils  # IMPORTANTE!
```

#### Erro: "Unable to locate command 'pdftoppm'"
**Solução:**
```bash
sudo apt-get update
sudo apt-get install -y poppler-utils
```

#### Erro: "Permission denied: '/app/uploads/certificates/generated/cert_...'"
**Solução:**
```bash
chown -R www-data:www-data /app/uploads/certificates/
chmod -R 755 /app/uploads/certificates/
```

#### Erro: "Template de certificado não configurado"
**Solução:**
```bash
# 1. Verificar se arquivo existe
ls /app/uploads/certificate_templates/certificate_template.pdf

# 2. Verificar banco de dados
mongosh
use <database>
db.system_config.findOne({id: "system_config"})

# 3. Se não tem, fazer upload via admin
# Ou inserir manualmente:
db.system_config.updateOne(
  {id: "system_config"},
  {$set: {
    certificate_template_path: "/app/uploads/certificate_templates/certificate_template.pdf",
    certificate_name_y_position: 400,
    certificate_module_y_position: 360,
    certificate_date_y_position: 320
  }},
  {upsert: true}
)
```

#### Erro: "Não foi possível converter o template"
**Solução:**
```bash
# Testar conversão manual
python3 << EOF
from pdf2image import convert_from_path
images = convert_from_path('/app/uploads/certificate_templates/certificate_template.pdf', dpi=150)
print(f"Convertido: {len(images)} página(s)")
EOF

# Se der erro, instalar poppler-utils
```

---

## 📦 DOCKER (se aplicável)

### Dockerfile - Dependências Necessárias

**Se usar Docker, adicionar ao Dockerfile:**

```dockerfile
# Instalar poppler-utils (OBRIGATÓRIO para pdf2image)
RUN apt-get update && \
    apt-get install -y poppler-utils && \
    rm -rf /var/lib/apt/lists/*

# Instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Criar diretórios
RUN mkdir -p /app/uploads/certificates/generated && \
    mkdir -p /app/uploads/certificate_templates && \
    chown -R www-data:www-data /app/uploads
```

### docker-compose.yml - Volumes

**Verificar volumes mapeados:**
```yaml
volumes:
  - ./uploads:/app/uploads
  # Certificados persistirão no host
```

---

## ✅ CHECKLIST FINAL DE PRODUÇÃO

### Backend
- [ ] certificate_routes.py existe e está correto
- [ ] Models.py tem classe Certificate
- [ ] server.py registra certificate_routes
- [ ] requirements.txt tem: pdf2image, pypdf, reportlab, Pillow
- [ ] Dependências Python instaladas (`pip list | grep -E "pdf|report"`)
- [ ] poppler-utils instalado (`which pdftoppm`)
- [ ] Diretórios criados: /app/uploads/certificates/generated/
- [ ] Diretórios criados: /app/uploads/certificate_templates/
- [ ] Permissões corretas (755 e dono correto)
- [ ] Template PDF existe e é válido
- [ ] system_config no MongoDB tem certificate_template_path
- [ ] Backend reiniciado após instalações

### Frontend
- [ ] MyCertificates.js existe
- [ ] AdminCertificates.js existe
- [ ] Rotas no App.js configuradas
- [ ] REACT_APP_BACKEND_URL correto no .env
- [ ] Frontend compilado após mudanças

### Testes
- [ ] curl /docs mostra endpoints de certificates
- [ ] Login funciona e retorna token
- [ ] GET /api/certificates/my funciona
- [ ] POST /api/certificates/template/test funciona
- [ ] PDF de teste é gerado corretamente
- [ ] Logs não mostram erros

### Banco de Dados
- [ ] Coleção 'certificates' existe
- [ ] Coleção 'system_config' existe
- [ ] system_config tem configurações de certificado

---

## 🚨 ERROS COMUNS E SOLUÇÕES

| Erro | Causa Provável | Solução |
|------|---------------|---------|
| ModuleNotFoundError: pdf2image | Biblioteca não instalada | `pip install pdf2image==1.17.0` |
| Unable to locate command 'pdftoppm' | poppler-utils não instalado | `sudo apt-get install poppler-utils` |
| Permission denied | Sem permissão nos diretórios | `chown` e `chmod` corretos |
| Template não configurado | Falta registro no banco | Upload via admin ou insert manual |
| FileNotFoundError: certificate_template.pdf | Arquivo não existe | Upload do PDF via admin |
| PDF corrompido | Template inválido | Reenviar PDF válido |
| Certificado vazio/sem texto | Posições Y incorretas | Ajustar no AdminCertificates |

---

## 📝 COMANDOS ÚTEIS PARA DEBUG

```bash
# Verificar processos
ps aux | grep python

# Verificar porta 8001
netstat -tulpn | grep 8001

# Logs em tempo real
tail -f /var/log/supervisor/backend.err.log

# Testar imports Python
python3 -c "import pdf2image; print('OK')"
python3 -c "import pypdf; print('OK')"
python3 -c "import reportlab; print('OK')"

# Verificar versões
pip list | grep -E "pdf|report|Pillow"

# Testar poppler
pdftoppm -v
pdfinfo -v

# Espaço em disco
df -h /app/uploads/

# Permissões
ls -la /app/uploads/certificates/
ls -la /app/uploads/certificate_templates/

# Tamanho dos certificados gerados
du -sh /app/uploads/certificates/generated/

# MongoDB - verificar dados
mongosh
use <database>
db.certificates.countDocuments()
db.system_config.findOne({id: "system_config"})
```

---

## 🎯 ORDEM DE VERIFICAÇÃO RECOMENDADA

1. **Backend instalado?**
   - certificate_routes.py existe
   - Registrado no server.py

2. **Dependências Python instaladas?**
   - pdf2image, pypdf, reportlab, Pillow

3. **Poppler instalado?**
   - `which pdftoppm` retorna caminho

4. **Diretórios criados?**
   - certificates/generated/
   - certificate_templates/

5. **Permissões OK?**
   - Usuário backend pode escrever

6. **Template existe?**
   - certificate_template.pdf existe
   - É um PDF válido

7. **Banco configurado?**
   - system_config tem certificate_template_path

8. **Testar endpoint:**
   - curl com token funciona

9. **Testar geração:**
   - POST /template/test gera PDF

10. **Logs limpos?**
    - Sem erros no backend.err.log

---

## 📞 SUPORTE

Se após conferir todos os itens ainda não funcionar:

1. **Coletar informações:**
   - Logs do backend (últimas 100 linhas)
   - Output de `pip list | grep -E "pdf|report"`
   - Output de `which pdftoppm`
   - Conteúdo de system_config no MongoDB
   - Erro exato mostrado

2. **Comandos de diagnóstico:**
```bash
# Criar script de diagnóstico
cat > /tmp/cert_debug.sh << 'EOF'
#!/bin/bash
echo "=== DIAGNOSTICO CERTIFICADOS ==="
echo ""
echo "1. Dependências Python:"
pip list | grep -E "pdf|report|Pillow"
echo ""
echo "2. Poppler instalado:"
which pdftoppm
pdftoppm -v 2>&1 | head -1
echo ""
echo "3. Diretórios:"
ls -la /app/uploads/certificates/
ls -la /app/uploads/certificate_templates/
echo ""
echo "4. Template existe:"
ls -lh /app/uploads/certificate_templates/certificate_template.pdf
echo ""
echo "5. Teste de conversão:"
python3 -c "from pdf2image import convert_from_path; print('pdf2image: OK')"
echo ""
echo "6. Últimos logs:"
tail -30 /var/log/supervisor/backend.err.log
EOF

chmod +x /tmp/cert_debug.sh
/tmp/cert_debug.sh
```

---

**FIM DO CHECKLIST** ✅

Este documento contém TUDO que precisa ser verificado no servidor de produção!
