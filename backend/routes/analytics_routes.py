from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user, require_role
from datetime import datetime, timedelta
from typing import Optional
import os

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/analytics", tags=["analytics"])

# ==================== ANALYTICS PARA SUPERVISORES ====================

@router.get("/supervisor/overview")
async def get_supervisor_overview(current_user: dict = Depends(require_role(["supervisor", "admin"]))):
    """Visão geral do supervisor - métricas dos licenciados supervisionados"""
    
    supervisor_id = current_user["sub"]
    
    # Para admin, mostrar todos os licenciados
    if current_user.get("role") == "admin":
        licensees = await db.users.find({"role": "licenciado"}, {"_id": 0}).to_list(1000)
    else:
        # Para supervisor, apenas seus licenciados
        licensees = await db.users.find({"supervisor_id": supervisor_id, "role": "licenciado"}, {"_id": 0}).to_list(1000)
    
    licensee_ids = [l["id"] for l in licensees]
    
    # Total de módulos
    total_modules = await db.modules.count_documents({})
    
    # Progresso dos licenciados
    progress_data = await db.user_progress.find(
        {"user_id": {"$in": licensee_ids}, "completed": True},
        {"_id": 0}
    ).to_list(10000)
    
    # Calcular métricas
    total_completions = len(progress_data)
    active_licensees = len(set(p["user_id"] for p in progress_data))
    
    # Avaliações
    assessments = await db.user_assessments.find(
        {"user_id": {"$in": licensee_ids}},
        {"_id": 0}
    ).to_list(10000)
    
    passed_assessments = sum(1 for a in assessments if a.get("passed"))
    total_assessments = len(assessments)
    avg_score = sum(a.get("score", 0) for a in assessments) / max(total_assessments, 1)
    
    # Certificados emitidos
    certificates = await db.certificates.count_documents({"user_id": {"$in": licensee_ids}})
    
    # Acessos últimos 7 dias
    seven_days_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    recent_accesses = await db.user_access.count_documents({
        "user_id": {"$in": licensee_ids},
        "date": {"$gte": seven_days_ago}
    })
    
    return {
        "total_licensees": len(licensees),
        "active_licensees": active_licensees,
        "total_modules": total_modules,
        "total_completions": total_completions,
        "certificates_issued": certificates,
        "assessments": {
            "total": total_assessments,
            "passed": passed_assessments,
            "average_score": round(avg_score, 1)
        },
        "recent_accesses_7d": recent_accesses
    }


@router.get("/supervisor/licensees-progress")
async def get_licensees_progress(current_user: dict = Depends(require_role(["supervisor", "admin"]))):
    """Progresso detalhado de cada licenciado"""
    
    supervisor_id = current_user["sub"]
    
    if current_user.get("role") == "admin":
        licensees = await db.users.find({"role": "licenciado"}, {"_id": 0}).to_list(1000)
    else:
        licensees = await db.users.find({"supervisor_id": supervisor_id, "role": "licenciado"}, {"_id": 0}).to_list(1000)
    
    modules = await db.modules.find({}, {"_id": 0}).to_list(100)
    module_map = {m["id"]: m for m in modules}
    
    result = []
    
    for licensee in licensees:
        user_id = licensee["id"]
        
        # Progresso por módulo
        progress = await db.user_progress.find(
            {"user_id": user_id, "completed": True},
            {"_id": 0}
        ).to_list(1000)
        
        completed_chapters = len(progress)
        
        # Módulos completos (todos capítulos completos)
        module_progress = {}
        for p in progress:
            mid = p.get("module_id")
            if mid:
                if mid not in module_progress:
                    module_progress[mid] = 0
                module_progress[mid] += 1
        
        # Contar capítulos por módulo
        chapters_per_module = {}
        chapters = await db.chapters.find({}, {"_id": 0, "module_id": 1}).to_list(1000)
        for c in chapters:
            mid = c.get("module_id")
            if mid not in chapters_per_module:
                chapters_per_module[mid] = 0
            chapters_per_module[mid] += 1
        
        completed_modules = sum(
            1 for mid, count in module_progress.items()
            if chapters_per_module.get(mid, 0) > 0 and count >= chapters_per_module.get(mid, 0)
        )
        
        # Último acesso
        last_access = await db.user_access.find_one(
            {"user_id": user_id},
            {"_id": 0},
            sort=[("accessed_at", -1)]
        )
        
        # Streak
        streak = await db.user_streaks.find_one({"user_id": user_id}, {"_id": 0})
        
        # Certificados
        certs = await db.certificates.count_documents({"user_id": user_id})
        
        result.append({
            "id": user_id,
            "full_name": licensee.get("full_name", ""),
            "email": licensee.get("email", ""),
            "points": licensee.get("points", 0),
            "level_title": licensee.get("level_title", "Iniciante"),
            "completed_modules": completed_modules,
            "total_modules": len(modules),
            "completed_chapters": completed_chapters,
            "certificates": certs,
            "current_streak": streak.get("current_streak", 0) if streak else 0,
            "last_access": last_access.get("accessed_at") if last_access else None,
            "profile_picture": licensee.get("profile_picture")
        })
    
    # Ordenar por pontos
    result.sort(key=lambda x: x["points"], reverse=True)
    
    return result


