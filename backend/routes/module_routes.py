from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from models import Module, ModuleCreate
from auth import get_current_user, require_role
import os
import uuid
from pathlib import Path
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/modules", tags=["modules"])

# Diretório para imagens de capa
COVER_IMAGES_DIR = Path("/app/uploads/module_covers")
COVER_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/")
async def get_all_modules(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    current_stage = user.get("current_stage", "completo") if user else "completo"
    
    query = {}
    if current_user.get("role") == "licenciado":
        if current_stage == "acolhimento":
            query["is_acolhimento"] = True
        elif current_stage != "completo":
            return []
    
    modules = await db.modules.find(query, {"_id": 0}).sort("order", 1).to_list(1000)
    
    # Filtrar módulos baseado no delay de visibilidade (para licenciados)
    if current_user.get("role") == "licenciado" and user:
        user_created_at = user.get("created_at", datetime.now(timezone.utc).isoformat())
        try:
            user_registration_date = datetime.fromisoformat(user_created_at.replace('Z', '+00:00'))
        except:
            user_registration_date = datetime.now(timezone.utc)
        
        now = datetime.now(timezone.utc)
        months_since_registration = (now.year - user_registration_date.year) * 12 + (now.month - user_registration_date.month)
        
        filtered_modules = []
        for module in modules:
            delay_months = module.get("visibility_delay_months", 0)
            if delay_months <= months_since_registration:
                filtered_modules.append(module)
            else:
                # Calcular quando o módulo ficará disponível
                available_date = user_registration_date + relativedelta(months=delay_months)
                module["locked"] = True
                module["available_at"] = available_date.isoformat()
                module["months_until_available"] = delay_months - months_since_registration
                filtered_modules.append(module)
        
        modules = filtered_modules
    
    for module in modules:
        chapters_count = await db.chapters.count_documents({"module_id": module["id"]})
        module["chapters_count"] = chapters_count
        
        if current_user.get("role") != "admin":
            completed_chapters = await db.user_progress.count_documents({
                "user_id": current_user["sub"],
                "module_id": module["id"],
                "completed": True
            })
            module["progress"] = (completed_chapters / chapters_count * 100) if chapters_count > 0 else 0
    
    return modules

@router.get("/{module_id}")
async def get_module(module_id: str, current_user: dict = Depends(get_current_user)):
    module = await db.modules.find_one({"id": module_id}, {"_id": 0})
    if not module:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    
    chapters = await db.chapters.find({"module_id": module_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    module["chapters"] = chapters
    
    if current_user.get("role") != "admin":
        for chapter in chapters:
            progress = await db.user_progress.find_one({
                "user_id": current_user["sub"],
                "chapter_id": chapter["id"]
            }, {"_id": 0})
            chapter["user_progress"] = progress if progress else {"completed": False, "watched_percentage": 0}
    
    return module

@router.post("/")
async def create_module(module_data: ModuleCreate, current_user: dict = Depends(require_role(["admin"]))):
    module = Module(**module_data.model_dump(), created_by=current_user["sub"])
    await db.modules.insert_one(module.model_dump())
    return module

@router.put("/{module_id}")
async def update_module(module_id: str, updates: dict, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.modules.update_one(
        {"id": module_id},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    return {"message": "Módulo atualizado com sucesso"}

@router.delete("/{module_id}")
async def delete_module(module_id: str, current_user: dict = Depends(require_role(["admin"]))):
    await db.chapters.delete_many({"module_id": module_id})
    await db.user_progress.delete_many({"module_id": module_id})
    
    result = await db.modules.delete_one({"id": module_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    return {"message": "Módulo deletado com sucesso"}