# 📋 GUIA COMPLETO DE ARQUIVOS MODIFICADOS/CRIADOS
## Para Aplicação em Produção

---

## 🔧 ARQUIVOS DO BACKEND

### 1. `/app/backend/routes/stats_routes.py`
**Modificações:** Adicionados 3 novos endpoints de estatísticas para o dashboard admin

**O que foi adicionado:**
- `GET /api/stats/admin/engagement-metrics` - Métricas de engajamento
- `GET /api/stats/admin/financial-metrics` - Métricas financeiras (MRR, churn)
- `GET /api/stats/admin/top-content` - Top conteúdos mais acessados

**Localização:** Adicionar no final do arquivo, antes da última linha

```python
@router.get("/admin/engagement-metrics")
async def get_engagement_metrics(current_user: dict = Depends(require_role(["admin"]))):
    """
    Retorna métricas de engajamento para o dashboard admin:
    - Usuários ativos hoje
    - Usuários ativos na semana
    - Taxa média de conclusão de módulos
    - Tempo médio de onboarding
    """
    from datetime import datetime, timedelta
    
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    week_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    
    # 1. Usuários ativos hoje (que acessaram hoje)
    users_active_today = await db.users.count_documents({
        "role": "licenciado",
        "last_access_at": {"$gte": today}
    })
    
    # 2. Usuários ativos na semana (últimos 7 dias)
    users_active_week = await db.users.count_documents({
        "role": "licenciado",
        "last_access_at": {"$gte": week_ago}
    })
    
    # 3. Taxa média de conclusão de módulos
    total_modules = await db.modules.count_documents({})
    total_licensees = await db.users.count_documents({"role": "licenciado"})
    
    if total_licensees > 0 and total_modules > 0:
        # Calcular quantos módulos cada usuário completou
        pipeline = [
            {
                "$match": {
                    "completed": True
                }
            },
            {
                "$group": {
                    "_id": "$user_id",
                    "completed_count": {"$sum": 1}
                }
            }
        ]
        
        user_completions = await db.user_progress.aggregate(pipeline).to_list(10000)
        
        if user_completions:
            total_completed = sum(u["completed_count"] for u in user_completions)
            avg_completion_rate = (total_completed / (total_licensees * total_modules)) * 100
        else:
            avg_completion_rate = 0
    else:
        avg_completion_rate = 0
    
    # 4. Tempo médio de onboarding (registro → completo)
    pipeline_onboarding = [
        {
            "$match": {
                "role": "licenciado",
                "current_stage": "completo",
                "created_at": {"$exists": True},
                "updated_at": {"$exists": True}
            }
        }
    ]
    
    completed_users = await db.users.find(pipeline_onboarding[0]["$match"]).to_list(10000)
    
    if completed_users:
        total_days = 0
        count = 0
        
        for user in completed_users:
            try:
                created = datetime.fromisoformat(user["created_at"])
                updated = datetime.fromisoformat(user["updated_at"])
                days = (updated - created).days
                if days >= 0:  # Apenas valores válidos
                    total_days += days
                    count += 1
            except:
                continue
        
        avg_onboarding_days = round(total_days / count, 1) if count > 0 else 0
    else:
        avg_onboarding_days = 0
    
    return {
        "users_active_today": users_active_today,
        "users_active_week": users_active_week,
        "avg_module_completion_rate": round(avg_completion_rate, 1),
        "avg_onboarding_days": avg_onboarding_days,
        "total_licensees": total_licensees
    }


@router.get("/admin/financial-metrics")
async def get_financial_metrics(current_user: dict = Depends(require_role(["admin"]))):
    """
    Retorna métricas financeiras para o dashboard admin:
    - MRR (Receita Mensal Recorrente)
    - Taxa de Churn (cancelamentos)
    - Assinaturas próximas do vencimento
    """
    from datetime import datetime, timedelta
    
    now = datetime.now()
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
    next_7_days = (now + timedelta(days=7)).isoformat()
    
    # 1. MRR - Receita Mensal Recorrente (assinaturas ativas)
    active_subscriptions = await db.user_subscriptions.find({
        "status": {"$in": ["active", "trial"]}
    }).to_list(10000)
    
    mrr = sum(sub.get("monthly_amount", 0) for sub in active_subscriptions)
    active_count = len(active_subscriptions)
    
    # 2. Taxa de Churn (cancelamentos deste mês)
    cancelled_this_month = await db.user_subscriptions.count_documents({
        "status": "cancelled",
        "cancelled_at": {"$gte": current_month_start.isoformat()}
    })
    
    # Total de assinaturas ativas no início do mês (ativas agora + canceladas este mês)
    total_start_month = active_count + cancelled_this_month
    
    churn_rate = (cancelled_this_month / total_start_month * 100) if total_start_month > 0 else 0
    
    # 3. Assinaturas próximas do vencimento (próximos 7 dias)
    expiring_soon = await db.user_subscriptions.count_documents({
        "status": {"$in": ["active", "trial"]},
        "next_billing_date": {"$lte": next_7_days, "$gte": now.isoformat()}
    })
    
    # 4. Assinaturas suspensas/atrasadas
    suspended_count = await db.user_subscriptions.count_documents({
        "status": {"$in": ["suspended", "overdue"]}
    })
    
    return {
        "mrr": round(mrr, 2),
        "active_subscriptions": active_count,
        "churn_rate": round(churn_rate, 1),
        "cancelled_this_month": cancelled_this_month,
        "expiring_in_7_days": expiring_soon,
        "suspended_subscriptions": suspended_count
    }


@router.get("/admin/top-content")
async def get_top_content(current_user: dict = Depends(require_role(["admin"]))):
    """
    Retorna os conteúdos mais acessados:
    - Top 10 módulos mais acessados
    - Top 10 capítulos mais visualizados
    """
    
    # Top 10 módulos (por número de capítulos iniciados)
    pipeline_modules = [
        {
            "$group": {
                "_id": "$module_id",
                "access_count": {"$sum": 1},
                "unique_users": {"$addToSet": "$user_id"}
            }
        },
        {
            "$project": {
                "module_id": "$_id",
                "access_count": 1,
                "unique_users_count": {"$size": "$unique_users"}
            }
        },
        {
            "$sort": {"access_count": -1}
        },
        {
            "$limit": 10
        }
    ]
    
    top_modules_raw = await db.user_progress.aggregate(pipeline_modules).to_list(10)
    
    # Enriquecer com dados dos módulos
    top_modules = []
    for item in top_modules_raw:
        module = await db.modules.find_one({"id": item["module_id"]}, {"_id": 0, "title": 1, "description": 1})
        if module:
            top_modules.append({
                "module_id": item["module_id"],
                "title": module.get("title", "Módulo"),
                "access_count": item["access_count"],
                "unique_users": item["unique_users_count"]
            })
    
    # Top 10 capítulos (por número de acessos)
    pipeline_chapters = [
        {
            "$group": {
                "_id": "$chapter_id",
                "access_count": {"$sum": 1},
                "completed_count": {
                    "$sum": {"$cond": [{"$eq": ["$completed", True]}, 1, 0]}
                },
                "unique_users": {"$addToSet": "$user_id"}
            }
        },
        {
            "$project": {
                "chapter_id": "$_id",
                "access_count": 1,
                "completed_count": 1,
                "unique_users_count": {"$size": "$unique_users"}
            }
        },
        {
            "$sort": {"access_count": -1}
        },
        {
            "$limit": 10
        }
    ]
    
    top_chapters_raw = await db.user_progress.aggregate(pipeline_chapters).to_list(10)
    
    # Enriquecer com dados dos capítulos
    top_chapters = []
    for item in top_chapters_raw:
        chapter = await db.chapters.find_one({"id": item["chapter_id"]}, {"_id": 0, "title": 1, "module_id": 1})
        if chapter:
            module = await db.modules.find_one({"id": chapter.get("module_id")}, {"_id": 0, "title": 1})
            top_chapters.append({
                "chapter_id": item["chapter_id"],
                "title": chapter.get("title", "Capítulo"),
                "module_title": module.get("title", "Módulo") if module else "Módulo",
                "access_count": item["access_count"],
                "completed_count": item["completed_count"],
                "unique_users": item["unique_users_count"],
                "completion_rate": round((item["completed_count"] / item["access_count"]) * 100, 1) if item["access_count"] > 0 else 0
            })
    
    return {
        "top_modules": top_modules,
        "top_chapters": top_chapters
    }
```

