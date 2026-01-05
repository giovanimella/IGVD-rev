from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from models import FileRepository
from auth import get_current_user, require_role
import os
import uuid
import shutil
from pathlib import Path

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/files", tags=["files"])

UPLOAD_DIR = Path("/app/uploads/repository")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/")
async def get_all_files(category: str = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if category:
        query["category"] = category
    
    files = await db.file_repository.find(query, {"_id": 0}).sort("uploaded_at", -1).to_list(1000)
    return files

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    category: str = "other",
    current_user: dict = Depends(require_role(["admin"]))
):
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    file_size = file_path.stat().st_size
    
    file_type = "other"
    if file_extension.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
        file_type = "image"
    elif file_extension.lower() in ['.pdf']:
        file_type = "pdf"
    elif file_extension.lower() in ['.mp4', '.mov', '.avi']:
        file_type = "video"
    elif file_extension.lower() in ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']:
        file_type = "document"
    
    file_record = FileRepository(
        filename=unique_filename,
        original_filename=file.filename,
        file_type=file_type,
        category=category,
        file_url=f"/uploads/repository/{unique_filename}",
        file_size=file_size,
        uploaded_by=current_user["sub"]
    )
    
    await db.file_repository.insert_one(file_record.model_dump())
    
    return file_record

@router.delete("/{file_id}")
async def delete_file(file_id: str, current_user: dict = Depends(require_role(["admin"]))):
    file_record = await db.file_repository.find_one({"id": file_id}, {"_id": 0})
    if not file_record:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    
    file_path = UPLOAD_DIR / file_record["filename"]
    if file_path.exists():
        file_path.unlink()
    
    await db.file_repository.delete_one({"id": file_id})
    
    return {"message": "Arquivo deletado com sucesso"}

@router.get("/categories")
async def get_categories(current_user: dict = Depends(get_current_user)):
    return [
        {"value": "social_media", "label": "Redes Sociais"},
        {"value": "presentation", "label": "Apresentações"},
        {"value": "folder", "label": "Folders"},
        {"value": "banner", "label": "Banners"},
        {"value": "other", "label": "Outros"}
    ]