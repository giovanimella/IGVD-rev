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
