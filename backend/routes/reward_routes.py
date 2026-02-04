from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from models import Reward, RewardCreate, RewardRedemption
from auth import get_current_user, require_role
import os
import uuid
from pathlib import Path
from datetime import datetime, timezone

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/rewards", tags=["rewards"])

# Diretório para imagens de recompensas
REWARD_IMAGES_DIR = Path("/app/uploads/reward_images")
REWARD_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/")
async def get_all_rewards(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") == "admin":
        rewards = await db.rewards.find({}, {"_id": 0}).to_list(1000)
    else:
        rewards = await db.rewards.find({"active": True}, {"_id": 0}).to_list(1000)
    return rewards

@router.post("/")
async def create_reward(reward_data: RewardCreate, current_user: dict = Depends(require_role(["admin"]))):
    reward = Reward(**reward_data.model_dump())
    await db.rewards.insert_one(reward.model_dump())
    return reward

@router.put("/{reward_id}")
async def update_reward(reward_id: str, updates: dict, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.rewards.update_one(
        {"id": reward_id},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Recompensa não encontrada")
    return {"message": "Recompensa atualizada com sucesso"}

@router.delete("/{reward_id}")
async def delete_reward(reward_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.rewards.delete_one({"id": reward_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recompensa não encontrada")
    return {"message": "Recompensa deletada com sucesso"}

@router.post("/{reward_id}/image")
async def upload_reward_image(
    reward_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Upload de imagem para a recompensa"""
    reward = await db.rewards.find_one({"id": reward_id}, {"_id": 0})
    if not reward:
        raise HTTPException(status_code=404, detail="Recompensa não encontrada")
    
    # Validar tipo de arquivo
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido. Use JPG, PNG, WebP ou GIF")
    
    # Gerar nome único
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    new_filename = f"{reward_id}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = REWARD_IMAGES_DIR / new_filename
    
    # Salvar arquivo
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Atualizar recompensa
    image_url = f"/uploads/reward_images/{new_filename}"
    await db.rewards.update_one(
        {"id": reward_id},
        {"$set": {"image_url": image_url}}
    )
    
    return {
        "message": "Imagem enviada com sucesso",
        "image_url": image_url
    }

@router.post("/redeem/{reward_id}")
async def redeem_reward(reward_id: str, current_user: dict = Depends(get_current_user)):
    reward = await db.rewards.find_one({"id": reward_id}, {"_id": 0})
    if not reward or not reward.get("active", False):
        raise HTTPException(status_code=404, detail="Recompensa não encontrada ou inativa")
    
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if user["points"] < reward["required_points"]:
        raise HTTPException(status_code=400, detail="Pontos insuficientes")
    
    existing_redemption = await db.reward_redemptions.find_one({
        "user_id": current_user["sub"],
        "reward_id": reward_id,
        "status": {"$in": ["pending", "approved"]}
    })
    
    if existing_redemption:
        raise HTTPException(status_code=400, detail="Você já possui uma solicitação pendente para esta recompensa")
    
    redemption = RewardRedemption(
        user_id=current_user["sub"],
        reward_id=reward_id
    )
    
    await db.reward_redemptions.insert_one(redemption.model_dump())
    
    return {"message": "Solicitação de resgate enviada com sucesso", "redemption": redemption}

@router.get("/redemptions")
async def get_redemptions(current_user: dict = Depends(require_role(["admin", "supervisor"]))):
    redemptions = await db.reward_redemptions.find({}, {"_id": 0}).to_list(1000)
    
    for redemption in redemptions:
        user = await db.users.find_one({"id": redemption["user_id"]}, {"_id": 0, "password_hash": 0})
        reward = await db.rewards.find_one({"id": redemption["reward_id"]}, {"_id": 0})
        redemption["user"] = user
        redemption["reward"] = reward
    
    return redemptions

@router.get("/my-redemptions")
async def get_my_redemptions(current_user: dict = Depends(get_current_user)):
    redemptions = await db.reward_redemptions.find({"user_id": current_user["sub"]}, {"_id": 0}).to_list(1000)
    
    for redemption in redemptions:
        reward = await db.rewards.find_one({"id": redemption["reward_id"]}, {"_id": 0})
        redemption["reward"] = reward
    
    return redemptions

@router.put("/redemptions/{redemption_id}/approve")
async def approve_redemption(redemption_id: str, current_user: dict = Depends(require_role(["admin"]))):
    redemption = await db.reward_redemptions.find_one({"id": redemption_id}, {"_id": 0})
    if not redemption:
        raise HTTPException(status_code=404, detail="Resgate não encontrado")
    
    await db.reward_redemptions.update_one(
        {"id": redemption_id},
        {"$set": {
            "status": "approved",
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": current_user["sub"]
        }}
    )
    
    return {"message": "Resgate aprovado com sucesso"}

@router.put("/redemptions/{redemption_id}/reject")
async def reject_redemption(redemption_id: str, current_user: dict = Depends(require_role(["admin"]))):
    redemption = await db.reward_redemptions.find_one({"id": redemption_id}, {"_id": 0})
    if not redemption:
        raise HTTPException(status_code=404, detail="Resgate não encontrado")
    
    await db.reward_redemptions.update_one(
        {"id": redemption_id},
        {"$set": {
            "status": "rejected",
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": current_user["sub"]
        }}
    )
    
    return {"message": "Resgate rejeitado"}

@router.put("/redemptions/{redemption_id}/ship")
async def mark_shipped(redemption_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """Marca a recompensa como enviada"""
    redemption = await db.reward_redemptions.find_one({"id": redemption_id}, {"_id": 0})
    if not redemption:
        raise HTTPException(status_code=404, detail="Resgate não encontrado")
    
    if redemption["status"] != "approved":
        raise HTTPException(status_code=400, detail="Resgate precisa estar aprovado para ser enviado")
    
    await db.reward_redemptions.update_one(
        {"id": redemption_id},
        {"$set": {
            "status": "shipped",
            "shipped_at": datetime.now(timezone.utc).isoformat(),
            "shipped_by": current_user["sub"]
        }}
    )
    
    return {"message": "Recompensa marcada como enviada"}

@router.put("/redemptions/{redemption_id}/deliver")
async def mark_delivered(redemption_id: str, current_user: dict = Depends(require_role(["admin"]))):
    redemption = await db.reward_redemptions.find_one({"id": redemption_id}, {"_id": 0})
    if not redemption:
        raise HTTPException(status_code=404, detail="Resgate não encontrado")
    
    if redemption["status"] not in ["approved", "shipped"]:
        raise HTTPException(status_code=400, detail="Resgate precisa estar aprovado ou enviado")
    
    await db.reward_redemptions.update_one(
        {"id": redemption_id},
        {"$set": {
            "status": "delivered",
            "delivered_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Recompensa marcada como entregue"}