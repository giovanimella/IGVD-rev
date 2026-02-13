# 📋 Implementação CRM de Apresentações - Guia de Arquivos

Este documento lista todos os arquivos criados/modificados para o sistema de CRM de Apresentações, Categorias de Usuários e Ranking de Frequência.

---

## 🗂️ ARQUIVOS CRIADOS (NOVOS)

### 1. Backend: Rotas de Apresentações
**Arquivo:** `backend/routes/presentation_routes.py`

**Funcionalidades:**
- CRUD de apresentações
- Upload de fotos
- Cálculo de frequência mensal
- Criação automática de follow-ups na agenda
- Estatísticas para admin

**Endpoints:**
- `POST /api/presentations/` - Criar apresentação
- `GET /api/presentations/my` - Listar minhas apresentações
- `GET /api/presentations/my/today` - Apresentações de hoje (meta)
- `GET /api/presentations/my/frequency` - Frequência do mês
- `PUT /api/presentations/{id}` - Atualizar
- `DELETE /api/presentations/{id}` - Excluir
- `GET /api/presentations/all` - Todas (admin)
- `GET /api/presentations/stats` - Estatísticas (admin)

---

### 2. Backend: Rotas de Categorias
**Arquivo:** `backend/routes/category_routes.py`

**Funcionalidades:**
- CRUD de categorias de usuários
- Atribuição de categorias a usuários
- Estatísticas por categoria

**Endpoints:**
- `POST /api/categories/` - Criar categoria
- `GET /api/categories/` - Listar categorias
- `GET /api/categories/{id}` - Buscar categoria
- `PUT /api/categories/{id}` - Atualizar
- `DELETE /api/categories/{id}` - Excluir
- `POST /api/categories/assign` - Atribuir a usuário
- `POST /api/categories/remove` - Remover de usuário
- `GET /api/categories/users/{id}` - Usuários da categoria
- `GET /api/categories/stats/{id}` - Estatísticas

---

### 3. Frontend: Página de Apresentações
**Arquivo:** `frontend/src/pages/Presentations.js`

**Funcionalidades:**
- Lista de apresentações do licenciado
- Cards de estatísticas (hoje, frequência, total)
- Modal para criar/editar apresentação
- Upload de foto
- Botões de editar e excluir
- Checkbox "Resultou em venda?"
- Mensagens sobre follow-up automático

---

### 4. Frontend: Página de Categorias (Admin)
**Arquivo:** `frontend/src/pages/admin/AdminCategories.js`

**Funcionalidades:**
- Grid de categorias
- Modal para criar/editar
- Seletor de cor
- Campo de ícone (emoji)
- Botões editar/excluir

---

## 🔄 ARQUIVOS MODIFICADOS

### 5. Backend: Models
**Arquivo:** `backend/models.py`

**Adicionar os seguintes models:**

```python
# Model de Apresentação
class Presentation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    photo_url: Optional[str] = None
    sold: bool = False
    notes: Optional[str] = None
    presentation_date: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

# Model de Frequência de Apresentações
class PresentationFrequency(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    year: int
    month: int
    total_presentations: int = 0
    working_days_in_month: int = 0
    days_with_presentations: int = 0
    frequency_percentage: float = 0.0
    calculated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

# Model de Categoria de Usuário
class UserCategory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    color: str = "#3b82f6"
    icon: str = "📁"
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
```

---

### 6. Backend: Server (Registro de Rotas)
**Arquivo:** `backend/server.py`

**Adicionar imports:**
```python
from routes.presentation_routes import router as presentation_router
from routes.category_routes import router as category_router
```

**Registrar rotas:**
```python
app.include_router(presentation_router)
app.include_router(category_router)
```

---

### 7. Frontend: App.js (Rotas)
**Arquivo:** `frontend/src/App.js`

**Adicionar imports:**
```javascript
import AdminCategories from './pages/admin/AdminCategories';
import Presentations from './pages/Presentations';
```