---

### 2. `/app/backend/routes/notification_routes.py`
**Modificações:** Adicionado endpoint de broadcast de notificações

**O que foi adicionado:**
Adicionar após a função `notify_admins`:

```python
@router.post("/broadcast")
async def broadcast_notification(
    data: dict,
    current_user: dict = Depends(require_role(["admin"]))
):
    """
    Envia notificação para múltiplos usuários (broadcast)
    Admin only
    
    Body:
    {
        "title": "Título da notificação",
        "message": "Mensagem da notificação",
        "type": "announcement",
        "target": "all" | "licensees" | "supervisors" | "specific",
        "user_ids": [] (opcional, para target "specific")
    }
    """
    title = data.get("title")
    message = data.get("message")
    notification_type = data.get("type", "announcement")
    target = data.get("target", "all")
    user_ids = data.get("user_ids", [])
    
    if not title or not message:
        raise HTTPException(status_code=400, detail="Título e mensagem são obrigatórios")
    
    # Determinar destinatários
    if target == "specific" and user_ids:
        # Notificar usuários específicos
        users = await db.users.find(
            {"id": {"$in": user_ids}},
            {"_id": 0, "id": 1}
        ).to_list(1000)
    elif target == "licensees":
        # Apenas licenciados
        users = await db.users.find(
            {"role": "licenciado"},
            {"_id": 0, "id": 1}
        ).to_list(10000)
    elif target == "supervisors":
        # Apenas supervisores
        users = await db.users.find(
            {"role": "supervisor"},
            {"_id": 0, "id": 1}
        ).to_list(1000)
    else:
        # Todos os usuários (exceto admins)
        users = await db.users.find(
            {"role": {"$in": ["licenciado", "supervisor"]}},
            {"_id": 0, "id": 1}
        ).to_list(10000)
    
    # Enviar notificação para cada usuário
    notifications_sent = 0
    for user in users:
        await create_notification(
            user_id=user["id"],
            title=title,
            message=message,
            notification_type=notification_type
        )
        notifications_sent += 1
    
    return {
        "success": True,
        "message": f"Notificação enviada para {notifications_sent} usuário(s)",
        "notifications_sent": notifications_sent
    }
```

---

