from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from models import Campaign, CampaignCreate, CampaignProgress
from auth import get_current_user, require_role
from datetime import datetime
import os
import calendar

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

# ==================== ADMIN: CRUD CAMPANHAS ====================

@router.post("/")
async def create_campaign(
    campaign: CampaignCreate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Criar nova campanha"""
    new_campaign = Campaign(
        **campaign.model_dump(),
        created_by=current_user["sub"]
    )
    
    await db.campaigns.insert_one(new_campaign.model_dump())
    
    return {
        "message": "Campanha criada com sucesso",
        "campaign": new_campaign.model_dump()
    }

@router.get("/")
async def list_campaigns(
    current_user: dict = Depends(get_current_user)
):
    """Listar todas as campanhas"""
    campaigns = await db.campaigns.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return campaigns

@router.get("/active")
async def list_active_campaigns(
    current_user: dict = Depends(get_current_user)
):
    """Listar campanhas ativas dentro do período"""
    now = datetime.now().isoformat()
    
    campaigns = await db.campaigns.find(
        {
            "is_active": True,
            "start_date": {"$lte": now},
            "end_date": {"$gte": now}
        },
        {"_id": 0}
    ).sort("end_date", 1).to_list(100)
    
    # Para cada campanha, calcular o progresso do usuário atual (se for licenciado)
    if current_user.get("role") == "licenciado":
        for campaign in campaigns:
            progress = await calculate_user_campaign_progress(
                current_user["sub"], 
                campaign
            )
            campaign["user_progress"] = progress
    
    return campaigns

@router.get("/{campaign_id}")
async def get_campaign(
    campaign_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Buscar campanha específica"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    
    return campaign

@router.put("/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    updates: dict,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Atualizar campanha"""
    campaign = await db.campaigns.find_one({"id": campaign_id})
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    
    # Campos permitidos
    allowed_fields = [
        "name", "description", "period_type", "metric_type", 
        "target_value", "reward_description", "start_date", 
        "end_date", "is_active", "icon", "color"
    ]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now().isoformat()
    
    await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": update_data}
    )
    
    return {"message": "Campanha atualizada"}

@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Excluir campanha"""
    campaign = await db.campaigns.find_one({"id": campaign_id})
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    
    await db.campaigns.delete_one({"id": campaign_id})
    
    # Remover progressos relacionados
    await db.campaign_progress.delete_many({"campaign_id": campaign_id})
    
    return {"message": "Campanha excluída"}

# ==================== PROGRESSO DO USUÁRIO ====================

async def calculate_user_campaign_progress(user_id: str, campaign: dict) -> dict:
    """Calcular o progresso do usuário em uma campanha"""
    metric_type = campaign.get("metric_type")
    target_value = campaign.get("target_value", 0)
    current_value = 0
    
    now = datetime.now()
    
    if metric_type == "frequency":
        # Buscar frequência de apresentações do usuário
        # Dependendo do período, buscar do mês atual, trimestre, etc.
        freq = await db.presentation_frequency.find_one(
            {"user_id": user_id, "year": now.year, "month": now.month},
            {"_id": 0}
        )
        if freq:
            current_value = freq.get("frequency_percentage", 0)
        else:
            current_value = 0  # Sem apresentações = 0%
    
    elif metric_type == "average_score":
        # Buscar média das avaliações
        user_assessments = await db.user_assessments.find(
            {"user_id": user_id},
            {"_id": 0, "score": 1}
        ).to_list(1000)
        
        if len(user_assessments) > 0:
            total_score = sum(a["score"] for a in user_assessments)
            current_value = round(total_score / len(user_assessments), 2)
    
    elif metric_type == "points":
        # Buscar pontos do usuário
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "points": 1})
        if user:
            current_value = user.get("points", 0)
    
    # Calcular porcentagem de progresso
    progress_percentage = min(100, (current_value / target_value * 100)) if target_value > 0 else 0
    achieved = current_value >= target_value
    
    return {
        "current_value": current_value,
        "target_value": target_value,
        "progress_percentage": round(progress_percentage, 1),
        "achieved": achieved
    }

@router.get("/progress/me")
async def get_my_campaign_progress(
    current_user: dict = Depends(get_current_user)
):
    """Retorna o progresso do usuário em todas as campanhas ativas"""
    now = datetime.now().isoformat()
    
    campaigns = await db.campaigns.find(
        {
            "is_active": True,
            "start_date": {"$lte": now},
            "end_date": {"$gte": now}
        },
        {"_id": 0}
    ).to_list(100)
    
    results = []
    for campaign in campaigns:
        progress = await calculate_user_campaign_progress(
            current_user["sub"], 
            campaign
        )
        results.append({
            **campaign,
            "user_progress": progress
        })
    
    return results

@router.get("/leaderboard/{campaign_id}")
async def get_campaign_leaderboard(
    campaign_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Retorna o ranking dos usuários em uma campanha específica"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    
    # Buscar todos os licenciados
    licensees = await db.users.find(
        {"role": "licenciado"},
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "profile_picture": 1}
    ).to_list(1000)
    
    leaderboard = []
    for user in licensees:
        progress = await calculate_user_campaign_progress(user["id"], campaign)
        leaderboard.append({
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "profile_picture": user.get("profile_picture"),
            **progress
        })
    
    # Ordenar por progresso (maior para menor)
    leaderboard.sort(key=lambda x: x["current_value"], reverse=True)
    
    # Adicionar rank
    for idx, entry in enumerate(leaderboard):
        entry["rank"] = idx + 1
    
    return {
        "campaign": campaign,
        "leaderboard": leaderboard
    }