@router.get("/supervisor/module-engagement")
async def get_module_engagement(current_user: dict = Depends(require_role(["supervisor", "admin"]))):
    """Engajamento por módulo - % conclusão, avaliações, tempo"""
    
    supervisor_id = current_user["sub"]
    
    if current_user.get("role") == "admin":
        licensees = await db.users.find({"role": "licenciado"}, {"_id": 0, "id": 1}).to_list(1000)
    else:
        licensees = await db.users.find({"supervisor_id": supervisor_id, "role": "licenciado"}, {"_id": 0, "id": 1}).to_list(1000)
    
    licensee_ids = [l["id"] for l in licensees]
    total_licensees = len(licensee_ids)
    
    if total_licensees == 0:
        return []
    
    modules = await db.modules.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    chapters = await db.chapters.find({}, {"_id": 0}).to_list(1000)
    
    # Agrupar capítulos por módulo
    chapters_by_module = {}
    for c in chapters:
        mid = c.get("module_id")
        if mid not in chapters_by_module:
            chapters_by_module[mid] = []
        chapters_by_module[mid].append(c)
    
    result = []
    
    for module in modules:
        module_id = module["id"]
        module_chapters = chapters_by_module.get(module_id, [])
        total_chapters = len(module_chapters)
        
        if total_chapters == 0:
            continue
        
        # Progresso dos licenciados neste módulo
        progress = await db.user_progress.find(
            {"user_id": {"$in": licensee_ids}, "module_id": module_id, "completed": True},
            {"_id": 0}
        ).to_list(10000)
        
        # Usuários que iniciaram o módulo
        users_started = len(set(p["user_id"] for p in progress))
        
        # Usuários que completaram (todos capítulos)
        user_chapter_count = {}
        for p in progress:
            uid = p["user_id"]
            if uid not in user_chapter_count:
                user_chapter_count[uid] = 0
            user_chapter_count[uid] += 1
        
        users_completed = sum(1 for count in user_chapter_count.values() if count >= total_chapters)
        
        # Avaliações do módulo
        assessment = await db.assessments.find_one({"module_id": module_id}, {"_id": 0})
        assessment_stats = {"total": 0, "passed": 0, "avg_score": 0}
        
        if assessment:
            user_assessments = await db.user_assessments.find(
                {"assessment_id": assessment["id"], "user_id": {"$in": licensee_ids}},
                {"_id": 0}
            ).to_list(1000)
            
            assessment_stats["total"] = len(user_assessments)
            assessment_stats["passed"] = sum(1 for a in user_assessments if a.get("passed"))
            if user_assessments:
                assessment_stats["avg_score"] = round(
                    sum(a.get("score", 0) for a in user_assessments) / len(user_assessments), 1
                )
        
        # Certificados do módulo
        certs = await db.certificates.count_documents({
            "module_id": module_id,
            "user_id": {"$in": licensee_ids}
        })
        
        result.append({
            "id": module_id,
            "title": module.get("title", ""),
            "order": module.get("order", 0),
            "total_chapters": total_chapters,
            "users_started": users_started,
            "users_completed": users_completed,
            "completion_rate": round((users_completed / total_licensees) * 100, 1),
            "start_rate": round((users_started / total_licensees) * 100, 1),
            "assessment": assessment_stats,
            "certificates_issued": certs,
            "has_certificate": module.get("has_certificate", False),
            "has_assessment": module.get("has_assessment", False)
        })
    
    return result


