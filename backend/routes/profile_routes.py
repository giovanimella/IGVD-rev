from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
import os
import uuid
import shutil
from PIL import Image
import io

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/profile", tags=["profile"])

UPLOAD_DIR = Path("/app/uploads/avatars")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
AVATAR_SIZE = (200, 200)


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


@router.get("/me")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Retorna perfil completo do usuário logado"""
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Buscar estatísticas adicionais
    stats = {}
    
    # Badges
    badges = await db.user_badges.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    badge_ids = [b["badge_id"] for b in badges]
    badge_details = await db.badges.find({"id": {"$in": badge_ids}}, {"_id": 0}).to_list(100)
    stats["badges"] = badge_details
    
    # Streak
    streak = await db.user_streaks.find_one({"user_id": user["id"]}, {"_id": 0})
    stats["streak"] = streak
    
    # Progresso
    progress = await db.user_progress.count_documents({"user_id": user["id"], "completed": True})
    stats["chapters_completed"] = progress
    
    # Certificados
    certs = await db.certificates.count_documents({"user_id": user["id"]})
    stats["certificates"] = certs
    
    return {**user, "stats": stats}


@router.put("/me")
async def update_my_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Atualizar dados do perfil"""
    updates = {}
    
    if profile_data.full_name:
        updates["full_name"] = profile_data.full_name
    if profile_data.phone:
        updates["phone"] = profile_data.phone
    
    if updates:
        await db.users.update_one(
            {"id": current_user["sub"]},
            {"$set": updates}
        )
    
    return {"message": "Perfil atualizado com sucesso"}


@router.post("/picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload de foto de perfil com redimensionamento automático"""
    
    # Validar extensão
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato não suportado. Use: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Ler arquivo
    contents = await file.read()
    
    # Validar tamanho
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande. Máximo: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    try:
        # Processar imagem
        image = Image.open(io.BytesIO(contents))
        
        # Converter para RGB se necessário (para JPEG)
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        
        # Criar thumbnail centralizado (crop quadrado)
        width, height = image.size
        min_dim = min(width, height)
        
        left = (width - min_dim) // 2
        top = (height - min_dim) // 2
        right = left + min_dim
        bottom = top + min_dim
        
        image = image.crop((left, top, right, bottom))
        image = image.resize(AVATAR_SIZE, Image.Resampling.LANCZOS)
        
        # Salvar
        unique_filename = f"{current_user['sub']}_{uuid.uuid4().hex[:8]}.jpg"
        file_path = UPLOAD_DIR / unique_filename
        
        image.save(file_path, "JPEG", quality=85)
        
        # Remover foto antiga se existir
        user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "profile_picture": 1})
        if user and user.get("profile_picture"):
            old_filename = user["profile_picture"].split("/")[-1]
            old_path = UPLOAD_DIR / old_filename
            if old_path.exists() and old_filename != unique_filename:
                old_path.unlink()
        
        # Atualizar no banco
        profile_picture_url = f"/uploads/avatars/{unique_filename}"
        await db.users.update_one(
            {"id": current_user["sub"]},
            {"$set": {"profile_picture": profile_picture_url}}
        )
        
        return {
            "message": "Foto de perfil atualizada com sucesso",
            "profile_picture": profile_picture_url
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar imagem: {str(e)}")


@router.delete("/picture")
async def delete_profile_picture(current_user: dict = Depends(get_current_user)):
    """Remover foto de perfil"""
    
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "profile_picture": 1})
    
    if user and user.get("profile_picture"):
        filename = user["profile_picture"].split("/")[-1]
        file_path = UPLOAD_DIR / filename
        if file_path.exists():
            file_path.unlink()
    
    await db.users.update_one(
        {"id": current_user["sub"]},
        {"$set": {"profile_picture": None}}
    )
    
    return {"message": "Foto de perfil removida"}


@router.get("/{user_id}")
async def get_user_profile(user_id: str, current_user: dict = Depends(get_current_user)):
    """Retorna perfil público de um usuário (para supervisores/admins)"""
    
    # Verificar permissão
    if current_user["role"] not in ["admin", "supervisor"]:
        if current_user["sub"] != user_id:
            raise HTTPException(status_code=403, detail="Sem permissão")
    
    user = await db.users.find_one(
        {"id": user_id},
        {"_id": 0, "password": 0}
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return user