### 3. `/app/backend/routes/points_routes.py`
**Modificações:** Múltiplas alterações

**3.1. Atualizar imports (no topo do arquivo):**
```python
from auth import get_current_user, require_role
```

**3.2. Atualizar função `get_points_settings`:**
Substituir a função existente por:

```python
@router.get("/settings")
async def get_points_settings(current_user: dict = Depends(get_current_user)):
    """Retorna as configurações de pontos"""
    config = await db.system_config.find_one({"id": "system_config"})
    
    return {
        "expiration_months": config.get("points_expiration_months", 12) if config else 12,
        "daily_access_points": config.get("daily_access_points", 0) if config else 0,
        "training_completion_points": config.get("training_completion_points", 0) if config else 0
    }
```

**3.3. Atualizar função `update_points_settings`:**
Substituir a função existente por:

```python
@router.put("/settings")
async def update_points_settings(data: dict, current_user: dict = Depends(require_role(["admin"]))):
    """Admin: Atualiza as configurações de pontos"""
    expiration_months = data.get("points_expiration_months")
    daily_access_points = data.get("daily_access_points")
    training_completion_points = data.get("training_completion_points")
    
    update_fields = {}
    
    if expiration_months is not None:
        if expiration_months < 0:
            raise HTTPException(status_code=400, detail="Meses de expiração não pode ser negativo")
        update_fields["points_expiration_months"] = expiration_months
    
    if daily_access_points is not None:
        if daily_access_points < 0:
            raise HTTPException(status_code=400, detail="Pontos por acesso diário não pode ser negativo")
        update_fields["daily_access_points"] = daily_access_points
    
    if training_completion_points is not None:
        if training_completion_points < 0:
            raise HTTPException(status_code=400, detail="Pontos por treinamento não pode ser negativo")
        update_fields["training_completion_points"] = training_completion_points
    
    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.system_config.update_one(
            {"id": "system_config"},
            {"$set": update_fields},
            upsert=True
        )
    
    return {
        "success": True,
        "message": "Configurações atualizadas",
        **update_fields
    }
```

**3.4. Adicionar novo endpoint de acesso diário:**
Adicionar após a função `update_points_settings`:

```python
@router.post("/daily-access")
async def register_daily_access(current_user: dict = Depends(get_current_user)):
    """
    Registra acesso diário do usuário e credita pontos se for o primeiro acesso do dia
    """
    user_id = current_user["sub"]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Verificar se já acessou hoje
    existing_access = await db.daily_access.find_one({
        "user_id": user_id,
        "date": today
    })
    
    if existing_access:
        return {
            "success": True,
            "message": "Acesso já registrado hoje",
            "points_awarded": 0
        }
    
    # Registrar acesso
    await db.daily_access.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "date": today,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Verificar se deve dar pontos
    config = await db.system_config.find_one({"id": "system_config"})
    daily_points = config.get("daily_access_points", 0) if config else 0
    
    if daily_points > 0:
        # Dar pontos
        await add_points(
            user_id=user_id,
            points=daily_points,
            reason="daily_access",
            description="Pontos por acesso diário",
            reference_type="daily_access"
        )
        
        return {
            "success": True,
            "message": f"Primeiro acesso do dia! Você ganhou {daily_points} pontos",
            "points_awarded": daily_points
        }
    
    return {
        "success": True,
        "message": "Acesso registrado",
        "points_awarded": 0
    }
```

**3.5. Atualizar endpoints admin (remover imports internos):**
Nas funções abaixo, remover a linha `from auth import require_role`:
- `admin_process_expired`
- `admin_get_expiring_summary`
- `admin_add_points`
- `get_user_points_balance`
- `get_user_points_history`

---

### 4. `/app/backend/routes/training_routes.py`
**Modificações:** Adicionar pontos por treinamento

**Localizar a função que marca presença (procure por "Se presente, avançar para próxima etapa").**

Substituir:
```python
# Se presente, avançar para próxima etapa (vendas_campo)
if present:
    await db.users.update_one(
        {"id": registration["user_id"]},
        {"$set": {
            "current_stage": "vendas_campo",
            "training_attended": True
        }}
    )
```

Por:
```python
# Se presente, avançar para próxima etapa (vendas_campo)
if present:
    await db.users.update_one(
        {"id": registration["user_id"]},
        {"$set": {
            "current_stage": "vendas_campo",
            "training_attended": True
        }}
    )
    
    # Dar pontos por conclusão do treinamento
    config = await db.system_config.find_one({"id": "system_config"})
    training_points = config.get("training_completion_points", 0) if config else 0
    
    if training_points > 0:
        # Importar função de pontos
        from routes.points_routes import add_points
        
        await add_points(
            user_id=registration["user_id"],
            points=training_points,
            reason="training_completion",
            description="Pontos por conclusão de treinamento presencial",
            reference_id=registration_id,
            reference_type="training"
        )
```

---

### 5. `/app/backend/routes/subscription_routes.py`
**Modificações:** Adicionar endpoints de reativar assinatura

**Localizar a função `handleCancelUserSubscription` (procure por `@router.post("/admin/cancel-subscription/{user_id}")`)**

Adicionar APÓS essa função:

```python
@router.post("/my-subscription/reactivate")
async def reactivate_my_subscription(current_user: dict = Depends(get_current_user)):
    """
    Reativa uma assinatura cancelada do usuário logado
    Permite que o usuário reative sua própria assinatura
    """
    user_id = current_user["sub"]
    
    # Buscar assinatura
    subscription = await db.user_subscriptions.find_one({"user_id": user_id})
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Nenhuma assinatura encontrada")
    
    if subscription.get("status") != SubscriptionStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Apenas assinaturas canceladas podem ser reativadas")
    
    # Reativar localmente
    await db.user_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {
            "status": SubscriptionStatus.ACTIVE,
            "pagbank_status": "ACTIVE",
            "reactivated_at": datetime.now(timezone.utc).isoformat(),
            "reactivated_by": "user",
            "cancelled_at": None,
            "cancelled_by": None
        }}
    )
    
    logger.info(f"[Subscription] Assinatura reativada pelo usuário: user={user_id}")
    
    return {
        "success": True,
        "message": "Assinatura reativada com sucesso! Você pode continuar acessando a plataforma."
    }


@router.post("/admin/reactivate-subscription/{user_id}")
async def admin_reactivate_subscription(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Reativa a assinatura de um usuário específico (somente admin)
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Buscar assinatura
    subscription = await db.user_subscriptions.find_one({"user_id": user_id})
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Nenhuma assinatura encontrada para este usuário")
    
    if subscription.get("status") not in [SubscriptionStatus.CANCELLED, SubscriptionStatus.SUSPENDED]:
        raise HTTPException(status_code=400, detail="Apenas assinaturas canceladas ou suspensas podem ser reativadas")
    
    # Reativar localmente
    await db.user_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {
            "status": SubscriptionStatus.ACTIVE,
            "pagbank_status": "ACTIVE",
            "reactivated_at": datetime.now(timezone.utc).isoformat(),
            "reactivated_by": f"admin:{current_user['sub']}",
            "cancelled_at": None,
            "cancelled_by": None,
            "suspended_at": None,
            "overdue_months": 0,
            "failed_payments_count": 0
        }}
    )
    
    logger.info(f"[Admin] Assinatura reativada pelo admin: user={user_id}, admin={current_user['sub']}")
    
    return {
        "success": True,
        "message": f"Assinatura do usuário reativada com sucesso",
        "user_id": user_id
    }
```

---

### 6. `/app/backend/routes/campaign_routes.py`
**Modificações:** Adicionar novos tipos de métricas para campanhas

**Localizar a função `calculate_user_campaign_progress` e a seção que calcula métricas.**

Após o bloco:
```python
elif metric_type == "points":
    # Buscar pontos do usuário
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "points": 1})
    if user:
        current_value = user.get("points", 0)
```

Adicionar:
```python
elif metric_type == "presentations":
    # Total de apresentações no período da campanha
    presentations = await db.presentations.count_documents({
        "user_id": user_id,
        "date": {"$gte": campaign["start_date"], "$lte": campaign["end_date"]}
    })
    current_value = presentations

elif metric_type == "meetings":
    # Total de reuniões no período da campanha
    meetings = await db.meetings.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": campaign["start_date"], "$lte": campaign["end_date"]},
        "status": "closed"
    })
    current_value = meetings

elif metric_type == "meeting_participants":
    # Total de participantes cadastrados em reuniões no período
    meetings = await db.meetings.find({
        "user_id": user_id,
        "created_at": {"$gte": campaign["start_date"], "$lte": campaign["end_date"]},
        "status": "closed"
    }, {"_id": 0, "participants_count": 1}).to_list(1000)
    
    current_value = sum(m.get("participants_count", 0) for m in meetings)
```

---

### 7. `/app/backend/server.py`
**Modificações:** Registrar rota de pontos

**7.1. Adicionar import:**
Localizar a linha de imports de routes e adicionar `points_routes`:
```python
from routes import subscription_routes, meeting_routes, points_routes
```

**7.2. Registrar rota:**
Adicionar após `app.include_router(meeting_routes.router, prefix="/api")`:
```python
app.include_router(points_routes.router, prefix="/api")
```

---

## 🎨 ARQUIVOS DO FRONTEND

### 8. `/app/frontend/src/pages/Dashboard.js`

**8.1. Atualizar imports:**
Localizar a linha de imports do lucide-react e atualizar:
```javascript
import { BookOpen, Users, Award, Clock, TrendingUp, Trophy, CheckCircle, Activity, Flame, Target, Calendar, Briefcase, GraduationCap, Bell, MoreHorizontal, Percent, Star, DollarSign, UserCheck, Send, X } from 'lucide-react';
import { toast } from 'sonner';
```

**8.2. Adicionar novos estados:**
Após os estados existentes, adicionar:
```javascript
// Novos estados para métricas admin
const [engagementMetrics, setEngagementMetrics] = useState(null);
const [financialMetrics, setFinancialMetrics] = useState(null);
const [topContent, setTopContent] = useState(null);
const [showNotificationModal, setShowNotificationModal] = useState(false);
const [notificationData, setNotificationData] = useState({
  title: '',
  message: '',
  target: 'licensees'
});
const [sendingNotification, setSendingNotification] = useState(false);
```

**8.3. Atualizar useEffect:**
Localizar o useEffect que chama `fetchAdminChartData()` e atualizar:
```javascript
if (user?.role === 'admin') {
  fetchAdminChartData();
  fetchEngagementMetrics();
  fetchFinancialMetrics();
  fetchTopContent();
}
```

