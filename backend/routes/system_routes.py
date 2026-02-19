from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from models import SystemConfig
from auth import get_current_user, require_role
import os
from datetime import datetime
from pathlib import Path
import shutil
from PIL import Image
import io

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/system", tags=["system"])

# Diretório para logos
LOGO_DIR = Path("/app/uploads/logos")
LOGO_DIR.mkdir(parents=True, exist_ok=True)

MAX_LOGO_SIZE = 10 * 1024 * 1024  # 10MB

@router.get("/config")
async def get_system_config():
    """Retorna as configurações do sistema (público)"""
    config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
    
    if not config:
        # Criar configuração padrão se não existir
        default_config = SystemConfig()
        await db.system_config.insert_one(default_config.model_dump())
        config = default_config.model_dump()
    
    # Remover campos sensíveis para usuários não autenticados
    public_config = {
        "platform_name": config.get("platform_name", "IGVD"),
        "platform_logo": config.get("platform_logo"),
        "minimum_passing_score": config.get("minimum_passing_score", 70)
    }
    
    return public_config


@router.get("/config/full")
async def get_full_system_config(current_user: dict = Depends(require_role(["admin"]))):
    """Retorna todas as configurações do sistema (apenas admin)"""
    config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
    
    if not config:
        default_config = SystemConfig()
        await db.system_config.insert_one(default_config.model_dump())
        config = default_config.model_dump()
    
    # Verificar se o template de certificado existe
    # Ajustar o caminho se necessário (para compatibilidade entre ambientes)
    if config.get("certificate_template_path"):
        template_path = config["certificate_template_path"]
        
        # Se o caminho salvo não existe, tentar com o UPLOAD_DIR configurado
        if not Path(template_path).exists():
            base_upload_dir = os.environ.get('UPLOAD_DIR', '/app/uploads')
            # Extrair apenas o nome do arquivo/subpastas
            if '/uploads/' in template_path:
                relative_path = template_path.split('/uploads/')[-1]
                new_path = os.path.join(base_upload_dir, relative_path)
                if Path(new_path).exists():
                    config["certificate_template_path"] = new_path
                else:
                    # Arquivo não existe em nenhum caminho
                    config["certificate_template_path"] = None
    
    return config

@router.put("/config")
async def update_system_config(updates: dict, current_user: dict = Depends(require_role(["admin"]))):
    """Atualiza as configurações do sistema (apenas admin)"""
    updates["updated_at"] = datetime.now().isoformat()
    
    # Verificar se existe
    existing = await db.system_config.find_one({"id": "system_config"})
    
    if existing:
        await db.system_config.update_one(
            {"id": "system_config"},
            {"$set": updates}
        )
    else:
        config = SystemConfig(**updates)
        await db.system_config.insert_one(config.model_dump())
    
    return {"message": "Configurações atualizadas com sucesso"}

@router.get("/stats")
async def get_system_stats(current_user: dict = Depends(require_role(["admin"]))):
    """Retorna estatísticas do sistema"""
    total_users = await db.users.count_documents({})
    total_licensees = await db.users.count_documents({"role": "licenciado"})
    total_supervisors = await db.users.count_documents({"role": "supervisor"})
    total_admins = await db.users.count_documents({"role": "admin"})
    total_modules = await db.modules.count_documents({})
    total_chapters = await db.chapters.count_documents({})
    total_assessments = await db.assessments.count_documents({})
    total_rewards = await db.rewards.count_documents({})
    total_badges = await db.badges.count_documents({})
    total_challenges = await db.weekly_challenges.count_documents({})
    
    # Usuários ativos (acessaram nos últimos 7 dias)
    from datetime import timedelta
    seven_days_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    active_users = await db.user_accesses.distinct("user_id", {"date": {"$gte": seven_days_ago}})
    
    return {
        "total_users": total_users,
        "total_licensees": total_licensees,
        "total_supervisors": total_supervisors,
        "total_admins": total_admins,
        "total_modules": total_modules,
        "total_chapters": total_chapters,
        "total_assessments": total_assessments,
        "total_rewards": total_rewards,
        "total_badges": total_badges,
        "total_challenges": total_challenges,
        "active_users_7d": len(active_users)
    }


# ==================== LOGO DA PLATAFORMA ====================

@router.post("/logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Upload da logo da plataforma (PNG, max 10MB)"""
    
    # Validar extensão
    if not file.filename.lower().endswith('.png'):
        raise HTTPException(status_code=400, detail="Apenas arquivos PNG são aceitos")
    
    # Ler arquivo
    contents = await file.read()
    
    # Validar tamanho
    if len(contents) > MAX_LOGO_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande. Máximo: {MAX_LOGO_SIZE // (1024*1024)}MB"
        )
    
    try:
        # Validar que é uma imagem válida
        image = Image.open(io.BytesIO(contents))
        
        # Salvar o arquivo
        logo_path = LOGO_DIR / "platform_logo.png"
        
        # Remover logo antiga se existir
        if logo_path.exists():
            logo_path.unlink()
        
        # Salvar nova logo
        with open(logo_path, "wb") as f:
            f.write(contents)
        
        # Atualizar configuração do sistema
        logo_url = "/api/uploads/logos/platform_logo.png"
        await db.system_config.update_one(
            {"id": "system_config"},
            {"$set": {
                "platform_logo": logo_url,
                "updated_at": datetime.now().isoformat()
            }},
            upsert=True
        )
        
        return {
            "message": "Logo enviada com sucesso",
            "logo_url": logo_url,
            "size": f"{len(contents) / 1024:.1f} KB",
            "dimensions": f"{image.width}x{image.height}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar imagem: {str(e)}")


@router.delete("/logo")
async def delete_logo(current_user: dict = Depends(require_role(["admin"]))):
    """Remover logo da plataforma"""
    
    logo_path = LOGO_DIR / "platform_logo.png"
    
    if logo_path.exists():
        logo_path.unlink()
    
    await db.system_config.update_one(
        {"id": "system_config"},
        {"$set": {
            "platform_logo": None,
            "updated_at": datetime.now().isoformat()
        }}
    )
    
    return {"message": "Logo removida"}


@router.get("/logo")
async def get_logo():
    """Retorna a URL da logo (público)"""
    config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0, "platform_logo": 1})
    return {"logo_url": config.get("platform_logo") if config else None}