@router.get("/supervisor/study-heatmap")
async def get_study_heatmap(
    days: int = 30,
    current_user: dict = Depends(require_role(["supervisor", "admin"]))
):
    """Heatmap de horários de estudo (últimos N dias)"""
    
    supervisor_id = current_user["sub"]
    
    if current_user.get("role") == "admin":
        licensees = await db.users.find({"role": "licenciado"}, {"_id": 0, "id": 1}).to_list(1000)
    else:
        licensees = await db.users.find({"supervisor_id": supervisor_id, "role": "licenciado"}, {"_id": 0, "id": 1}).to_list(1000)
    
    licensee_ids = [l["id"] for l in licensees]
    
    start_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    # Buscar acessos
    accesses = await db.user_access.find(
        {"user_id": {"$in": licensee_ids}, "accessed_at": {"$gte": start_date}},
        {"_id": 0}
    ).to_list(100000)
    
    # Criar matriz de heatmap (dia da semana x hora)
    heatmap = {}
    for day in range(7):  # 0=Segunda, 6=Domingo
        heatmap[day] = {hour: 0 for hour in range(24)}
    
    for access in accesses:
        try:
            dt = datetime.fromisoformat(access["accessed_at"].replace("Z", "+00:00"))
            day_of_week = dt.weekday()
            hour = dt.hour
            heatmap[day_of_week][hour] += 1
        except:
            pass
    
    # Converter para lista
    days_names = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
    result = []
    
    for day in range(7):
        for hour in range(24):
            result.append({
                "day": day,
                "day_name": days_names[day],
                "hour": hour,
                "count": heatmap[day][hour]
            })
    
    return result


@router.get("/supervisor/daily-activity")
async def get_daily_activity(
    days: int = 30,
    current_user: dict = Depends(require_role(["supervisor", "admin"]))
):
    """Atividade diária dos últimos N dias"""
    
    supervisor_id = current_user["sub"]
    
    if current_user.get("role") == "admin":
        licensees = await db.users.find({"role": "licenciado"}, {"_id": 0, "id": 1}).to_list(1000)
    else:
        licensees = await db.users.find({"supervisor_id": supervisor_id, "role": "licenciado"}, {"_id": 0, "id": 1}).to_list(1000)
    
    licensee_ids = [l["id"] for l in licensees]
    
    result = []
    
    for i in range(days):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        
        # Acessos únicos
        accesses = await db.user_access.distinct("user_id", {
            "user_id": {"$in": licensee_ids},
            "date": date
        })
        
        # Capítulos completados
        completions = await db.user_progress.count_documents({
            "user_id": {"$in": licensee_ids},
            "completed": True,
            "completed_at": {"$regex": f"^{date}"}
        })
        
        result.append({
            "date": date,
            "active_users": len(accesses),
            "chapters_completed": completions
        })
    
    result.reverse()  # Ordem cronológica
    return result


