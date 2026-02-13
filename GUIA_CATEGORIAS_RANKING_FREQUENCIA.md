# 📋 GUIA COMPLETO DE IMPLEMENTAÇÃO
## Sistema de Categorias + Ranking de Frequência de Apresentações

---

# PARTE 1: SISTEMA DE CATEGORIAS DE USUÁRIOS

## 1.1 - BACKEND: Criar arquivo de rotas
**Caminho:** `backend/routes/category_routes.py`
**Ação:** CRIAR ARQUIVO NOVO

```python
from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from models import UserCategory
from auth import get_current_user, require_role
from datetime import datetime
import os

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/categories", tags=["categories"])

# ==================== ADMIN: CRUD CATEGORIAS ====================

@router.post("/")
async def create_category(
    category: UserCategory,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Criar categoria de usuário"""
    # Verificar se nome já existe
    existing = await db.user_categories.find_one({"name": category.name})
    if existing:
        raise HTTPException(status_code=400, detail="Categoria com esse nome já existe")
    
    await db.user_categories.insert_one(category.model_dump())
    
    return {
        "message": "Categoria criada com sucesso",
        "category": category.model_dump()
    }

@router.get("/")
async def list_categories(
    current_user: dict = Depends(get_current_user)
):
    """Listar todas as categorias"""
    categories = await db.user_categories.find(
        {"active": True},
        {"_id": 0}
    ).sort("name", 1).to_list(100)
    
    return categories

@router.get("/{category_id}")
async def get_category(
    category_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Buscar categoria específica"""
    category = await db.user_categories.find_one({"id": category_id}, {"_id": 0})
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    return category

@router.put("/{category_id}")
async def update_category(
    category_id: str,
    updates: dict,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Atualizar categoria"""
    category = await db.user_categories.find_one({"id": category_id})
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # Campos permitidos
    allowed_fields = ["name", "description", "color", "icon", "active"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now().isoformat()
    
    await db.user_categories.update_one(
        {"id": category_id},
        {"$set": update_data}
    )
    
    return {"message": "Categoria atualizada"}

@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Excluir categoria (soft delete)"""
    category = await db.user_categories.find_one({"id": category_id})
    
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # Verificar se há usuários nesta categoria
    users_count = await db.users.count_documents({"category_id": category_id})
    
    if users_count > 0:
        # Soft delete
        await db.user_categories.update_one(
            {"id": category_id},
            {"$set": {"active": False, "updated_at": datetime.now().isoformat()}}
        )
        return {"message": f"Categoria desativada ({users_count} usuários vinculados)"}
    else:
        # Hard delete se não houver usuários
        await db.user_categories.delete_one({"id": category_id})
        return {"message": "Categoria excluída"}

# ==================== USUÁRIOS COM CATEGORIAS ====================

@router.post("/assign")
async def assign_category_to_user(
    user_id: str,
    category_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Atribuir categoria a um usuário"""
    # Verificar se categoria existe
    category = await db.user_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # Verificar se usuário existe
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Atribuir categoria
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"category_id": category_id}}
    )
    
    return {"message": "Categoria atribuída ao usuário"}

@router.post("/remove")
async def remove_category_from_user(
    user_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Remover categoria de um usuário"""
    await db.users.update_one(
        {"id": user_id},
        {"$unset": {"category_id": ""}}
    )
    
    return {"message": "Categoria removida do usuário"}

@router.get("/users/{category_id}")
async def get_users_by_category(
    category_id: str,
    current_user: dict = Depends(require_role(["admin", "supervisor"]))
):
    """Listar usuários de uma categoria"""
    users = await db.users.find(
        {"category_id": category_id},
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1}
    ).to_list(1000)
    
    return users

@router.get("/stats/{category_id}")
async def get_category_stats(
    category_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Estatísticas de uma categoria"""
    total_users = await db.users.count_documents({"category_id": category_id})
    
    # Usuários ativos (acessaram nos últimos 30 dias)
    from datetime import datetime, timedelta
    thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
    
    active_users = await db.users.count_documents({
        "category_id": category_id,
        "last_login": {"$gte": thirty_days_ago}
    })
    
    return {
        "total_users": total_users,
        "active_users": active_users
    }
```

---

## 1.2 - BACKEND: Adicionar Model de Categoria
**Caminho:** `backend/models.py`
**Ação:** ADICIONAR ao arquivo existente (não substituir)

