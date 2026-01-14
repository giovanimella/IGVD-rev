from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from models import Banner, BannerCreate
from auth import get_current_user, require_role
import os
from datetime import datetime
import uuid
import shutil
from pathlib import Path

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/banners", tags=["banners"])

# Diretório para upload de banners
BANNER_DIR = Path("/app/uploads/banners")
BANNER_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/")
async def get_banners():
    """Retorna banners ativos ordenados"""
    banners = await db.banners.find(
        {"active": True}, 
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    return banners

@router.get("/all")
async def get_all_banners(current_user: dict = Depends(require_role(["admin"]))):
    """Retorna todos os banners (admin)"""
    banners = await db.banners.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return banners

@router.post("/")
async def create_banner(
    banner_data: BannerCreate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Cria novo banner"""
    banner = Banner(**banner_data.model_dump())
    await db.banners.insert_one(banner.model_dump())
    return banner

@router.post("/upload")
async def upload_banner_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Faz upload de imagem do banner"""
    # Validar tipo de arquivo
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Arquivo deve ser uma imagem")
    
    # Gerar nome único
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = BANNER_DIR / unique_filename
    
    # Salvar arquivo
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "filename": unique_filename,
        "url": f"/api/uploads/banners/{unique_filename}"
    }

@router.put("/{banner_id}")
async def update_banner(
    banner_id: str,
    updates: dict,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Atualiza banner"""
    updates["updated_at"] = datetime.now().isoformat()
    result = await db.banners.update_one(
        {"id": banner_id},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banner não encontrado")
    return {"message": "Banner atualizado com sucesso"}

@router.delete("/{banner_id}")
async def delete_banner(
    banner_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Deleta banner"""
    result = await db.banners.delete_one({"id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner não encontrado")
    return {"message": "Banner deletado com sucesso"}