@router.get("/supervisor/ranking")
async def get_supervisor_ranking(
    limit: int = 20,
    current_user: dict = Depends(require_role(["supervisor", "admin"]))
):
    """Ranking dos licenciados por pontos"""
    
    supervisor_id = current_user["sub"]
    
    if current_user.get("role") == "admin":
        query = {"role": "licenciado"}
    else:
        query = {"supervisor_id": supervisor_id, "role": "licenciado"}
    
    licensees = await db.users.find(
        query,
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "points": 1, "level_title": 1, "profile_picture": 1}
    ).sort("points", -1).limit(limit).to_list(limit)
    
    # Adicionar posição e badges
    result = []
    for i, licensee in enumerate(licensees):
        badges = await db.user_badges.find(
            {"user_id": licensee["id"]},
            {"_id": 0, "badge_id": 1}
        ).to_list(100)
        
        result.append({
            **licensee,
            "position": i + 1,
            "badges_count": len(badges)
        })
    
    return result


@router.get("/export/csv")
async def export_analytics_csv(
    report_type: str = "licensees",
    current_user: dict = Depends(require_role(["supervisor", "admin"]))
):
    """Exportar relatório em formato CSV"""
    import csv
    from io import StringIO
    from fastapi.responses import StreamingResponse
    
    supervisor_id = current_user["sub"]
    
    if current_user.get("role") == "admin":
        licensees = await db.users.find({"role": "licenciado"}, {"_id": 0}).to_list(1000)
    else:
        licensees = await db.users.find({"supervisor_id": supervisor_id, "role": "licenciado"}, {"_id": 0}).to_list(1000)
    
    output = StringIO()
    
    if report_type == "licensees":
        writer = csv.writer(output)
        writer.writerow(["Nome", "Email", "Pontos", "Nível", "Data Cadastro"])
        
        for l in licensees:
            writer.writerow([
                l.get("full_name", ""),
                l.get("email", ""),
                l.get("points", 0),
                l.get("level_title", ""),
                l.get("created_at", "")[:10]
            ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=relatorio_{report_type}_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


# ==================== DASHBOARD AVANÇADO DO SUPERVISOR ====================

@router.get("/supervisor/advanced-dashboard")
async def get_advanced_dashboard(current_user: dict = Depends(require_role(["supervisor", "admin"]))):
    """Dashboard avançado com visão detalhada da equipe"""
    
    supervisor_id = current_user["sub"]
    
    if current_user.get("role") == "admin":
        licensees = await db.users.find({"role": "licenciado"}, {"_id": 0}).to_list(1000)
    else:
        licensees = await db.users.find({"supervisor_id": supervisor_id, "role": "licenciado"}, {"_id": 0}).to_list(1000)
    
    licensee_ids = [l["id"] for l in licensees]
    total_modules = await db.modules.count_documents({})
    
    # Calcular dias desde último acesso para cada licenciado
    now = datetime.now()
    
    delayed_users = []  # Atrasados (mais de 7 dias sem acessar)
    inactive_users = []  # Inativos (nunca acessaram ou mais de 30 dias)
    active_users = []  # Ativos
    
    for licensee in licensees:
        user_id = licensee["id"]
        
        # Último acesso
        last_access = await db.user_accesses.find_one(
            {"user_id": user_id},
            {"_id": 0},
            sort=[("accessed_at", -1)]
        )
        
        # Progresso
        progress = await db.user_progress.find(
            {"user_id": user_id, "completed": True},
            {"_id": 0, "module_id": 1, "chapter_id": 1}
        ).to_list(1000)
        
        # Contar módulos completos
        module_progress = {}
        for p in progress:
            mid = p.get("module_id")
            if mid:
                if mid not in module_progress:
                    module_progress[mid] = 0
                module_progress[mid] += 1
        
        # Contar capítulos por módulo
        chapters = await db.chapters.find({}, {"_id": 0, "module_id": 1}).to_list(1000)
        chapters_per_module = {}
        for c in chapters:
            mid = c.get("module_id")
            if mid not in chapters_per_module:
                chapters_per_module[mid] = 0
            chapters_per_module[mid] += 1
        
        completed_modules = sum(
            1 for mid, count in module_progress.items()
            if chapters_per_module.get(mid, 0) > 0 and count >= chapters_per_module.get(mid, 0)
        )
        
        total_chapters = sum(chapters_per_module.values())
        completed_chapters = len(progress)
        
        # Calcular previsão de conclusão
        completion_percentage = (completed_chapters / max(total_chapters, 1)) * 100
        
        # Calcular dias desde último acesso
        days_since_access = None
        last_access_str = None
        if last_access:
            try:
                last_dt = datetime.fromisoformat(last_access["accessed_at"].replace("Z", "+00:00").replace("+00:00", ""))
                days_since_access = (now - last_dt).days
                last_access_str = last_access["accessed_at"]
            except:
                days_since_access = 999
        else:
            days_since_access = 999
        
        # Estimativa de conclusão baseada no ritmo
        estimated_completion = None
        if completed_chapters > 0 and total_chapters > completed_chapters:
            # Calcular dias desde criação
            try:
                created_dt = datetime.fromisoformat(licensee.get("created_at", now.isoformat()).replace("Z", "+00:00").replace("+00:00", ""))
                days_active = max((now - created_dt).days, 1)
                chapters_per_day = completed_chapters / days_active
                remaining_chapters = total_chapters - completed_chapters
                if chapters_per_day > 0:
                    days_to_complete = remaining_chapters / chapters_per_day
                    estimated_completion = (now + timedelta(days=int(days_to_complete))).strftime("%Y-%m-%d")
            except:
                pass
        elif completed_chapters >= total_chapters:
            estimated_completion = "Concluído"
        
        user_data = {
            "id": user_id,
            "full_name": licensee.get("full_name", ""),
            "email": licensee.get("email", ""),
            "phone": licensee.get("phone"),
            "profile_picture": licensee.get("profile_picture"),
            "points": licensee.get("points", 0),
            "level_title": licensee.get("level_title", "Iniciante"),
            "current_stage": licensee.get("current_stage", "registro"),
            "completed_modules": completed_modules,
            "total_modules": total_modules,
            "completed_chapters": completed_chapters,
            "total_chapters": total_chapters,
            "completion_percentage": round(completion_percentage, 1),
            "days_since_access": days_since_access,
            "last_access": last_access_str,
            "estimated_completion": estimated_completion,
            "created_at": licensee.get("created_at")
        }
        
        # Classificar usuário
        if days_since_access >= 30 or days_since_access == 999:
            inactive_users.append(user_data)
        elif days_since_access >= 7:
            delayed_users.append(user_data)
        else:
            active_users.append(user_data)
    
    # Ordenar listas
    delayed_users.sort(key=lambda x: x["days_since_access"], reverse=True)
    inactive_users.sort(key=lambda x: x["days_since_access"], reverse=True)
    active_users.sort(key=lambda x: x["completion_percentage"], reverse=True)
    
    # Estatísticas gerais
    total_licensees = len(licensees)
    avg_completion = sum(l["completion_percentage"] for l in licensees) / max(total_licensees, 1) if licensees else 0
    
    return {
        "summary": {
            "total_licensees": total_licensees,
            "active_count": len(active_users),
            "delayed_count": len(delayed_users),
            "inactive_count": len(inactive_users),
            "avg_completion_percentage": round(avg_completion, 1)
        },
        "active_users": active_users[:20],  # Top 20 ativos
        "delayed_users": delayed_users,      # Todos atrasados
        "inactive_users": inactive_users     # Todos inativos
    }


@router.get("/supervisor/licensee-detail/{user_id}")
async def get_licensee_detail(
    user_id: str,
    current_user: dict = Depends(require_role(["supervisor", "admin"]))
):
    """Detalhes completos de um licenciado específico"""
    
    supervisor_id = current_user["sub"]
    
    # Verificar permissão
    licensee = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    if not licensee:
        raise HTTPException(status_code=404, detail="Licenciado não encontrado")
    
    if current_user.get("role") != "admin" and licensee.get("supervisor_id") != supervisor_id:
        raise HTTPException(status_code=403, detail="Sem permissão para visualizar este licenciado")
    
    # Progresso detalhado por módulo
    modules = await db.modules.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    chapters = await db.chapters.find({}, {"_id": 0}).to_list(1000)
    
    chapters_by_module = {}
    for c in chapters:
        mid = c.get("module_id")
        if mid not in chapters_by_module:
            chapters_by_module[mid] = []
        chapters_by_module[mid].append(c)
    
    # Progresso do usuário
    user_progress = await db.user_progress.find(
        {"user_id": user_id, "completed": True},
        {"_id": 0}
    ).to_list(1000)
    
    completed_chapters = set(p["chapter_id"] for p in user_progress)
    
    module_details = []
    for module in modules:
        module_id = module["id"]
        module_chapters = chapters_by_module.get(module_id, [])
        
        completed_in_module = sum(1 for c in module_chapters if c["id"] in completed_chapters)
        total_in_module = len(module_chapters)
        
        # Avaliação do módulo
        assessment = await db.assessments.find_one({"module_id": module_id}, {"_id": 0})
        assessment_result = None
        if assessment:
            user_assessment = await db.user_assessments.find_one(
                {"assessment_id": assessment["id"], "user_id": user_id},
                {"_id": 0}
            )
            if user_assessment:
                assessment_result = {
                    "score": user_assessment.get("score", 0),
                    "passed": user_assessment.get("passed", False),
                    "completed_at": user_assessment.get("completed_at")
                }
        
        # Certificado
        certificate = await db.certificates.find_one(
            {"module_id": module_id, "user_id": user_id},
            {"_id": 0}
        )
        
        module_details.append({
            "id": module_id,
            "title": module.get("title", ""),
            "order": module.get("order", 0),
            "completed_chapters": completed_in_module,
            "total_chapters": total_in_module,
            "completion_percentage": round((completed_in_module / max(total_in_module, 1)) * 100, 1),
            "is_completed": completed_in_module >= total_in_module and total_in_module > 0,
            "assessment": assessment_result,
            "has_assessment": module.get("has_assessment", False),
            "certificate": certificate,
            "has_certificate": module.get("has_certificate", False)
        })
    
    # Histórico de acessos (últimos 30 dias)
    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    access_history = await db.user_accesses.find(
        {"user_id": user_id, "date": {"$gte": thirty_days_ago}},
        {"_id": 0}
    ).sort("date", -1).to_list(30)
    
    # Badges conquistados
    user_badges = await db.user_badges.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    badges = []
    for ub in user_badges:
        badge = await db.badges.find_one({"id": ub["badge_id"]}, {"_id": 0})
        if badge:
            badges.append({
                **badge,
                "earned_at": ub.get("earned_at")
            })
    
    # Desafios ativos
    active_challenges = await db.weekly_challenges.find(
        {"active": True},
        {"_id": 0}
    ).to_list(100)
    
    challenge_progress = []
    for challenge in active_challenges:
        user_challenge = await db.user_challenge_progress.find_one(
            {"challenge_id": challenge["id"], "user_id": user_id},
            {"_id": 0}
        )
        challenge_progress.append({
            "title": challenge.get("title"),
            "target": challenge.get("target_value", 0),
            "current": user_challenge.get("current_progress", 0) if user_challenge else 0,
            "completed": user_challenge.get("completed", False) if user_challenge else False
        })
    
    return {
        "user": licensee,
        "modules": module_details,
        "access_history": access_history,
        "badges": badges,
        "challenges": challenge_progress,
        "stats": {
            "total_completed_chapters": len(completed_chapters),
            "total_chapters": sum(len(chapters_by_module.get(m["id"], [])) for m in modules),
            "badges_earned": len(badges),
            "certificates_earned": sum(1 for m in module_details if m["certificate"])
        }
    }

