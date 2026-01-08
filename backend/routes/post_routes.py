from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from models import Post, PostCreate
from auth import get_current_user, require_role
import os
from datetime import datetime

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/posts", tags=["posts"])

@router.get("/")
async def get_posts(limit: int = 3):
    """Retorna posts ativos (limitado)"""
    posts = await db.posts.find(
        {"active": True}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return posts

@router.get("/all")
async def get_all_posts(current_user: dict = Depends(get_current_user)):
    """Retorna todos os posts ativos"""
    posts = await db.posts.find(
        {"active": True}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return posts

@router.get("/manage")
async def get_posts_for_management(current_user: dict = Depends(require_role(["admin"]))):
    """Retorna todos os posts para gerenciamento (admin)"""
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return posts

@router.get("/{post_id}")
async def get_post(post_id: str):
    """Retorna um post específico"""
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    return post

@router.post("/")
async def create_post(
    post_data: PostCreate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Cria novo post"""
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    
    post = Post(
        **post_data.model_dump(),
        author_id=current_user["sub"],
        author_name=user["full_name"]
    )
    
    await db.posts.insert_one(post.model_dump())
    return post

@router.put("/{post_id}")
async def update_post(
    post_id: str,
    updates: dict,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Atualiza post"""
    updates["updated_at"] = datetime.now().isoformat()
    result = await db.posts.update_one(
        {"id": post_id},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    return {"message": "Post atualizado com sucesso"}

@router.delete("/{post_id}")
async def delete_post(
    post_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Deleta post"""
    result = await db.posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    return {"message": "Post deletado com sucesso"}
