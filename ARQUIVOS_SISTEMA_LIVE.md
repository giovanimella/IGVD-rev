# 📺 SISTEMA DE LIVE - ARQUIVOS PARA PRODUÇÃO

## 📁 ARQUIVOS NOVOS (CRIAR)

### Backend
```
backend/models_live.py
backend/routes/live_routes.py
```

### Frontend
```
frontend/src/components/LiveCard.js
frontend/src/pages/admin/AdminLive.js
```

---

## 📝 ARQUIVOS MODIFICADOS (ATUALIZAR)

### 1. Backend - server.py

**Adicionar no import (linha ~18):**
```python
from routes import ..., live_routes
```

**Adicionar registro da rota (após outros routers):**
```python
app.include_router(live_routes.router, prefix="/api")
```

---

### 2. Frontend - App.js

**Adicionar import (linha ~72):**
```javascript
import AdminLive from './pages/admin/AdminLive';
```

**Adicionar rota (junto com outras rotas admin):**
```jsx
<Route
  path="/admin/live"
  element={
    <PrivateRoute roles={['admin']}>
      <AdminLive />
    </PrivateRoute>
  }
/>
```

---

### 3. Frontend - Sidebar.js

**Adicionar import do ícone Video:**
```javascript
import { ..., Video } from 'lucide-react';
```

**Adicionar no array de menu admin (adminMenuItems):**
```javascript
{ path: '/admin/live', icon: Video, label: 'Live Semanal' },
```

---

### 4. Frontend - Dashboard.js

**Adicionar import:**
```javascript
import LiveCard from '../components/LiveCard';
```

**Adicionar componente no JSX (onde quiser mostrar o card):**
```jsx
<LiveCard />
```

---

## 🗄️ COLLECTIONS MONGODB (criadas automaticamente)

```
live_settings        - Configurações gerais da live
live_sessions        - Sessões de live (histórico)
live_participations  - Participantes de cada sessão
```

---

## ✅ ORDEM DE DEPLOY

1. Copiar arquivos novos do backend
2. Atualizar server.py
3. Reiniciar backend
4. Copiar arquivos novos do frontend
5. Atualizar App.js, Sidebar.js, Dashboard.js
6. Rebuild/reiniciar frontend

---

## 🔧 ENDPOINTS CRIADOS

```
GET  /api/live/current                    - Obter live ativa (usuário)
POST /api/live/join                       - Entrar na live e ganhar pontos

GET  /api/live/admin/settings             - Config da live (admin)
PUT  /api/live/admin/settings             - Atualizar config (admin)
POST /api/live/admin/start                - Iniciar nova sessão
POST /api/live/admin/end                  - Encerrar sessão
GET  /api/live/admin/sessions             - Listar sessões
GET  /api/live/admin/sessions/{id}        - Detalhes + participantes
GET  /api/live/admin/sessions/{id}/export - Exportar CSV
```
