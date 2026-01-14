from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user
import os
import uuid
import shutil
from pathlib import Path

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

VIDEO_DIR = UPLOAD_DIR / "videos"
VIDEO_DIR.mkdir(parents=True, exist_ok=True)

DOCUMENT_DIR = UPLOAD_DIR / "documents"
DOCUMENT_DIR.mkdir(parents=True, exist_ok=True)

CERTIFICATE_DIR = UPLOAD_DIR / "certificates"
CERTIFICATE_DIR.mkdir(parents=True, exist_ok=True)

MAX_VIDEO_SIZE = 500 * 1024 * 1024

@router.post("/video")
async def upload_video(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in ['.mp4', '.mov', '.avi', '.webm']:
        raise HTTPException(status_code=400, detail="Formato de vídeo inválido")
    
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = VIDEO_DIR / unique_filename
    
    total_size = 0
    with file_path.open("wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            total_size += len(chunk)
            if total_size > MAX_VIDEO_SIZE:
                file_path.unlink()
                raise HTTPException(status_code=400, detail="Vídeo excede o limite de 500MB")
            buffer.write(chunk)
    
    return {
        "filename": unique_filename,
        "url": f"/api/uploads/videos/{unique_filename}",
        "size": total_size
    }

@router.post("/document")
async def upload_document(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in ['.pdf', '.doc', '.docx', '.ppt', '.pptx']:
        raise HTTPException(status_code=400, detail="Formato de documento inválido")
    
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = DOCUMENT_DIR / unique_filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    file_size = file_path.stat().st_size
    
    return {
        "filename": unique_filename,
        "url": f"/api/uploads/documents/{unique_filename}",
        "size": file_size
    }

@router.post("/certificate-template")
async def upload_certificate_template(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Template deve ser PDF")
    
    unique_filename = f"{uuid.uuid4()}.pdf"
    file_path = CERTIFICATE_DIR / unique_filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "filename": unique_filename,
        "url": f"/api/uploads/certificates/{unique_filename}"
    }