**8.4. Adicionar novas funções:**
Após a função `fetchAdminChartData`, adicionar:
```javascript
const fetchEngagementMetrics = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/stats/admin/engagement-metrics`);
    setEngagementMetrics(response.data);
  } catch (error) {
    console.error('Erro ao buscar métricas de engajamento:', error);
  }
};

const fetchFinancialMetrics = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/stats/admin/financial-metrics`);
    setFinancialMetrics(response.data);
  } catch (error) {
    console.error('Erro ao buscar métricas financeiras:', error);
  }
};

const fetchTopContent = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/stats/admin/top-content`);
    setTopContent(response.data);
  } catch (error) {
    console.error('Erro ao buscar top conteúdos:', error);
  }
};

const handleSendNotification = async () => {
  if (!notificationData.title || !notificationData.message) {
    toast.error('Título e mensagem são obrigatórios');
    return;
  }

  setSendingNotification(true);
  try {
    const response = await axios.post(`${API_URL}/api/notifications/broadcast`, notificationData);
    toast.success(response.data.message);
    setShowNotificationModal(false);
    setNotificationData({ title: '', message: '', target: 'licensees' });
  } catch (error) {
    toast.error('Erro ao enviar notificação');
    console.error('Erro:', error);
  } finally {
    setSendingNotification(false);
  }
};
```

**8.5. Adicionar novos cards de métricas:**

⚠️ **ARQUIVO MUITO GRANDE - Ver arquivo completo em:** `/app/DASHBOARD_UPDATES.md`

Resumo das alterações:
- Adicionar 11 novos cards de métricas (engajamento + financeiro)
- Adicionar seção "Top Conteúdos Mais Acessados"
- Adicionar modal de "Enviar Notificação Push"

---

### 9. `/app/frontend/src/pages/admin/AdminSystem.js`

**ESTE É O ARQUIVO MAIS COMPLEXO. Vou fornecer o arquivo completo devido às múltiplas alterações.**

⚠️ **ARQUIVO MUITO GRANDE - Ver seções específicas abaixo:**

**9.1. Adicionar novos estados:**
Após os estados existentes de webhookLogs, adicionar:
```javascript
// Estados para configuração de pontos
const [pointsSettings, setPointsSettings] = useState({ expiration_months: 12 });
const [savingPoints, setSavingPoints] = useState(false);
const [expiringPointsSummary, setExpiringPointsSummary] = useState(null);
const [processingExpired, setProcessingExpired] = useState(false);
const [manualPointsData, setManualPointsData] = useState({ user_id: '', points: '', description: '' });
const [addingManualPoints, setAddingManualPoints] = useState(false);
```

**9.2. Atualizar useEffect:**
```javascript
useEffect(() => {
  fetchSystemStats();
  fetchSystemConfig();
  fetchWebhookLogs();
  fetchWebhookStats();
  fetchPointsSettings();
  fetchExpiringPointsSummary();
}, []);
```

**9.3. Adicionar novas funções:**
Após `handleRemoveLogo`, adicionar:

```javascript
const fetchPointsSettings = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/points/settings`);
    setPointsSettings(response.data);
  } catch (error) {
    console.error('Erro ao buscar configurações de pontos:', error);
  }
};

const fetchExpiringPointsSummary = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/points/admin/expiring-summary?days=30`);
    setExpiringPointsSummary(response.data);
  } catch (error) {
    console.error('Erro ao buscar resumo de pontos expirando:', error);
  }
};

const savePointsSettings = async () => {
  setSavingPoints(true);
  try {
    await axios.put(`${API_URL}/api/points/settings`, {
      points_expiration_months: parseInt(pointsSettings.expiration_months),
      daily_access_points: parseInt(pointsSettings.daily_access_points || 0),
      training_completion_points: parseInt(pointsSettings.training_completion_points || 0)
    });
    toast.success('Configurações de pontos salvas com sucesso!');
    fetchExpiringPointsSummary();
  } catch (error) {
    console.error('Erro ao salvar configurações de pontos:', error);
    toast.error('Erro ao salvar configurações');
  } finally {
    setSavingPoints(false);
  }
};

const processExpiredPoints = async () => {
  if (!window.confirm('Processar pontos expirados? Esta ação irá expirar todos os pontos que ultrapassaram a validade configurada.')) return;
  
  setProcessingExpired(true);
  try {
    const response = await axios.post(`${API_URL}/api/points/admin/process-expired`);
    toast.success(response.data.message);
    fetchExpiringPointsSummary();
  } catch (error) {
    console.error('Erro ao processar pontos expirados:', error);
    toast.error('Erro ao processar pontos expirados');
  } finally {
    setProcessingExpired(false);
  }
};

