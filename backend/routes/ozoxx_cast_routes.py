"""
Sistema Ozoxx Cast - Gravações de Lives da Fábrica
- Upload de vídeos pelo admin
- Player direto na plataforma para licenciados
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user, require_role
import uuid
import os
import aiofiles
import shutil

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/ozoxx-cast", tags=["ozoxx-cast"])

# Diretório para armazenar vídeos
VIDEOS_DIR = "/app/uploads/ozoxx_cast"
os.makedirs(VIDEOS_DIR, exist_ok=True)

# ==================== MODELOS ====================

class VideoCreate(BaseModel):
    title: str
    description: Optional[str] = None

class VideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None
    order: Optional[int] = None

# ==================== ROTAS ADMIN ====================

@router.post("/videos")
async def upload_video(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    video: UploadFile = File(...),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Upload de um novo vídeo para o Ozoxx Cast"""
    # Validar tipo do arquivo
    allowed_types = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]
    if video.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido. Use MP4, WebM, MOV ou AVI.")
    
    # Gerar nome único para o arquivo
    file_extension = os.path.splitext(video.filename)[1] or ".mp4"
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join(VIDEOS_DIR, unique_filename)
    
    # Salvar arquivo
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            content = await video.read()
            await f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo: {str(e)}")
    
    # Calcular tamanho do arquivo
    file_size = os.path.getsize(file_path)
    
    # Obter ordem (próximo número)
    last_video = await db.ozoxx_cast_videos.find_one(
        {}, {"order": 1}, sort=[("order", -1)]
    )
    next_order = (last_video.get("order", 0) + 1) if last_video else 1
    
    # Criar registro no banco
    video_record = {
        "id": str(uuid.uuid4()),
        "title": title,
        "description": description,
        "filename": unique_filename,
        "original_filename": video.filename,
        "file_size": file_size,
        "content_type": video.content_type,
        "video_url": f"/api/ozoxx-cast/stream/{unique_filename}",
        "order": next_order,
        "active": True,
        "views": 0,
        "uploaded_by": current_user["sub"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.ozoxx_cast_videos.insert_one(video_record)
    video_record.pop("_id", None)
    
    return {
        "message": "Vídeo enviado com sucesso",
        "video": video_record
    }

@router.get("/videos")
async def get_all_videos(current_user: dict = Depends(get_current_user)):
    """Listar todos os vídeos do Ozoxx Cast"""
    query = {}
    
    # Se não for admin, mostrar apenas vídeos ativos
    if current_user.get("role") != "admin":
        query["active"] = True
    
    videos = await db.ozoxx_cast_videos.find(query, {"_id": 0}).sort("order", 1).to_list(500)
    
    # Formatar tamanho do arquivo
    for video in videos:
        video["file_size_formatted"] = format_file_size(video.get("file_size", 0))
    
    return videos

@router.get("/videos/{video_id}")
async def get_video(video_id: str, current_user: dict = Depends(get_current_user)):
    """Obter detalhes de um vídeo específico"""
    video = await db.ozoxx_cast_videos.find_one({"id": video_id}, {"_id": 0})
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    # Se não for admin e vídeo não está ativo
    if current_user.get("role") != "admin" and not video.get("active"):
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    # Incrementar contador de visualizações
    await db.ozoxx_cast_videos.update_one(
        {"id": video_id},
        {"$inc": {"views": 1}}
    )
    
    video["file_size_formatted"] = format_file_size(video.get("file_size", 0))
    return video

@router.put("/videos/{video_id}")
async def update_video(
    video_id: str,
    data: VideoUpdate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Atualizar dados de um vídeo"""
    video = await db.ozoxx_cast_videos.find_one({"id": video_id})
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.ozoxx_cast_videos.update_one(
        {"id": video_id},
        {"$set": updates}
    )
    
    updated = await db.ozoxx_cast_videos.find_one({"id": video_id}, {"_id": 0})
    return updated

@router.delete("/videos/{video_id}")
async def delete_video(
    video_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Excluir um vídeo"""
    video = await db.ozoxx_cast_videos.find_one({"id": video_id})
    
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    
    # Remover arquivo físico
    file_path = os.path.join(VIDEOS_DIR, video["filename"])
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Remover do banco
    await db.ozoxx_cast_videos.delete_one({"id": video_id})
    
    return {"message": "Vídeo excluído com sucesso"}

@router.put("/videos/reorder")
async def reorder_videos(
    video_ids: List[str],
    current_user: dict = Depends(require_role(["admin"]))
):
    """Reordenar vídeos"""
    for index, video_id in enumerate(video_ids):
        await db.ozoxx_cast_videos.update_one(
            {"id": video_id},
            {"$set": {"order": index + 1}}
        )
    
    return {"message": "Ordem atualizada com sucesso"}

# ==================== STREAMING ====================

@router.get("/stream/{filename}")
async def stream_video(filename: str):
    """Stream de vídeo"""
    from fastapi.responses import FileResponse
    
    file_path = os.path.join(VIDEOS_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    
    # Determinar tipo de conteúdo
    extension = os.path.splitext(filename)[1].lower()
    content_types = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".avi": "video/x-msvideo"
    }
    content_type = content_types.get(extension, "video/mp4")
    
    return FileResponse(
        file_path,
        media_type=content_type,
        filename=filename
    )

# ==================== FUNÇÕES AUXILIARES ====================

def format_file_size(size_bytes: int) -> str:
    """Formatar tamanho do arquivo em formato legível"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"
