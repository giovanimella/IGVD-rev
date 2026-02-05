from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from models import LandingPageConfig
from auth import get_current_user, require_role
import os
from datetime import datetime
from pathlib import Path
import uuid
import shutil

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/landing", tags=["landing"])

# Diretório para uploads da landing page
LANDING_UPLOAD_DIR = Path("/app/uploads/landing")
LANDING_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


# ==================== CONFIGURAÇÕES PÚBLICAS ====================

@router.get("/config")
async def get_landing_config():
    """Busca configurações da landing page (público)"""
    config = await db.landing_page_config.find_one({"id": "landing_page_config"}, {"_id": 0})
    
    if not config:
        # Criar configuração padrão
        default_config = LandingPageConfig()
        await db.landing_page_config.insert_one(default_config.model_dump())
        config = default_config.model_dump()
    
    return config


# ==================== ADMIN ====================

@router.get("/admin/config")
async def get_landing_config_admin(
    current_user: dict = Depends(require_role(["admin"]))
):
    """Busca configurações da landing page (admin)"""
    config = await db.landing_page_config.find_one({"id": "landing_page_config"}, {"_id": 0})
    
    if not config:
        default_config = LandingPageConfig()
        await db.landing_page_config.insert_one(default_config.model_dump())
        config = default_config.model_dump()
    
    return config


@router.put("/admin/config")
async def update_landing_config(
    updates: dict,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Atualiza configurações da landing page (admin)"""
    updates["updated_at"] = datetime.now().isoformat()
    
    # Garantir que id não seja alterado
    updates["id"] = "landing_page_config"
    
    existing = await db.landing_page_config.find_one({"id": "landing_page_config"})
    
    if existing:
        await db.landing_page_config.update_one(
            {"id": "landing_page_config"},
            {"$set": updates}
        )
    else:
        config = LandingPageConfig(**updates)
        await db.landing_page_config.insert_one(config.model_dump())
    
    return {"message": "Configurações atualizadas com sucesso"}


@router.post("/admin/upload-hero-image")
async def upload_hero_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Upload da imagem principal (hero)"""
    # Validar extensão
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp']
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Formato não suportado. Use: jpg, png, webp")
    
    # Ler arquivo
    contents = await file.read()
    
    # Validar tamanho
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Imagem muito grande. Máximo: 5MB")
    
    # Gerar nome único
    filename = f"hero_{uuid.uuid4()}{ext}"
    filepath = LANDING_UPLOAD_DIR / filename
    
    # Salvar arquivo
    with open(filepath, "wb") as f:
        f.write(contents)
    
    image_url = f"/api/uploads/landing/{filename}"
    
    # Atualizar config
    await db.landing_page_config.update_one(
        {"id": "landing_page_config"},
        {"$set": {"hero_image_url": image_url, "updated_at": datetime.now().isoformat()}},
        upsert=True
    )
    
    return {"image_url": image_url, "message": "Imagem carregada com sucesso"}


@router.post("/admin/upload-logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Upload do logo"""
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg']
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Formato não suportado")
    
    contents = await file.read()
    
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Imagem muito grande. Máximo: 5MB")
    
    filename = f"logo_{uuid.uuid4()}{ext}"
    filepath = LANDING_UPLOAD_DIR / filename
    
    with open(filepath, "wb") as f:
        f.write(contents)
    
    image_url = f"/api/uploads/landing/{filename}"
    
    await db.landing_page_config.update_one(
        {"id": "landing_page_config"},
        {"$set": {"logo_url": image_url, "updated_at": datetime.now().isoformat()}},
        upsert=True
    )
    
    return {"image_url": image_url, "message": "Logo carregado com sucesso"}


@router.post("/admin/reset")
async def reset_landing_config(
    current_user: dict = Depends(require_role(["admin"]))
):
    """Resetar para configurações padrão"""
    default_config = LandingPageConfig()
    
    await db.landing_page_config.delete_one({"id": "landing_page_config"})
    await db.landing_page_config.insert_one(default_config.model_dump())
    
    return {"message": "Configurações resetadas para padrão"}
