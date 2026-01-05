from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from models import Reward, RewardCreate, RewardRedemption
from auth import get_current_user, require_role
import os
from datetime import datetime, timezone

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/rewards", tags=["rewards"])

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
async def get_redemptions(current_user: dict = Depends(require_role(["admin"]))):
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

@router.put("/redemptions/{redemption_id}/deliver")
async def mark_delivered(redemption_id: str, current_user: dict = Depends(require_role(["admin"]))):
    redemption = await db.reward_redemptions.find_one({"id": redemption_id}, {"_id": 0})
    if not redemption:
        raise HTTPException(status_code=404, detail="Resgate não encontrado")
    
    if redemption["status"] != "approved":
        raise HTTPException(status_code=400, detail="Resgate precisa estar aprovado")
    
    await db.reward_redemptions.update_one(
        {"id": redemption_id},
        {"$set": {
            "status": "delivered",
            "delivered_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Recompensa marcada como entregue"}