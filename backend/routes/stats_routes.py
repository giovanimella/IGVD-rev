from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user, require_role
import os
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/leaderboard")
async def get_leaderboard(current_user: dict = Depends(get_current_user)):
    users = await db.users.find(
        {"role": "licenciado"},
        {"_id": 0, "password_hash": 0, "reset_token": 0, "reset_token_expires": 0}
    ).sort("points", -1).limit(100).to_list(100)
    
    return users

@router.get("/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") == "admin":
        total_users = await db.users.count_documents({"role": "licenciado"})
        total_modules = await db.modules.count_documents({})
        total_rewards = await db.rewards.count_documents({"active": True})
        pending_redemptions = await db.reward_redemptions.count_documents({"status": "pending"})
        
        return {
            "total_users": total_users,
            "total_modules": total_modules,
            "total_rewards": total_rewards,
            "pending_redemptions": pending_redemptions
        }
    
    elif current_user.get("role") == "supervisor":
        total_licensees = await db.users.count_documents({"role": "licenciado"})
        total_modules = await db.modules.count_documents({})
        
        licensees = await db.users.find({"role": "licenciado"}, {"_id": 0, "password_hash": 0}).to_list(1000)
        
        for licensee in licensees:
            completed = await db.user_progress.count_documents({
                "user_id": licensee["id"],
                "completed": True
            })
            licensee["completed_chapters"] = completed
        
        return {
            "total_licensees": total_licensees,
            "total_modules": total_modules,
            "licensees": licensees
        }
    
    else:
        user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "password_hash": 0})
        
        total_modules = await db.modules.count_documents({})
        completed_modules_count = 0
        
        modules = await db.modules.find({}, {"_id": 0}).to_list(1000)
        for module in modules:
            total_chapters = await db.chapters.count_documents({"module_id": module["id"]})
            completed_chapters = await db.user_progress.count_documents({
                "user_id": current_user["sub"],
                "module_id": module["id"],
                "completed": True
            })
            if total_chapters > 0 and completed_chapters == total_chapters:
                completed_modules_count += 1
        
        my_rank = await db.users.count_documents({
            "role": "licenciado",
            "points": {"$gt": user.get("points", 0)}
        }) + 1
        
        return {
            "points": user.get("points", 0),
            "level_title": user.get("level_title", "Iniciante"),
            "completed_modules": completed_modules_count,
            "total_modules": total_modules,
            "my_rank": my_rank
        }

@router.get("/recent-activity")
async def get_recent_activity(current_user: dict = Depends(get_current_user)):
    """Retorna atividades recentes do usuário (módulos/capítulos concluídos)"""
    user_id = current_user["sub"]
    
    # Buscar progresso recente (últimos 10)
    recent_progress = await db.user_progress.find(
        {"user_id": user_id, "completed": True},
        {"_id": 0}
    ).sort("completed_at", -1).limit(10).to_list(10)
    
    # Enriquecer com dados dos módulos e capítulos
    for progress in recent_progress:
        module = await db.modules.find_one({"id": progress.get("module_id")}, {"_id": 0})
        chapter = await db.chapters.find_one({"id": progress.get("chapter_id")}, {"_id": 0})
        progress["module_title"] = module.get("title") if module else "Módulo"
        progress["chapter_title"] = chapter.get("title") if chapter else "Capítulo"
    
    return recent_progress

@router.get("/access-history")
async def get_access_history(current_user: dict = Depends(get_current_user)):
    """Retorna histórico de acessos dos últimos 7 dias"""
    user_id = current_user["sub"]
    
    # Calcular últimos 7 dias
    today = datetime.now()
    last_7_days = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(6, -1, -1)]
    
    # Buscar acessos agrupados por dia
    access_stats = []
    for date in last_7_days:
        count = await db.user_accesses.count_documents({
            "user_id": user_id,
            "date": date
        })
        # Formatar data para exibição (dd/MM)
        date_obj = datetime.strptime(date, "%Y-%m-%d")
        day_label = date_obj.strftime("%d/%m")
        
        access_stats.append({
            "date": day_label,
            "count": count
        })
    


@router.get("/admin/growth")
async def get_growth_stats(current_user: dict = Depends(require_role(["admin"]))):
    """
    Retorna dados de crescimento de licenciados e módulos concluídos
    nos últimos 6 meses para o gráfico de linha do dashboard admin
    """
    today = datetime.now()
    months_data = []
    
    # Nomes dos meses em português
    month_names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    
    # Buscar dados dos últimos 6 meses
    for i in range(5, -1, -1):
        # Calcular o mês
        target_date = today - relativedelta(months=i)
        month_start = target_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        if i > 0:
            month_end = (month_start + relativedelta(months=1))
        else:
            month_end = today
        
        month_name = month_names[month_start.month - 1]
        
        # Contar licenciados criados até o final deste mês
        licenciados_count = await db.users.count_documents({
            "role": "licenciado",
            "created_at": {"$lte": month_end.isoformat()}
        })
        
        # Se created_at não existir, contar todos os licenciados existentes
        if licenciados_count == 0:
            licenciados_count = await db.users.count_documents({"role": "licenciado"})
        
        # Contar módulos concluídos (progresso completo) até este mês
        modulos_count = await db.user_progress.count_documents({
            "completed": True,
            "completed_at": {"$lte": month_end.isoformat()}
        })
        
        months_data.append({
            "month": month_name,
            "licenciados": licenciados_count,
            "modulos": modulos_count
        })
    
    return months_data


@router.get("/admin/stage-distribution")
async def get_stage_distribution(current_user: dict = Depends(require_role(["admin"]))):
    """
    Retorna distribuição de licenciados por etapa do onboarding
    para o gráfico de pizza do dashboard admin
    """
    # Contar usuários em cada etapa
    # Etapas: registro, documentos, pagamento, acolhimento, completo
    
    # Total de licenciados
    total = await db.users.count_documents({"role": "licenciado"})
    
    # Contagem por etapa
    registro = await db.users.count_documents({
        "role": "licenciado",
        "onboarding_stage": "registro"
    })
    
    documentos = await db.users.count_documents({
        "role": "licenciado",
        "onboarding_stage": {"$in": ["documentos", "documentos_pf", "documentos_pj"]}
    })
    
    pagamento = await db.users.count_documents({
        "role": "licenciado",
        "onboarding_stage": "pagamento"
    })
    
    acolhimento = await db.users.count_documents({
        "role": "licenciado",
        "onboarding_stage": "acolhimento"
    })
    
    completo = await db.users.count_documents({
        "role": "licenciado",
        "onboarding_stage": "completo"
    })
    
    # Se não houver dados de onboarding_stage, considerar todos como "registro"
    if registro + documentos + pagamento + acolhimento + completo == 0 and total > 0:
        # Verificar usuários sem etapa definida
        sem_etapa = await db.users.count_documents({
            "role": "licenciado",
            "onboarding_stage": {"$exists": False}
        })
        registro = sem_etapa
    
    distribution = [
        {"name": "Registro", "value": registro, "color": "#06b6d4"},
        {"name": "Documentos", "value": documentos, "color": "#8b5cf6"},
        {"name": "Pagamento", "value": pagamento, "color": "#3b82f6"},
        {"name": "Acolhimento", "value": acolhimento, "color": "#f59e0b"},
        {"name": "Completo", "value": completo, "color": "#22c55e"}
    ]
    
    return distribution

    return access_stats