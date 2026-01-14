from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user
from pydantic import BaseModel, Field
from datetime import datetime
import os
import uuid

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/favorites", tags=["favorites"])


class Favorite(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    chapter_id: str
    module_id: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class FavoriteCreate(BaseModel):
    chapter_id: str
    module_id: str


@router.get("/")
async def get_my_favorites(current_user: dict = Depends(get_current_user)):
    """Lista todos os capítulos favoritos do usuário"""
    
    favorites = await db.favorites.find(
        {"user_id": current_user["sub"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Enriquecer com dados do capítulo e módulo
    result = []
    
    for fav in favorites:
        chapter = await db.chapters.find_one({"id": fav["chapter_id"]}, {"_id": 0})
        module = await db.modules.find_one({"id": fav["module_id"]}, {"_id": 0})
        
        if chapter and module:
            result.append({
                "id": fav["id"],
                "chapter_id": fav["chapter_id"],
                "module_id": fav["module_id"],
                "created_at": fav["created_at"],
                "chapter": {
                    "id": chapter["id"],
                    "title": chapter.get("title", ""),
                    "description": chapter.get("description", ""),
                    "content_type": chapter.get("content_type", ""),
                    "duration_minutes": chapter.get("duration_minutes", 0),
                    "order": chapter.get("order", 0)
                },
                "module": {
                    "id": module["id"],
                    "title": module.get("title", "")
                }
            })
    
    return result


@router.post("/")
async def add_favorite(
    favorite_data: FavoriteCreate,
    current_user: dict = Depends(get_current_user)
):
    """Adicionar capítulo aos favoritos"""
    
    # Verificar se capítulo existe
    chapter = await db.chapters.find_one({"id": favorite_data.chapter_id}, {"_id": 0})
    if not chapter:
        raise HTTPException(status_code=404, detail="Capítulo não encontrado")
    
    # Verificar se já está favoritado
    existing = await db.favorites.find_one({
        "user_id": current_user["sub"],
        "chapter_id": favorite_data.chapter_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Capítulo já está nos favoritos")
    
    # Criar favorito
    favorite = Favorite(
        user_id=current_user["sub"],
        chapter_id=favorite_data.chapter_id,
        module_id=favorite_data.module_id
    )
    
    await db.favorites.insert_one(favorite.model_dump())
    
    return {"message": "Adicionado aos favoritos", "id": favorite.id}


@router.delete("/{chapter_id}")
async def remove_favorite(
    chapter_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remover capítulo dos favoritos"""
    
    result = await db.favorites.delete_one({
        "user_id": current_user["sub"],
        "chapter_id": chapter_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorito não encontrado")
    
    return {"message": "Removido dos favoritos"}


@router.get("/check/{chapter_id}")
async def check_favorite(
    chapter_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Verificar se um capítulo está nos favoritos"""
    
    existing = await db.favorites.find_one({
        "user_id": current_user["sub"],
        "chapter_id": chapter_id
    })
    
    return {"is_favorite": existing is not None}


@router.post("/toggle/{chapter_id}")
async def toggle_favorite(
    chapter_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Alternar favorito (adiciona se não existe, remove se existe)"""
    
    existing = await db.favorites.find_one({
        "user_id": current_user["sub"],
        "chapter_id": chapter_id
    })
    
    if existing:
        await db.favorites.delete_one({"id": existing["id"]})
        return {"is_favorite": False, "message": "Removido dos favoritos"}
    else:
        # Buscar capítulo para pegar module_id
        chapter = await db.chapters.find_one({"id": chapter_id}, {"_id": 0})
        if not chapter:
            raise HTTPException(status_code=404, detail="Capítulo não encontrado")
        
        favorite = Favorite(
            user_id=current_user["sub"],
            chapter_id=chapter_id,
            module_id=chapter.get("module_id", "")
        )
        
        await db.favorites.insert_one(favorite.model_dump())
        return {"is_favorite": True, "message": "Adicionado aos favoritos"}
