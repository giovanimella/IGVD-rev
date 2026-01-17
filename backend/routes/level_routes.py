from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from auth import require_role
import uuid
import os

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/levels", tags=["levels"])

# ==================== MODELOS ====================

class LevelCreate(BaseModel):
    title: str
    min_points: int
    icon: Optional[str] = "⭐"
    color: Optional[str] = "#3b82f6"  # Azul padrão
    description: Optional[str] = None

class LevelUpdate(BaseModel):
    title: Optional[str] = None
    min_points: Optional[int] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None

class LevelResponse(BaseModel):
    id: str
    title: str
    min_points: int
    icon: str
    color: str
    description: Optional[str] = None
    order: int
    created_at: str
    updated_at: str

# ==================== ROTAS ====================

@router.get("/", response_model=List[LevelResponse])
async def get_all_levels():
    """Listar todos os níveis (ordenados por min_points)"""
    levels = await db.levels.find({}, {"_id": 0}).sort("min_points", 1).to_list(100)
    
    # Adicionar ordem baseada na posição
    for i, level in enumerate(levels):
        level["order"] = i + 1
    
    return levels

@router.get("/{level_id}", response_model=LevelResponse)
async def get_level(level_id: str):
    """Obter um nível específico"""
    level = await db.levels.find_one({"id": level_id}, {"_id": 0})
    if not level:
        raise HTTPException(status_code=404, detail="Nível não encontrado")
    return level

@router.post("/", response_model=LevelResponse)
async def create_level(
    data: LevelCreate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Criar um novo nível"""
    # Verificar se já existe um nível com o mesmo título
    existing = await db.levels.find_one({"title": data.title})
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um nível com este título")
    
    # Verificar se já existe um nível com os mesmos pontos
    existing_points = await db.levels.find_one({"min_points": data.min_points})
    if existing_points:
        raise HTTPException(status_code=400, detail=f"Já existe um nível com {data.min_points} pontos")
    
    level = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "min_points": data.min_points,
        "icon": data.icon or "⭐",
        "color": data.color or "#3b82f6",
        "description": data.description,
        "order": 0,  # Será calculado na listagem
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.levels.insert_one(level)
    level.pop("_id", None)
    return level

@router.put("/{level_id}", response_model=LevelResponse)
async def update_level(
    level_id: str,
    data: LevelUpdate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Atualizar um nível"""
    level = await db.levels.find_one({"id": level_id})
    if not level:
        raise HTTPException(status_code=404, detail="Nível não encontrado")
    
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Verificar título duplicado
    if "title" in updates:
        existing = await db.levels.find_one({"title": updates["title"], "id": {"$ne": level_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Já existe um nível com este título")
    
    # Verificar pontos duplicados
    if "min_points" in updates:
        existing_points = await db.levels.find_one({"min_points": updates["min_points"], "id": {"$ne": level_id}})
        if existing_points:
            raise HTTPException(status_code=400, detail=f"Já existe um nível com {updates['min_points']} pontos")
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.levels.update_one({"id": level_id}, {"$set": updates})
    
    updated = await db.levels.find_one({"id": level_id}, {"_id": 0})
    return updated

@router.delete("/{level_id}")
async def delete_level(
    level_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Excluir um nível"""
    level = await db.levels.find_one({"id": level_id})
    if not level:
        raise HTTPException(status_code=404, detail="Nível não encontrado")
    
    await db.levels.delete_one({"id": level_id})
    return {"message": "Nível excluído com sucesso"}

@router.post("/seed")
async def seed_default_levels(
    current_user: dict = Depends(require_role(["admin"]))
):
    """Criar níveis padrão se não existirem"""
    existing_count = await db.levels.count_documents({})
    if existing_count > 0:
        return {"message": f"Já existem {existing_count} níveis cadastrados"}
    
    default_levels = [
        {"title": "Iniciante", "min_points": 0, "icon": "🌱", "color": "#6b7280", "description": "Começando a jornada"},
        {"title": "Aprendiz", "min_points": 100, "icon": "📚", "color": "#3b82f6", "description": "Em fase de aprendizado"},
        {"title": "Intermediário", "min_points": 300, "icon": "⭐", "color": "#8b5cf6", "description": "Evoluindo constantemente"},
        {"title": "Avançado", "min_points": 600, "icon": "🚀", "color": "#f59e0b", "description": "Dominando o conhecimento"},
        {"title": "Expert", "min_points": 1000, "icon": "🏆", "color": "#ef4444", "description": "Especialista no assunto"},
        {"title": "Mestre", "min_points": 2000, "icon": "👑", "color": "#eab308", "description": "Nível máximo de excelência"}
    ]
    
    for level_data in default_levels:
        level = {
            "id": str(uuid.uuid4()),
            **level_data,
            "order": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.levels.insert_one(level)
    
    return {"message": f"Criados {len(default_levels)} níveis padrão"}

# Função auxiliar para calcular o nível de um usuário
async def get_user_level(points: int) -> dict:
    """Retorna o nível atual baseado nos pontos"""
    levels = await db.levels.find({}, {"_id": 0}).sort("min_points", -1).to_list(100)
    
    for level in levels:
        if points >= level["min_points"]:
            return level
    
    # Nível padrão se nenhum for encontrado
    return {"title": "Iniciante", "min_points": 0, "icon": "🌱", "color": "#6b7280"}
