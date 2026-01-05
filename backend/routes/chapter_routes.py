from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from models import Chapter, ChapterCreate
from auth import get_current_user, require_role
import os

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/chapters", tags=["chapters"])

@router.get("/module/{module_id}")
async def get_module_chapters(module_id: str, current_user: dict = Depends(get_current_user)):
    chapters = await db.chapters.find({"module_id": module_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    
    if current_user.get("role") != "admin":
        for chapter in chapters:
            progress = await db.user_progress.find_one({
                "user_id": current_user["sub"],
                "chapter_id": chapter["id"]
            }, {"_id": 0})
            chapter["user_progress"] = progress if progress else {"completed": False, "watched_percentage": 0}
    
    return chapters

@router.get("/{chapter_id}")
async def get_chapter(chapter_id: str, current_user: dict = Depends(get_current_user)):
    chapter = await db.chapters.find_one({"id": chapter_id}, {"_id": 0})
    if not chapter:
        raise HTTPException(status_code=404, detail="Capítulo não encontrado")
    
    if current_user.get("role") != "admin":
        progress = await db.user_progress.find_one({
            "user_id": current_user["sub"],
            "chapter_id": chapter_id
        }, {"_id": 0})
        chapter["user_progress"] = progress if progress else {"completed": False, "watched_percentage": 0}
    
    return chapter

@router.post("/")
async def create_chapter(chapter_data: ChapterCreate, current_user: dict = Depends(require_role(["admin"]))):
    module = await db.modules.find_one({"id": chapter_data.module_id})
    if not module:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    
    chapter = Chapter(**chapter_data.model_dump())
    await db.chapters.insert_one(chapter.model_dump())
    return chapter

@router.put("/{chapter_id}")
async def update_chapter(chapter_id: str, updates: dict, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.chapters.update_one(
        {"id": chapter_id},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Capítulo não encontrado")
    return {"message": "Capítulo atualizado com sucesso"}

@router.delete("/{chapter_id}")
async def delete_chapter(chapter_id: str, current_user: dict = Depends(require_role(["admin"]))):
    await db.user_progress.delete_many({"chapter_id": chapter_id})
    
    result = await db.chapters.delete_one({"id": chapter_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Capítulo não encontrado")
    return {"message": "Capítulo deletado com sucesso"}