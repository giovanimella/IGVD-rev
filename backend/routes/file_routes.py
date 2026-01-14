from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorClient
from models import FileRepository, FileFolder, FileFolderCreate
from auth import get_current_user, require_role
import os
import uuid
import shutil
from pathlib import Path
from typing import Optional

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/files", tags=["files"])

UPLOAD_DIR = Path("/app/uploads/repository")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ==================== PASTAS ====================

@router.get("/folders")
async def get_all_folders(current_user: dict = Depends(get_current_user)):
    """Lista todas as pastas"""
    folders = await db.file_folders.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return folders

@router.post("/folders")
async def create_folder(folder_data: FileFolderCreate, current_user: dict = Depends(require_role(["admin"]))):
    """Criar nova pasta"""
    folder = FileFolder(
        **folder_data.model_dump(),
        created_by=current_user["sub"]
    )
    await db.file_folders.insert_one(folder.model_dump())
    return {"message": "Pasta criada com sucesso", "folder": folder.model_dump()}

@router.put("/folders/{folder_id}")
async def update_folder(folder_id: str, folder_data: FileFolderCreate, current_user: dict = Depends(require_role(["admin"]))):
    """Atualizar pasta"""
    existing = await db.file_folders.find_one({"id": folder_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Pasta não encontrada")
    
    await db.file_folders.update_one(
        {"id": folder_id},
        {"$set": folder_data.model_dump()}
    )
    return {"message": "Pasta atualizada com sucesso"}

@router.delete("/folders/{folder_id}")
async def delete_folder(folder_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """Deletar pasta (move arquivos para 'sem pasta')"""
    existing = await db.file_folders.find_one({"id": folder_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Pasta não encontrada")
    
    # Mover arquivos da pasta para "sem pasta"
    await db.file_repository.update_many(
        {"folder_id": folder_id},
        {"$set": {"folder_id": None}}
    )
    
    await db.file_folders.delete_one({"id": folder_id})
    return {"message": "Pasta deletada com sucesso"}

# ==================== ARQUIVOS ====================

@router.get("/")
async def get_all_files(
    folder_id: Optional[str] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Lista arquivos, opcionalmente filtrados por pasta ou categoria"""
    query = {}
    if folder_id:
        query["folder_id"] = folder_id
    if category:
        query["category"] = category
    
    files = await db.file_repository.find(query, {"_id": 0}).sort("uploaded_at", -1).to_list(1000)
    return files

@router.get("/by-folder")
async def get_files_grouped_by_folder(current_user: dict = Depends(get_current_user)):
    """Retorna arquivos agrupados por pasta"""
    folders = await db.file_folders.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    files = await db.file_repository.find({}, {"_id": 0}).sort("uploaded_at", -1).to_list(1000)
    
    result = {
        "folders": [],
        "uncategorized": []
    }
    
    # Arquivos sem pasta
    uncategorized = [f for f in files if not f.get("folder_id")]
    result["uncategorized"] = uncategorized
    
    # Arquivos por pasta
    for folder in folders:
        folder_files = [f for f in files if f.get("folder_id") == folder["id"]]
        result["folders"].append({
            **folder,
            "files": folder_files,
            "file_count": len(folder_files)
        })
    
    return result

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    category: str = Form("other"),
    folder_id: Optional[str] = Form(None),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Upload de arquivo"""
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
        folder_id=folder_id if folder_id and folder_id != "null" else None,
        file_url=f"/api/uploads/repository/{unique_filename}",
        file_size=file_size,
        uploaded_by=current_user["sub"]
    )
    
    await db.file_repository.insert_one(file_record.model_dump())
    
    return file_record

@router.put("/{file_id}")
async def update_file(file_id: str, updates: dict, current_user: dict = Depends(require_role(["admin"]))):
    """Atualizar arquivo (mover para outra pasta, mudar categoria)"""
    existing = await db.file_repository.find_one({"id": file_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    
    allowed_updates = {}
    if "folder_id" in updates:
        allowed_updates["folder_id"] = updates["folder_id"] if updates["folder_id"] != "null" else None
    if "category" in updates:
        allowed_updates["category"] = updates["category"]
    
    if allowed_updates:
        await db.file_repository.update_one(
            {"id": file_id},
            {"$set": allowed_updates}
        )
    
    return {"message": "Arquivo atualizado com sucesso"}

@router.delete("/{file_id}")
async def delete_file(file_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """Deletar arquivo"""
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
    """Lista categorias de arquivos"""
    return [
        {"value": "social_media", "label": "Redes Sociais"},
        {"value": "presentation", "label": "Apresentações"},
        {"value": "folder", "label": "Folders"},
        {"value": "banner", "label": "Banners"},
        {"value": "other", "label": "Outros"}
    ]