**Adicionar rotas:**
```jsx
<Route
  path="/admin/categories"
  element={
    <PrivateRoute roles={['admin']}>
      <AdminCategories />
    </PrivateRoute>
  }
/>
<Route
  path="/presentations"
  element={
    <PrivateRoute roles={['licenciado']}>
      <Presentations />
    </PrivateRoute>
  }
/>
```

---

### 8. Frontend: Sidebar.js (Links de Navegação)
**Arquivo:** `frontend/src/components/Sidebar.js`

**Adicionar import:**
```javascript
import { Tag } from 'lucide-react';
```

**Em `adminLinks`, adicionar:**
```javascript
{ path: '/admin/categories', icon: Tag, label: 'Categorias' },
```

**Em `licenseeLinks`, adicionar:**
```javascript
{ path: '/presentations', icon: Target, label: 'Apresentações' },
```

---

### 9. Backend: Stats Routes (Ranking de Frequência)
**Arquivo:** `backend/routes/stats_routes.py`

**Adicionar endpoint do ranking de frequência:**

```python
@router.get("/leaderboard/frequency")
async def get_frequency_leaderboard():
    """Ranking baseado na frequência de apresentações"""
    
    now = datetime.now()
    
    # Buscar frequências do mês atual
    frequencies = await db.presentation_frequency.find({
        "year": now.year,
        "month": now.month
    }).sort("frequency_percentage", -1).to_list(100)
    
    leaderboard = []
    
    for freq in frequencies:
        user = await db.users.find_one(
            {"id": freq["user_id"], "role": "licenciado"},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "profile_picture": 1, "level_title": 1}
        )
        
        if user:
            leaderboard.append({
                "user_id": user["id"],
                "full_name": user.get("full_name", "Usuário"),
                "profile_picture": user.get("profile_picture"),
                "level_title": user.get("level_title", "Iniciante"),
                "frequency_percentage": freq["frequency_percentage"],
                "days_with_presentations": freq["days_with_presentations"],
                "total_presentations": freq["total_presentations"]
            })
    
    return leaderboard
```

---

## 📁 Diretório de Uploads

**Criar diretório:**
```bash
mkdir -p /app/uploads/presentations
```

**Ou no código Python:**
```python
UPLOAD_DIR = Path("/app/uploads/presentations")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
```

---

## 🗄️ Collections MongoDB

Novas collections criadas automaticamente:
- `presentations` - Apresentações registradas
- `presentation_frequency` - Frequência mensal calculada
- `user_categories` - Categorias de usuários

---

## ⚠️ PONTOS IMPORTANTES

1. **Upload de Fotos:** As fotos são salvas em `/app/uploads/presentations/` e servidas em `/api/uploads/presentations/`

2. **Follow-ups Automáticos:** 
   - Se vendeu → 3 compromissos (3 dias, 2 semanas, 1 mês)
   - Se não vendeu → 1 lembrete (1 semana)
   - Os compromissos são criados na collection `appointments`

3. **Meta Diária:** 2 apresentações por dia (seg-sex)

4. **Frequência:** Calculada como % de dias úteis que atingiram a meta

5. **Campo `duration` em appointments:** Deve ser STRING ("30"), não inteiro

---

## ✅ Checklist de Implementação

- [ ] Criar `backend/routes/presentation_routes.py`
- [ ] Criar `backend/routes/category_routes.py`
- [ ] Adicionar models em `backend/models.py`
- [ ] Registrar rotas em `backend/server.py`
- [ ] Criar `frontend/src/pages/Presentations.js`
- [ ] Criar `frontend/src/pages/admin/AdminCategories.js`
- [ ] Adicionar rotas em `frontend/src/App.js`
- [ ] Adicionar links no `frontend/src/components/Sidebar.js`
- [ ] Adicionar endpoint de ranking em `backend/routes/stats_routes.py`
- [ ] Criar diretório `/app/uploads/presentations/`
- [ ] Testar endpoints via curl
- [ ] Testar interface no navegador