```python
# Adicionar imports se não existirem
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

# Adicionar este model ao arquivo:
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

## 1.3 - BACKEND: Registrar rota no servidor
**Caminho:** `backend/server.py`
**Ação:** MODIFICAR arquivo existente

**Adicionar import (junto com os outros imports de rotas):**
```python
from routes.category_routes import router as category_router
```

**Adicionar registro (junto com os outros app.include_router):**
```python
app.include_router(category_router)
```

---

## 1.4 - FRONTEND: Criar página de administração de categorias
**Caminho:** `frontend/src/pages/admin/AdminCategories.js`
**Ação:** CRIAR ARQUIVO NOVO

```javascript
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Users, Tag } from 'lucide-react';
import { Button } from '../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: '📁'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/categories/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingCategory) {
        await axios.put(
          `${API_URL}/api/categories/${editingCategory.id}`,
          formData,
          { headers }
        );
        toast.success('Categoria atualizada!');
      } else {
        await axios.post(`${API_URL}/api/categories/`, formData, { headers });
        toast.success('Categoria criada!');
      }

      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', color: '#3b82f6', icon: '📁' });
      fetchCategories();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      toast.error(error.response?.data?.detail || 'Erro ao salvar categoria');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      icon: category.icon || '📁'
    });
    setShowModal(true);
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Categoria excluída');
      fetchCategories();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir categoria');
    }
  };

  const colors = [
    { value: '#3b82f6', name: 'Azul' },
    { value: '#10b981', name: 'Verde' },
    { value: '#f59e0b', name: 'Laranja' },
    { value: '#ef4444', name: 'Vermelho' },
    { value: '#8b5cf6', name: 'Roxo' },
    { value: '#06b6d4', name: 'Ciano' },
    { value: '#ec4899', name: 'Rosa' },
    { value: '#6b7280', name: 'Cinza' }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-slate-900 dark:text-white">Categorias de Usuários</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Organize seus licenciados em categorias</p>
          </div>
          <Button 
            onClick={() => {
              setEditingCategory(null);
              setFormData({ name: '', description: '', color: '#3b82f6', icon: '📁' });
              setShowModal(true);
            }}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
        </div>

        {/* Grid de Categorias */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-12 text-center">
              <Tag className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Nenhuma categoria criada ainda</p>
            </div>
          ) : (
            categories.map((category) => (
              <div 
                key={category.id}
                className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-200 dark:border-white/10 p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${category.color}20`, color: category.color }}
                  >
                    {category.icon}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {category.name}
                </h3>
                
                {category.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    {category.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Users className="w-4 h-4" />
                  <span>0 usuários</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1b4c51] rounded-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  placeholder="Ex: Iniciantes, Avançados, VIP..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Descrição
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white"
                  placeholder="Descrição opcional da categoria..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Cor
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({...formData, color: color.value})}
                      className={`w-full h-10 rounded-lg border-2 transition-all ${
                        formData.color === color.value 
                          ? 'border-slate-900 dark:border-white scale-110' 
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Ícone (Emoji)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({...formData, icon: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white text-2xl text-center"
                  placeholder="📁"
                  maxLength={2}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                  Cole um emoji aqui (📁 🎯 🏆 ⭐ 💼 👥)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCategory(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600"
                >
                  {editingCategory ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminCategories;
```

---

## 1.5 - FRONTEND: Adicionar rota no App.js
**Caminho:** `frontend/src/App.js`
**Ação:** MODIFICAR arquivo existente

**Adicionar import (junto com os outros imports de páginas):**
```javascript
import AdminCategories from './pages/admin/AdminCategories';
```

**Adicionar rota (junto com as outras rotas):**
```jsx
<Route
  path="/admin/categories"
  element={
    <PrivateRoute roles={['admin']}>
      <AdminCategories />
    </PrivateRoute>
  }
/>
```

---

## 1.6 - FRONTEND: Adicionar link no menu lateral
**Caminho:** `frontend/src/components/Sidebar.js`
**Ação:** MODIFICAR arquivo existente

**Adicionar no import de ícones:**
```javascript
import { Tag } from 'lucide-react';
```

**Adicionar no array `adminLinks` (junto com os outros links do admin):**
```javascript
{ path: '/admin/categories', icon: Tag, label: 'Categorias' },
```

---

# PARTE 2: RANKING DE FREQUÊNCIA DE APRESENTAÇÕES

## 2.1 - BACKEND: Adicionar Models de Apresentação e Frequência
**Caminho:** `backend/models.py`
**Ação:** ADICIONAR ao arquivo existente

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

# Model de Frequência de Apresentações (para o ranking)
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
```

---

## 2.2 - BACKEND: Adicionar endpoint de ranking de frequência
**Caminho:** `backend/routes/stats_routes.py`
**Ação:** ADICIONAR ao arquivo existente

```python
@router.get("/leaderboard/frequency")
async def get_frequency_leaderboard():
    """Ranking baseado na frequência de apresentações do mês atual"""
    
    now = datetime.now()
    
    # Buscar frequências do mês atual
    frequencies = await db.presentation_frequency.find({
        "year": now.year,
        "month": now.month
    }).sort("frequency_percentage", -1).to_list(100)
    
    leaderboard = []
    
    for freq in frequencies:
        # Buscar dados do usuário (apenas licenciados)
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

## 2.3 - FRONTEND: Adicionar ranking de frequência no RankingSidebar
**Caminho:** `frontend/src/components/RankingSidebar.js`
**Ação:** MODIFICAR arquivo existente

**Adicionar estado para controlar tipo de ranking:**
```javascript
const [rankingType, setRankingType] = useState('frequency'); // 'frequency', 'points', 'reviews'
```

**Adicionar função para buscar ranking de frequência:**
```javascript
const fetchFrequencyRanking = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/stats/leaderboard/frequency`);
    // Processar dados...
  } catch (error) {
    console.error('Erro ao buscar ranking de frequência:', error);
  }
};
```

**Adicionar seletor de tipo de ranking no JSX:**
```jsx
<select 
  value={rankingType} 
  onChange={(e) => setRankingType(e.target.value)}
  className="..."
>
  <option value="frequency">Frequência</option>
  <option value="points">Pontos</option>
  <option value="reviews">Avaliações</option>
</select>
```

---

# PARTE 3: BANCO DE DADOS

## 3.1 - Collections criadas automaticamente
O MongoDB cria as collections automaticamente quando o primeiro documento é inserido.

**Collections novas:**
- `user_categories` - Categorias de usuários
- `presentations` - Apresentações registradas
- `presentation_frequency` - Frequência calculada por mês

---

## 3.2 - Índices recomendados (OPCIONAL - para melhor performance)

Execute no MongoDB Shell ou Compass:

```javascript
// Selecionar banco de dados
use nome_do_seu_banco

// ========== ÍNDICES PARA CATEGORIAS ==========
db.user_categories.createIndex({ "name": 1 }, { unique: true })
db.user_categories.createIndex({ "active": 1 })

// ========== ÍNDICES PARA APRESENTAÇÕES ==========
db.presentations.createIndex({ "user_id": 1, "presentation_date": -1 })
db.presentations.createIndex({ "presentation_date": 1 })
db.presentations.createIndex({ "sold": 1 })

// ========== ÍNDICES PARA FREQUÊNCIA ==========
db.presentation_frequency.createIndex(
  { "user_id": 1, "year": 1, "month": 1 }, 
  { unique: true }
)
db.presentation_frequency.createIndex({ "frequency_percentage": -1 })

// ========== ÍNDICE PARA USUÁRIOS (adicionar campo category_id) ==========
db.users.createIndex({ "category_id": 1 })
```

---

## 3.3 - Campo novo na collection `users`

O sistema adiciona um campo opcional `category_id` aos usuários:

```javascript
// Estrutura do documento de usuário com categoria
{
  "id": "uuid-do-usuario",
  "full_name": "Nome do Usuário",
  "email": "email@exemplo.com",
  "role": "licenciado",
  "category_id": "uuid-da-categoria",  // <-- CAMPO NOVO (opcional)
  // ... outros campos
}
```

---

# PARTE 4: RESUMO - CHECKLIST DE IMPLEMENTAÇÃO

## Backend:
- [ ] Criar `backend/routes/category_routes.py` (código completo acima)
- [ ] Adicionar model `UserCategory` em `backend/models.py`
- [ ] Adicionar model `Presentation` em `backend/models.py`
- [ ] Adicionar model `PresentationFrequency` em `backend/models.py`
- [ ] Importar e registrar `category_router` em `backend/server.py`
- [ ] Adicionar endpoint `/leaderboard/frequency` em `backend/routes/stats_routes.py`

## Frontend:
- [ ] Criar `frontend/src/pages/admin/AdminCategories.js` (código completo acima)
- [ ] Importar `AdminCategories` em `frontend/src/App.js`
- [ ] Adicionar rota `/admin/categories` em `frontend/src/App.js`
- [ ] Importar ícone `Tag` em `frontend/src/components/Sidebar.js`
- [ ] Adicionar link de Categorias no array `adminLinks` em `Sidebar.js`

## Banco de Dados:
- [ ] (Opcional) Criar índices para melhor performance
- [ ] Collections são criadas automaticamente

---

# PARTE 5: TESTANDO A IMPLEMENTAÇÃO

## Testar API de Categorias:
```bash
# Login para obter token
TOKEN=$(curl -s -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ozoxx.com","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Criar categoria
curl -X POST "http://localhost:8001/api/categories/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Iniciantes","description":"Usuários novos","color":"#10b981","icon":"🌱"}'

# Listar categorias
curl "http://localhost:8001/api/categories/" \
  -H "Authorization: Bearer $TOKEN"
```

## Testar API de Ranking de Frequência:
```bash
curl "http://localhost:8001/api/stats/leaderboard/frequency" \
  -H "Authorization: Bearer $TOKEN"
```
