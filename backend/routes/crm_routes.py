"""
Rotas do CRM de Prospects
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from auth import get_current_user, require_role
from models_crm import (
    Lead, LeadActivity, LeadTask, LeadStatus, LeadOrigin, LeadPriority,
    CreateLeadRequest, UpdateLeadRequest, MoveLeadRequest,
    CreateTaskRequest, CreateActivityRequest, PipelineStats
)
import logging
import os

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/crm", tags=["CRM"])


# ==================== LEADS ====================

@router.get("/leads")
async def get_leads(
    status: Optional[str] = None,
    origin: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Lista todos os leads do usuário"""
    user_id = current_user["sub"]
    
    # Filtro base
    query = {"user_id": user_id}
    
    # Filtros opcionais
    if status:
        query["status"] = status
    if origin:
        query["origin"] = origin
    if priority:
        query["priority"] = priority
    
    leads = await db.crm_leads.find(query, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    
    # Filtro de busca por nome/email/telefone
    if search:
        search_lower = search.lower()
        leads = [
            l for l in leads 
            if search_lower in (l.get("name") or "").lower() or
               search_lower in (l.get("email") or "").lower() or
               search_lower in (l.get("phone") or "")
        ]
    
    return leads


@router.get("/leads/pipeline")
async def get_pipeline(
    current_user: dict = Depends(get_current_user)
):
    """Retorna leads organizados por status para o Kanban"""
    user_id = current_user["sub"]
    
    leads = await db.crm_leads.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(1000)
    
    # Organizar por status
    pipeline = {
        "novo": [],
        "contato": [],
        "negociacao": [],
        "ganho": [],
        "perdido": []
    }
    
    # Estatísticas por coluna
    stats = {
        "novo": {"count": 0, "value": 0},
        "contato": {"count": 0, "value": 0},
        "negociacao": {"count": 0, "value": 0},
        "ganho": {"count": 0, "value": 0},
        "perdido": {"count": 0, "value": 0}
    }
    
    for lead in leads:
        status = lead.get("status", "novo")
        if status in pipeline:
            pipeline[status].append(lead)
            stats[status]["count"] += 1
            
            # Valor: usar sale_value se ganho, senão estimated_value
            if status == "ganho":
                stats[status]["value"] += lead.get("sale_value", 0) or 0
            else:
                stats[status]["value"] += lead.get("estimated_value", 0) or 0
    
    return {
        "pipeline": pipeline,
        "stats": stats
    }


@router.get("/leads/stats")
async def get_leads_stats(
    current_user: dict = Depends(get_current_user)
):
    """Estatísticas gerais dos leads"""
    user_id = current_user["sub"]
    
    leads = await db.crm_leads.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Calcular estatísticas
    total = len(leads)
    leads_by_status = {}
    value_by_status = {}
    total_estimated = 0
    total_converted = 0
    
    # Leads e conversões do mês
    now = datetime.now(timezone.utc)
    first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    leads_this_month = 0
    conversions_this_month = 0
    
    for lead in leads:
        status = lead.get("status", "novo")
        
        # Contar por status
        leads_by_status[status] = leads_by_status.get(status, 0) + 1
        
        # Valor por status
        if status == "ganho":
            value = lead.get("sale_value", 0) or 0
            total_converted += value
        else:
            value = lead.get("estimated_value", 0) or 0
        
        value_by_status[status] = value_by_status.get(status, 0) + value
        total_estimated += lead.get("estimated_value", 0) or 0
        
        # Leads do mês
        created_at = lead.get("created_at", "")
        if created_at:
            try:
                lead_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                if lead_date >= first_day_of_month:
                    leads_this_month += 1
            except:
                pass
        
        # Conversões do mês
        if status == "ganho":
            converted_date = lead.get("converted_date", "")
            if converted_date:
                try:
                    conv_date = datetime.fromisoformat(converted_date.replace("Z", "+00:00"))
                    if conv_date >= first_day_of_month:
                        conversions_this_month += 1
                except:
                    pass
    
    # Taxa de conversão
    conversion_rate = 0
    if total > 0:
        converted_count = leads_by_status.get("ganho", 0)
        conversion_rate = round((converted_count / total) * 100, 1)
    
    return {
        "total_leads": total,
        "leads_by_status": leads_by_status,
        "value_by_status": value_by_status,
        "total_estimated_value": total_estimated,
        "total_converted_value": total_converted,
        "conversion_rate": conversion_rate,
        "leads_this_month": leads_this_month,
        "conversions_this_month": conversions_this_month
    }


@router.get("/leads/{lead_id}")
async def get_lead(
    lead_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Busca um lead específico com atividades e tarefas"""
    user_id = current_user["sub"]
    
    lead = await db.crm_leads.find_one(
        {"id": lead_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    # Buscar atividades
    activities = await db.crm_activities.find(
        {"lead_id": lead_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Buscar tarefas
    tasks = await db.crm_tasks.find(
        {"lead_id": lead_id},
        {"_id": 0}
    ).sort("due_date", 1).to_list(100)
    
    return {
        "lead": lead,
        "activities": activities,
        "tasks": tasks
    }


@router.post("/leads")
async def create_lead(
    data: CreateLeadRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cria um novo lead"""
    user_id = current_user["sub"]
    
    lead = Lead(
        user_id=user_id,
        name=data.name,
        email=data.email,
        phone=data.phone,
        cpf=data.cpf,
        city=data.city,
        state=data.state,
        origin=data.origin,
        priority=data.priority or LeadPriority.MEDIA,
        product_interest=data.product_interest,
        estimated_value=data.estimated_value,
        contact_date=data.contact_date,
        next_contact_date=data.next_contact_date,
        notes=data.notes
    )
    
    await db.crm_leads.insert_one(lead.model_dump())
    
    # Registrar atividade de criação
    activity = LeadActivity(
        lead_id=lead.id,
        user_id=user_id,
        activity_type="created",
        description="Lead criado"
    )
    await db.crm_activities.insert_one(activity.model_dump())
    
    logger.info(f"[CRM] Lead criado: {lead.id} por user {user_id}")
    
    return {
        "success": True,
        "message": "Lead criado com sucesso",
        "lead": lead.model_dump()
    }


@router.put("/leads/{lead_id}")
async def update_lead(
    lead_id: str,
    data: UpdateLeadRequest,
    current_user: dict = Depends(get_current_user)
):
    """Atualiza um lead"""
    user_id = current_user["sub"]
    
    lead = await db.crm_leads.find_one(
        {"id": lead_id, "user_id": user_id}
    )
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    # Montar update
    update_data = {"updated_at": datetime.utcnow().isoformat()}
    
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    # Se status mudou, registrar atividade
    if "status" in update_data and update_data["status"] != lead.get("status"):
        old_status = lead.get("status")
        new_status = update_data["status"]
        
        activity = LeadActivity(
            lead_id=lead_id,
            user_id=user_id,
            activity_type="status_change",
            description=f"Status alterado de '{old_status}' para '{new_status}'",
            old_status=old_status,
            new_status=new_status
        )
        await db.crm_activities.insert_one(activity.model_dump())
        
        # Se convertido, registrar data
        if new_status == "ganho":
            update_data["converted_date"] = datetime.utcnow().isoformat()
        # Se perdido, registrar data
        elif new_status == "perdido":
            update_data["lost_date"] = datetime.utcnow().isoformat()
    
    await db.crm_leads.update_one(
        {"id": lead_id},
        {"$set": update_data}
    )
    
    updated_lead = await db.crm_leads.find_one({"id": lead_id}, {"_id": 0})
    
    return {
        "success": True,
        "message": "Lead atualizado com sucesso",
        "lead": updated_lead
    }


@router.put("/leads/{lead_id}/move")
async def move_lead(
    lead_id: str,
    data: MoveLeadRequest,
    current_user: dict = Depends(get_current_user)
):
    """Move lead para outro status no pipeline (drag & drop)"""
    user_id = current_user["sub"]
    
    lead = await db.crm_leads.find_one(
        {"id": lead_id, "user_id": user_id}
    )
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    old_status = lead.get("status")
    new_status = data.new_status.value
    
    update_data = {
        "status": new_status,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    # Se ganho
    if new_status == "ganho":
        update_data["converted_date"] = datetime.utcnow().isoformat()
        if data.sale_value:
            update_data["sale_value"] = data.sale_value
    
    # Se perdido
    if new_status == "perdido":
        update_data["lost_date"] = datetime.utcnow().isoformat()
        if data.lost_reason:
            update_data["lost_reason"] = data.lost_reason
    
    await db.crm_leads.update_one(
        {"id": lead_id},
        {"$set": update_data}
    )
    
    # Registrar atividade
    activity = LeadActivity(
        lead_id=lead_id,
        user_id=user_id,
        activity_type="status_change",
        description=f"Status alterado de '{old_status}' para '{new_status}'",
        old_status=old_status,
        new_status=new_status
    )
    await db.crm_activities.insert_one(activity.model_dump())
    
    return {
        "success": True,
        "message": f"Lead movido para '{new_status}'",
        "old_status": old_status,
        "new_status": new_status
    }


@router.delete("/leads/{lead_id}")
async def delete_lead(
    lead_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Exclui um lead"""
    user_id = current_user["sub"]
    
    result = await db.crm_leads.delete_one(
        {"id": lead_id, "user_id": user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    # Excluir atividades e tarefas relacionadas
    await db.crm_activities.delete_many({"lead_id": lead_id})
    await db.crm_tasks.delete_many({"lead_id": lead_id})
    
    return {"success": True, "message": "Lead excluído com sucesso"}


# ==================== ATIVIDADES ====================

@router.post("/leads/{lead_id}/activities")
async def create_activity(
    lead_id: str,
    data: CreateActivityRequest,
    current_user: dict = Depends(get_current_user)
):
    """Adiciona atividade ao lead"""
    user_id = current_user["sub"]
    
    # Verificar se lead existe
    lead = await db.crm_leads.find_one(
        {"id": lead_id, "user_id": user_id}
    )
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    activity = LeadActivity(
        lead_id=lead_id,
        user_id=user_id,
        activity_type=data.activity_type,
        description=data.description
    )
    
    await db.crm_activities.insert_one(activity.model_dump())
    
    # Atualizar data do lead
    await db.crm_leads.update_one(
        {"id": lead_id},
        {"$set": {"updated_at": datetime.utcnow().isoformat()}}
    )
    
    return {
        "success": True,
        "message": "Atividade registrada",
        "activity": activity.model_dump()
    }


@router.get("/leads/{lead_id}/activities")
async def get_activities(
    lead_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Lista atividades do lead"""
    user_id = current_user["sub"]
    
    # Verificar se lead existe
    lead = await db.crm_leads.find_one(
        {"id": lead_id, "user_id": user_id}
    )
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    activities = await db.crm_activities.find(
        {"lead_id": lead_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return activities


# ==================== TAREFAS ====================

@router.post("/leads/{lead_id}/tasks")
async def create_task(
    lead_id: str,
    data: CreateTaskRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cria tarefa para o lead"""
    user_id = current_user["sub"]
    
    # Verificar se lead existe
    lead = await db.crm_leads.find_one(
        {"id": lead_id, "user_id": user_id}
    )
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    
    task = LeadTask(
        lead_id=lead_id,
        user_id=user_id,
        title=data.title,
        description=data.description,
        due_date=data.due_date
    )
    
    await db.crm_tasks.insert_one(task.model_dump())
    
    # Registrar atividade
    activity = LeadActivity(
        lead_id=lead_id,
        user_id=user_id,
        activity_type="task_created",
        description=f"Tarefa criada: {data.title}"
    )
    await db.crm_activities.insert_one(activity.model_dump())
    
    return {
        "success": True,
        "message": "Tarefa criada",
        "task": task.model_dump()
    }


@router.get("/tasks")
async def get_all_tasks(
    completed: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Lista todas as tarefas do usuário"""
    user_id = current_user["sub"]
    
    query = {"user_id": user_id}
    if completed is not None:
        query["completed"] = completed
    
    tasks = await db.crm_tasks.find(query, {"_id": 0}).sort("due_date", 1).to_list(100)
    
    # Adicionar nome do lead em cada tarefa
    for task in tasks:
        lead = await db.crm_leads.find_one(
            {"id": task["lead_id"]},
            {"_id": 0, "name": 1}
        )
        task["lead_name"] = lead.get("name") if lead else "Lead removido"
    
    return tasks


@router.put("/tasks/{task_id}/complete")
async def complete_task(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Marca tarefa como concluída"""
    user_id = current_user["sub"]
    
    task = await db.crm_tasks.find_one(
        {"id": task_id, "user_id": user_id}
    )
    
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    await db.crm_tasks.update_one(
        {"id": task_id},
        {"$set": {
            "completed": True,
            "completed_at": datetime.utcnow().isoformat()
        }}
    )
    
    # Registrar atividade
    activity = LeadActivity(
        lead_id=task["lead_id"],
        user_id=user_id,
        activity_type="task_completed",
        description=f"Tarefa concluída: {task['title']}"
    )
    await db.crm_activities.insert_one(activity.model_dump())
    
    return {"success": True, "message": "Tarefa concluída"}


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Exclui uma tarefa"""
    user_id = current_user["sub"]
    
    result = await db.crm_tasks.delete_one(
        {"id": task_id, "user_id": user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    return {"success": True, "message": "Tarefa excluída"}


# ==================== DASHBOARD/RELATÓRIOS ====================

@router.get("/dashboard")
async def get_dashboard(
    current_user: dict = Depends(get_current_user)
):
    """Dashboard do CRM com métricas"""
    user_id = current_user["sub"]
    
    leads = await db.crm_leads.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Métricas gerais
    total_leads = len(leads)
    converted = [l for l in leads if l.get("status") == "ganho"]
    lost = [l for l in leads if l.get("status") == "perdido"]
    in_progress = [l for l in leads if l.get("status") not in ["ganho", "perdido"]]
    
    # Valores
    total_converted_value = sum(l.get("sale_value", 0) or 0 for l in converted)
    total_estimated_value = sum(l.get("estimated_value", 0) or 0 for l in in_progress)
    
    # Por período
    now = datetime.now(timezone.utc)
    first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    leads_this_month = 0
    conversions_this_month = 0
    value_this_month = 0
    
    for lead in leads:
        created_at = lead.get("created_at", "")
        if created_at:
            try:
                lead_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                if lead_date >= first_day_of_month:
                    leads_this_month += 1
            except:
                pass
        
        if lead.get("status") == "ganho":
            converted_date = lead.get("converted_date", "")
            if converted_date:
                try:
                    conv_date = datetime.fromisoformat(converted_date.replace("Z", "+00:00"))
                    if conv_date >= first_day_of_month:
                        conversions_this_month += 1
                        value_this_month += lead.get("sale_value", 0) or 0
                except:
                    pass
    
    # Por origem
    by_origin = {}
    for lead in leads:
        origin = lead.get("origin", "outro") or "outro"
        by_origin[origin] = by_origin.get(origin, 0) + 1
    
    # Tarefas pendentes
    pending_tasks = await db.crm_tasks.count_documents({
        "user_id": user_id,
        "completed": False
    })
    
    return {
        "total_leads": total_leads,
        "converted_count": len(converted),
        "lost_count": len(lost),
        "in_progress_count": len(in_progress),
        "total_converted_value": total_converted_value,
        "total_estimated_value": total_estimated_value,
        "conversion_rate": round((len(converted) / total_leads * 100) if total_leads > 0 else 0, 1),
        "leads_this_month": leads_this_month,
        "conversions_this_month": conversions_this_month,
        "value_this_month": value_this_month,
        "by_origin": by_origin,
        "pending_tasks": pending_tasks
    }


@router.get("/reports/monthly")
async def get_monthly_report(
    months: int = 6,
    current_user: dict = Depends(get_current_user)
):
    """Relatório mensal de leads e conversões"""
    user_id = current_user["sub"]
    
    leads = await db.crm_leads.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Últimos N meses
    now = datetime.now(timezone.utc)
    monthly_data = {}
    
    for i in range(months):
        month_date = now - timedelta(days=30*i)
        month_key = month_date.strftime("%Y-%m")
        monthly_data[month_key] = {
            "leads": 0,
            "conversions": 0,
            "value": 0
        }
    
    for lead in leads:
        # Leads criados
        created_at = lead.get("created_at", "")
        if created_at:
            try:
                lead_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                month_key = lead_date.strftime("%Y-%m")
                if month_key in monthly_data:
                    monthly_data[month_key]["leads"] += 1
            except:
                pass
        
        # Conversões
        if lead.get("status") == "ganho":
            converted_date = lead.get("converted_date", "")
            if converted_date:
                try:
                    conv_date = datetime.fromisoformat(converted_date.replace("Z", "+00:00"))
                    month_key = conv_date.strftime("%Y-%m")
                    if month_key in monthly_data:
                        monthly_data[month_key]["conversions"] += 1
                        monthly_data[month_key]["value"] += lead.get("sale_value", 0) or 0
                except:
                    pass
    
    # Converter para lista ordenada
    result = []
    for month_key in sorted(monthly_data.keys()):
        result.append({
            "month": month_key,
            **monthly_data[month_key]
        })
    
    return result
