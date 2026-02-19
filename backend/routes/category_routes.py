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

@router.get("/all-users")
async def get_all_users_for_categories(
    current_user: dict = Depends(require_role(["admin"]))
):
    """Listar todos os usuários com suas categorias (para gerenciamento)"""
    users = await db.users.find(
        {},
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1, "category_ids": 1, "category_id": 1}
    ).sort("full_name", 1).to_list(1000)
    
    # Normalizar category_ids para todos os usuários
    for user in users:
        if "category_ids" not in user:
            user["category_ids"] = []
        # Se tem category_id mas não está em category_ids, adicionar
        if user.get("category_id") and user["category_id"] not in user["category_ids"]:
            user["category_ids"].append(user["category_id"])
    
    return users

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
    """Atribuir categoria a um usuário (adiciona à lista de categorias)"""
    # Verificar se categoria existe
    category = await db.user_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # Verificar se usuário existe
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Adicionar categoria ao array (usando $addToSet para evitar duplicatas)
    await db.users.update_one(
        {"id": user_id},
        {
            "$addToSet": {"category_ids": category_id},
            "$set": {"category_id": category_id}  # manter compatibilidade
        }
    )
    
    return {"message": "Categoria atribuída ao usuário"}

@router.post("/assign-bulk")
async def assign_category_to_multiple_users(
    data: dict,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Atribuir uma categoria a múltiplos usuários de uma vez"""
    category_id = data.get("category_id")
    user_ids = data.get("user_ids", [])
    
    if not category_id:
        raise HTTPException(status_code=400, detail="category_id é obrigatório")
    
    if not user_ids:
        raise HTTPException(status_code=400, detail="user_ids é obrigatório")
    
    # Verificar se categoria existe
    category = await db.user_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # Atualizar todos os usuários de uma vez
    result = await db.users.update_many(
        {"id": {"$in": user_ids}},
        {
            "$addToSet": {"category_ids": category_id},
            "$set": {"category_id": category_id}
        }
    )
    
    return {
        "message": f"Categoria atribuída a {result.modified_count} usuários",
        "updated_count": result.modified_count
    }

@router.post("/remove-bulk")
async def remove_category_from_multiple_users(
    data: dict,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Remover uma categoria de múltiplos usuários de uma vez"""
    category_id = data.get("category_id")
    user_ids = data.get("user_ids", [])
    
    if not category_id:
        raise HTTPException(status_code=400, detail="category_id é obrigatório")
    
    if not user_ids:
        raise HTTPException(status_code=400, detail="user_ids é obrigatório")
    
    # Remover categoria do array
    result = await db.users.update_many(
        {"id": {"$in": user_ids}},
        {"$pull": {"category_ids": category_id}}
    )
    
    # Para usuários que tinham essa como category_id principal, limpar
    await db.users.update_many(
        {"id": {"$in": user_ids}, "category_id": category_id},
        {"$unset": {"category_id": ""}}
    )
    
    return {
        "message": f"Categoria removida de {result.modified_count} usuários",
        "updated_count": result.modified_count
    }

@router.post("/remove")
async def remove_category_from_user(
    user_id: str,
    category_id: str = None,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Remover categoria de um usuário"""
    if category_id:
        # Remover categoria específica do array
        await db.users.update_one(
            {"id": user_id},
            {"$pull": {"category_ids": category_id}}
        )
        # Se era a categoria principal, limpar
        await db.users.update_one(
            {"id": user_id, "category_id": category_id},
            {"$unset": {"category_id": ""}}
        )
    else:
        # Remover todas as categorias
        await db.users.update_one(
            {"id": user_id},
            {
                "$set": {"category_ids": []},
                "$unset": {"category_id": ""}
            }
        )
    
    return {"message": "Categoria removida do usuário"}

@router.get("/users/{category_id}")
async def get_users_by_category(
    category_id: str,
    current_user: dict = Depends(require_role(["admin", "supervisor"]))
):
    """Listar usuários de uma categoria"""
    # Buscar por category_ids (array) ou category_id (compatibilidade)
    users = await db.users.find(
        {"$or": [
            {"category_ids": category_id},
            {"category_id": category_id}
        ]},
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1, "category_ids": 1}
    ).to_list(1000)
    
    return users

@router.get("/stats/{category_id}")
async def get_category_stats(
    category_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Estatísticas de uma categoria"""
    # Buscar por category_ids (array) ou category_id (compatibilidade)
    total_users = await db.users.count_documents({
        "$or": [
            {"category_ids": category_id},
            {"category_id": category_id}
        ]
    })
    
    # Usuários ativos (acessaram nos últimos 30 dias)
    from datetime import datetime, timedelta
    thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
    
    active_users = await db.users.count_documents({
        "$or": [
            {"category_ids": category_id},
            {"category_id": category_id}
        ],
        "last_login": {"$gte": thirty_days_ago}
    })
    
    return {
        "total_users": total_users,
        "active_users": active_users
    }