const addManualPoints = async () => {
  if (!manualPointsData.user_id || !manualPointsData.points || !manualPointsData.description) {
    toast.error('Preencha todos os campos');
    return;
  }

  setAddingManualPoints(true);
  try {
    const response = await axios.post(`${API_URL}/api/points/admin/add`, {
      user_id: manualPointsData.user_id,
      points: parseInt(manualPointsData.points),
      description: manualPointsData.description
    });
    toast.success(response.data.message);
    setManualPointsData({ user_id: '', points: '', description: '' });
  } catch (error) {
    toast.error(error.response?.data?.detail || 'Erro ao adicionar pontos');
    console.error('Erro:', error);
  } finally {
    setAddingManualPoints(false);
  }
};
```

**9.4. Atualizar TabsList (corrigir layout das abas):**
Substituir o `<TabsList>` existente por:
```javascript
<TabsList className="w-full justify-start bg-slate-50 dark:bg-white/5 rounded-none p-0 flex-wrap h-auto">
  <TabsTrigger 
    value="gestao" 
    className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#1b4c51] data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400 data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 border-b-2 border-transparent rounded-none px-6 py-4 transition-all"
  >
    <Users className="w-4 h-4 mr-2" />
    Gestão
  </TabsTrigger>
  <TabsTrigger 
    value="geral" 
    className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#1b4c51] data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400 data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 border-b-2 border-transparent rounded-none px-6 py-4 transition-all"
  >
    <Settings className="w-4 h-4 mr-2" />
    Configurações
  </TabsTrigger>
  <TabsTrigger 
    value="conteudo" 
    className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#1b4c51] data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400 data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 border-b-2 border-transparent rounded-none px-6 py-4 transition-all"
  >
    <Megaphone className="w-4 h-4 mr-2" />
    Conteúdo
  </TabsTrigger>
  <TabsTrigger 
    value="integracoes" 
    className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#1b4c51] data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400 data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 border-b-2 border-transparent rounded-none px-6 py-4 transition-all"
  >
    <Webhook className="w-4 h-4 mr-2" />
    Integrações
  </TabsTrigger>
  <TabsTrigger 
    value="seguranca" 
    className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#1b4c51] data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400 data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 border-b-2 border-transparent rounded-none px-6 py-4 transition-all"
  >
    <ShieldAlert className="w-4 h-4 mr-2" />
    Segurança
  </TabsTrigger>
  <TabsTrigger 
    value="pontos" 
    className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#1b4c51] data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400 data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 border-b-2 border-transparent rounded-none px-6 py-4 transition-all"
  >
    <Award className="w-4 h-4 mr-2" />
    Pontos
  </TabsTrigger>
</TabsList>
```

**9.5. Adicionar nova aba "Pontos":**

⚠️ **CONTEÚDO COMPLETO DA ABA EM:** `/app/ADMIN_SYSTEM_PONTOS_TAB.md`

Adicionar antes do fechamento das Tabs (antes de `</Tabs>`):

```javascript
{/* ABA: Pontos */}
<TabsContent value="pontos" className="p-6 space-y-6">
  <div>
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Sistema de Pontos com Expiração</h3>
    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
      Configure a validade dos pontos ganhos pelos licenciados. Cada ponto registra data/hora de ganho e expira individualmente após o período configurado.
    </p>

    {/* Configuração de Expiração */}
    <div className="bg-white dark:bg-[#1b4c51] rounded-lg p-6 border border-slate-200 dark:border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
          <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Validade dos Pontos</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">Defina por quantos meses os pontos permanecem válidos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Meses de Validade
          </label>
          <input
            type="number"
            min="0"
            value={pointsSettings.expiration_months}
            onChange={(e) => setPointsSettings({ ...pointsSettings, expiration_months: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
            placeholder="12"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {pointsSettings.expiration_months == 0 ? '⚠️ Pontos nunca expiram' : `Pontos expiram após ${pointsSettings.expiration_months} mês(es)`}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Pontos por Acesso Diário
          </label>
          <input
            type="number"
            min="0"
            value={pointsSettings.daily_access_points || 0}
            onChange={(e) => setPointsSettings({ ...pointsSettings, daily_access_points: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            placeholder="0"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Pontos ganhos no primeiro acesso do dia
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Pontos por Treinamento
          </label>
          <input
            type="number"
            min="0"
            value={pointsSettings.training_completion_points || 0}
            onChange={(e) => setPointsSettings({ ...pointsSettings, training_completion_points: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Pontos ao concluir treinamento presencial
          </p>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button
          onClick={savePointsSettings}
          disabled={savingPoints}
          className="bg-amber-500 hover:bg-amber-600"
        >
          <Save className="w-4 h-4 mr-2" />
          {savingPoints ? 'Salvando...' : 'Salvar Todas as Configurações'}
        </Button>
      </div>
    </div>

    {/* Resumo de Pontos Expirando */}
    {expiringPointsSummary && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6 border border-amber-200 dark:border-amber-700/30">
          <div className="flex items-center gap-3 mb-3">
            <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h4 className="font-semibold text-amber-900 dark:text-amber-300">Pontos Expirando (30 dias)</h4>
          </div>
          <p className="text-3xl font-bold text-amber-900 dark:text-amber-300">{expiringPointsSummary.total_points_expiring?.toLocaleString() || 0}</p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">pontos totais</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-700/30">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-blue-900 dark:text-blue-300">Usuários Afetados</h4>
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">{expiringPointsSummary.total_users_affected || 0}</p>
          <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">licenciados</p>
        </div>

        <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-6 border border-slate-200 dark:border-white/10 flex flex-col justify-center">
          <Button
            onClick={processExpiredPoints}
            disabled={processingExpired}
            className="w-full bg-red-600 hover:bg-red-700 mb-3"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${processingExpired ? 'animate-spin' : ''}`} />
            {processingExpired ? 'Processando...' : 'Processar Pontos Expirados'}
          </Button>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Expira manualmente todos os pontos vencidos
          </p>
        </div>
      </div>
    )}

    {/* Adicionar Pontos Manualmente */}
    <div className="bg-white dark:bg-[#1b4c51] rounded-lg p-6 border border-slate-200 dark:border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg flex items-center justify-center">
          <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Adicionar Pontos Manualmente</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">Adicione ou remova pontos de um usuário específico</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            ID do Usuário *
          </label>
          <input
            type="text"
            value={manualPointsData.user_id}
            onChange={(e) => setManualPointsData({ ...manualPointsData, user_id: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
            placeholder="ID do usuário"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Pontos *
          </label>
          <input
            type="number"
            value={manualPointsData.points}
            onChange={(e) => setManualPointsData({ ...manualPointsData, points: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
            placeholder="100 (ou -100 para remover)"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Use valores negativos para remover pontos
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Descrição *
          </label>
          <input
            type="text"
            value={manualPointsData.description}
            onChange={(e) => setManualPointsData({ ...manualPointsData, description: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#142d30] text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
            placeholder="Motivo da adição/remoção"
          />
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button
          onClick={addManualPoints}
          disabled={addingManualPoints}
          className="bg-cyan-500 hover:bg-cyan-600"
        >
          {addingManualPoints ? 'Processando...' : 'Adicionar/Remover Pontos'}
        </Button>
      </div>
    </div>

    {/* Top 10 Usuários com Pontos Expirando */}
    {expiringPointsSummary?.users && expiringPointsSummary.users.length > 0 && (
      <div className="bg-white dark:bg-[#1b4c51] rounded-lg p-6 border border-slate-200 dark:border-white/10">
        <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Top 10 Usuários com Pontos Expirando</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Usuário</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Email</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Pontos Expirando</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Transações</th>
              </tr>
            </thead>
            <tbody>
              {expiringPointsSummary.users.slice(0, 10).map((user, index) => (
                <tr key={index} className="border-b border-slate-100 dark:border-white/5">
                  <td className="py-3 px-4 text-sm text-slate-900 dark:text-white">{user.full_name}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{user.email}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-amber-600 dark:text-amber-400 text-right">{user.total_expiring?.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 text-right">{user.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* Informações */}
    <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-700/30 rounded-lg p-4">
      <p className="text-sm text-cyan-800 dark:text-cyan-300">
        💡 <strong>Como funciona:</strong> Cada vez que um usuário ganha pontos, a data/hora é registrada. Os pontos expiram individualmente conforme completam o período configurado. Por exemplo: 100 pontos ganhos em 01/02/2026 expiram em 01/02/2027 (com 12 meses configurados), independente de outros pontos.
      </p>
    </div>
  </div>
</TabsContent>
```

---

### 10. `/app/frontend/src/components/SubscriptionStatus.js`
**Modificações:** Adicionar botão de reativar assinatura para licenciado

**10.1. Adicionar estado:**
```javascript
const [reactivating, setReactivating] = useState(false);
```

**10.2. Adicionar função:**
Após a função `syncStatus`:
```javascript
const reactivateSubscription = async () => {
  if (!window.confirm('Deseja realmente reativar sua assinatura?')) return;
  
  setReactivating(true);
  try {
    const response = await axios.post(`${API_URL}/api/subscriptions/my-subscription/reactivate`);
    toast.success(response.data.message);
    checkSubscription(); // Atualizar status
  } catch (error) {
    toast.error(error.response?.data?.detail || 'Erro ao reativar assinatura');
    console.error('Erro:', error);
  } finally {
    setReactivating(false);
  }
};
```

**10.3. Adicionar seção após o alerta de suspended:**
```javascript
{subscription.status === 'cancelled' && (
  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
    <p className="text-sm text-slate-700">
      Sua assinatura foi cancelada. Você pode reativá-la a qualquer momento.
    </p>
    <Button
      onClick={reactivateSubscription}
      disabled={reactivating}
      className="w-full bg-emerald-500 hover:bg-emerald-600"
    >
      {reactivating ? 'Reativando...' : 'Reativar Assinatura'}
    </Button>
  </div>
)}
```

---

### 11. `/app/frontend/src/pages/admin/AdminSubscriptions.js`
**Modificações:** Adicionar botão de reativar para admin

**11.1. Adicionar função:**
Após a função `handleCancelUserSubscription`:
```javascript
// Reativar assinatura de um usuário
const handleReactivateUserSubscription = async (userId, userName) => {
  if (!window.confirm(`Tem certeza que deseja reativar a assinatura de ${userName}?`)) {
    return;
  }

  setCancellingUser(userId);
  try {
    const response = await axios.post(`${API_URL}/api/subscriptions/admin/reactivate-subscription/${userId}`);
    if (response.data.success) {
      toast.success('Assinatura reativada com sucesso!');
      fetchData(); // Recarregar dados
    }
  } catch (error) {
    const errorMsg = error.response?.data?.detail || 'Erro ao reativar assinatura';
    toast.error(errorMsg);
  } finally {
    setCancellingUser(null);
  }
};
```

**11.2. Atualizar a coluna de ações na tabela:**
Substituir:
```javascript
<td className="px-6 py-4">
  {sub.status !== 'cancelled' ? (
    <Button
      variant="ghost"
      size="sm"
      className="text-red-600 hover:bg-red-50"
      onClick={() => handleCancelUserSubscription(sub.user_id, sub.user_name)}
      disabled={cancellingUser === sub.user_id}
    >
      {cancellingUser === sub.user_id ? (
        <Loader className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <XCircle className="w-4 h-4 mr-1" />
          Cancelar
        </>
      )}
    </Button>
  ) : (
    <span className="text-xs text-slate-400">Cancelada</span>
  )}
</td>
```

Por:
```javascript
<td className="px-6 py-4">
  {sub.status !== 'cancelled' ? (
    <Button
      variant="ghost"
      size="sm"
      className="text-red-600 hover:bg-red-50"
      onClick={() => handleCancelUserSubscription(sub.user_id, sub.user_name)}
      disabled={cancellingUser === sub.user_id}
    >
      {cancellingUser === sub.user_id ? (
        <Loader className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <XCircle className="w-4 h-4 mr-1" />
          Cancelar
        </>
      )}
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      className="text-emerald-600 hover:bg-emerald-50"
      onClick={() => handleReactivateUserSubscription(sub.user_id, sub.user_name)}
      disabled={cancellingUser === sub.user_id}
    >
      {cancellingUser === sub.user_id ? (
        <Loader className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <CheckCircle className="w-4 h-4 mr-1" />
          Reativar
        </>
      )}
    </Button>
  )}
</td>
```

---

### 12. `/app/frontend/src/pages/admin/AdminCampaigns.js`
**Modificações:** Adicionar novos tipos de métricas

**Atualizar o array METRIC_TYPES:**
```javascript
const METRIC_TYPES = [
  { value: 'frequency', label: 'Frequência de Apresentações', icon: Percent, description: '% de dias com 2+ apresentações' },
  { value: 'average_score', label: 'Média de Notas', icon: Star, description: 'Média das avaliações de módulos' },
  { value: 'points', label: 'Pontuação', icon: Award, description: 'Total de pontos na plataforma' },
  { value: 'presentations', label: 'Total de Apresentações', icon: TrendingUp, description: 'Quantidade de apresentações no período' },
  { value: 'meetings', label: 'Total de Reuniões', icon: Users, description: 'Quantidade de reuniões finalizadas no período' },
  { value: 'meeting_participants', label: 'Participantes em Reuniões', icon: Target, description: 'Total de participantes cadastrados em reuniões' }
];
```

---

### 13. `/app/frontend/src/pages/Rewards.js`
**Modificações:** Adicionar exibição de imagem da recompensa

**Substituir o map dos cards de recompensa:**
```javascript
{rewards.map((reward) => (
  <div key={reward.id} className="bg-white dark:bg-[#1b4c51] rounded-xl border border-slate-100 dark:border-white/5 overflow-hidden hover:shadow-lg dark:hover:border-cyan-500/30 transition-all" data-testid={`reward-card-${reward.id}`}>
    {/* Imagem da Recompensa */}
    {reward.image_url && (
      <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <img 
          src={`${API_URL}${reward.image_url}`}
          alt={reward.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.style.display = 'none';
          }}
        />
      </div>
    )}
    
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
          <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium">
          {reward.required_points} pts
        </span>
      </div>
      <h3 className="text-lg font-outfit font-semibold text-slate-900 dark:text-white mb-2">{reward.title}</h3>
      <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{reward.description}</p>
      <Button
        onClick={() => handleRedeem(reward.id)}
        disabled={user?.points < reward.required_points}
        data-testid={`redeem-button-${reward.id}`}
        className="w-full"
      >
        {user?.points < reward.required_points ? 'Pontos Insuficientes' : 'Resgatar'}
      </Button>
    </div>
  </div>
))}
```

---

## 📝 RESUMO DE MUDANÇAS

### Backend (7 arquivos):
1. ✅ `stats_routes.py` - 3 novos endpoints
2. ✅ `notification_routes.py` - Broadcast
3. ✅ `points_routes.py` - Configurações expandidas + acesso diário
4. ✅ `training_routes.py` - Pontos por treinamento
5. ✅ `subscription_routes.py` - Reativar assinatura
6. ✅ `campaign_routes.py` - Novos tipos de métricas
7. ✅ `server.py` - Registro de rotas

### Frontend (6 arquivos):
8. ✅ `Dashboard.js` - Novos cards e métricas
9. ✅ `AdminSystem.js` - Aba de pontos completa
10. ✅ `SubscriptionStatus.js` - Botão reativar
11. ✅ `AdminSubscriptions.js` - Botões admin
12. ✅ `AdminCampaigns.js` - 6 tipos métricas
13. ✅ `Rewards.js` - Imagem recompensa

---

## 🚀 INSTRUÇÕES DE APLICAÇÃO

1. **Fazer backup do seu código atual**
2. **Aplicar mudanças do backend primeiro**
3. **Reiniciar backend:** `sudo supervisorctl restart backend`
4. **Aplicar mudanças do frontend**
5. **Reiniciar frontend:** `sudo supervisorctl restart frontend`
6. **Testar cada funcionalidade**

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

- Todos os endpoints têm autenticação (require_role ou get_current_user)
- O sistema de pontos já tinha expiração, apenas adicionamos interface
- As alterações são retrocompatíveis
- Não é necessário migração de banco de dados
- Frontend compila com warnings não-críticos (ESLint dependencies)

---

**Documento gerado em:** 2026
**Total de arquivos modificados:** 13
**Total de funcionalidades:** 7 principais

---

Para detalhes específicos de cada arquivo, consulte a seção correspondente acima.
