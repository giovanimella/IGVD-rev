from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorClient
from models import Presentation, PresentationFrequency
from auth import get_current_user, require_role
from datetime import datetime, timedelta
from pathlib import Path
import os
import uuid
import shutil
import calendar

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/presentations", tags=["presentations"])

# Diretório de upload
UPLOAD_DIR = Path("/app/uploads/presentations")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ==================== FUNÇÕES AUXILIARES ====================

def get_working_days_in_month(year: int, month: int) -> int:
    """Retorna o número de dias úteis (seg-sex) no mês"""
    cal = calendar.monthcalendar(year, month)
    working_days = 0
    
    for week in cal:
        for day_index, day in enumerate(week):
            # day_index: 0=segunda, 1=terça, ..., 4=sexta, 5=sábado, 6=domingo
            if day != 0 and day_index < 5:  # Segunda a sexta
                working_days += 1
    
    return working_days

async def calculate_presentation_frequency(user_id: str, year: int, month: int):
    """Calcula a frequência de apresentações do usuário no mês"""
    
    # Buscar todas as apresentações do mês
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    presentations = await db.presentations.find({
        "user_id": user_id,
        "presentation_date": {
            "$gte": start_date.isoformat(),
            "$lt": end_date.isoformat()
        }
    }).to_list(1000)
    
    # Agrupar por dia
    days_count = {}
    for pres in presentations:
        date_obj = datetime.fromisoformat(pres["presentation_date"])
        date_key = date_obj.strftime("%Y-%m-%d")
        day_of_week = date_obj.weekday()  # 0=segunda, 6=domingo
        
        # Só conta dias úteis (seg-sex)
        if day_of_week < 5:
            if date_key not in days_count:
                days_count[date_key] = 0
            days_count[date_key] += 1
    
    # Contar dias que tiveram 2+ apresentações
    days_with_target = sum(1 for count in days_count.values() if count >= 2)
    
    # Dias úteis no mês
    working_days = get_working_days_in_month(year, month)
    
    # Calcular frequência (%)
    if working_days > 0:
        frequency = (days_with_target / working_days) * 100
    else:
        frequency = 100.0
    
    # Atualizar ou criar registro de frequência
    await db.presentation_frequency.update_one(
        {
            "user_id": user_id,
            "year": year,
            "month": month
        },
        {
            "$set": {
                "total_presentations": len(presentations),
                "working_days_in_month": working_days,
                "days_with_presentations": days_with_target,
                "frequency_percentage": round(frequency, 2),
                "calculated_at": datetime.now().isoformat()
            }
        },
        upsert=True
    )
    
    return {
        "total_presentations": len(presentations),
        "working_days": working_days,
        "days_with_target": days_with_target,
        "frequency_percentage": round(frequency, 2)
    }

async def create_followup_events(user_id: str, presentation: dict):
    """Cria eventos de follow-up na agenda do licenciado"""
    from models import CompanyEvent
    
    presentation_date = datetime.fromisoformat(presentation["presentation_date"])
    client_name = presentation["client_name"]
    
    if presentation["sold"]:
        # Se vendeu: 3 compromissos
        followups = [
            {
                "days": 3,
                "title": f"Follow-up: {client_name} (3 dias - Verificação)",
                "description": f"Entrar em contato com {client_name} para verificar se está tudo OK com o aparelho, tirar dúvidas e oferecer suporte."
            },
            {
                "days": 14,
                "title": f"Follow-up: {client_name} (2 semanas - Feedback)",
                "description": f"Perguntar a {client_name} se sentiu diferença, se está gostando de usar o aparelho e como está a experiência."
            },
            {
                "days": 30,
                "title": f"Follow-up: {client_name} (1 mês - Satisfação)",
                "description": f"Verificar a satisfação de {client_name} com o produto e pedir uma indicação de outro cliente."
            }
        ]
    else:
        # Se não vendeu: 1 compromisso em 1 semana
        followups = [
            {
                "days": 7,
                "title": f"Enviar material: {client_name}",
                "description": f"Enviar materiais informativos e de apoio para {client_name} para nutrir o lead e aumentar interesse."
            }
        ]
    
    for followup in followups:
        event_date = presentation_date + timedelta(days=followup["days"])
        
        event = CompanyEvent(
            title=followup["title"],
            description=followup["description"],
            start_date=event_date.isoformat(),
            end_date=event_date.isoformat(),
            location="Contato Remoto",
            is_mandatory=False,
            created_by=user_id,
            attendees=[user_id],  # Apenas o licenciado
            event_type="follow_up"
        )
        
        await db.company_events.insert_one(event.model_dump())

# ==================== ENDPOINTS ====================

@router.post("/")
async def create_presentation(
    client_name: str,
    sold: bool = False,
    client_email: str = None,
    client_phone: str = None,
    notes: str = None,
    photo: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Registrar uma nova apresentação"""
    user_id = current_user["sub"]
    
    # Upload da foto se houver
    photo_url = None
    if photo:
        if not photo.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Apenas imagens são aceitas")
        
        # Salvar foto
        file_ext = photo.filename.split('.')[-1]
        filename = f"{uuid.uuid4().hex}.{file_ext}"
        file_path = UPLOAD_DIR / filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        
        photo_url = f"/uploads/presentations/{filename}"
    
    # Criar apresentação
    presentation = Presentation(
        user_id=user_id,
        client_name=client_name,
        client_email=client_email,
        client_phone=client_phone,
        photo_url=photo_url,
        sold=sold,
        notes=notes
    )
    
    await db.presentations.insert_one(presentation.model_dump())
    
    # Criar eventos de follow-up
    await create_followup_events(user_id, presentation.model_dump())
    
    # Recalcular frequência do mês atual
    now = datetime.now()
    await calculate_presentation_frequency(user_id, now.year, now.month)
    
    return {
        "message": "Apresentação registrada com sucesso!",
        "presentation": presentation.model_dump()
    }

@router.get("/my")
async def get_my_presentations(
    current_user: dict = Depends(get_current_user)
):
    """Listar apresentações do usuário"""
    user_id = current_user["sub"]
    
    presentations = await db.presentations.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("presentation_date", -1).to_list(1000)
    
    return presentations

@router.get("/my/today")
async def get_today_presentations(
    current_user: dict = Depends(get_current_user)
):
    """Apresentações de hoje"""
    user_id = current_user["sub"]
    
    today = datetime.now().date()
    start = datetime.combine(today, datetime.min.time())
    end = datetime.combine(today, datetime.max.time())
    
    presentations = await db.presentations.find({
        "user_id": user_id,
        "presentation_date": {
            "$gte": start.isoformat(),
            "$lte": end.isoformat()
        }
    }, {"_id": 0}).to_list(100)
    
    return {
        "count": len(presentations),
        "target": 2,
        "completed": len(presentations) >= 2,
        "presentations": presentations
    }

@router.get("/my/frequency")
async def get_my_frequency(
    current_user: dict = Depends(get_current_user)
):
    """Frequência do usuário no mês atual"""
    user_id = current_user["sub"]
    now = datetime.now()
    
    # Recalcular antes de retornar
    frequency_data = await calculate_presentation_frequency(user_id, now.year, now.month)
    
    # Buscar registro atualizado
    frequency = await db.presentation_frequency.find_one({
        "user_id": user_id,
        "year": now.year,
        "month": now.month
    }, {"_id": 0})
    
    if not frequency:
        # Criar registro se não existir
        working_days = get_working_days_in_month(now.year, now.month)
        frequency = PresentationFrequency(
            user_id=user_id,
            year=now.year,
            month=now.month,
            working_days_in_month=working_days
        ).model_dump()
        await db.presentation_frequency.insert_one(frequency)
    
    return frequency

@router.put("/{presentation_id}")
async def update_presentation(
    presentation_id: str,
    updates: dict,
    current_user: dict = Depends(get_current_user)
):
    """Atualizar apresentação"""
    user_id = current_user["sub"]
    
    # Verificar se pertence ao usuário
    presentation = await db.presentations.find_one({
        "id": presentation_id,
        "user_id": user_id
    })
    
    if not presentation:
        raise HTTPException(status_code=404, detail="Apresentação não encontrada")
    
    # Atualizar
    allowed_fields = ["client_name", "client_email", "client_phone", "sold", "notes"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    await db.presentations.update_one(
        {"id": presentation_id},
        {"$set": update_data}
    )
    
    return {"message": "Apresentação atualizada"}

@router.delete("/{presentation_id}")
async def delete_presentation(
    presentation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Excluir apresentação"""
    user_id = current_user["sub"]
    
    # Verificar se pertence ao usuário
    presentation = await db.presentations.find_one({
        "id": presentation_id,
        "user_id": user_id
    })
    
    if not presentation:
        raise HTTPException(status_code=404, detail="Apresentação não encontrada")
    
    # Excluir
    await db.presentations.delete_one({"id": presentation_id})
    
    # Recalcular frequência
    now = datetime.now()
    await calculate_presentation_frequency(user_id, now.year, now.month)
    
    return {"message": "Apresentação excluída"}

# ==================== ADMIN ====================

@router.get("/all")
async def get_all_presentations(
    current_user: dict = Depends(require_role(["admin", "supervisor"]))
):
    """Listar todas as apresentações (admin/supervisor)"""
    presentations = await db.presentations.find({}, {"_id": 0}).sort("presentation_date", -1).to_list(10000)
    return presentations

@router.get("/stats")
async def get_presentation_stats(
    current_user: dict = Depends(require_role(["admin"]))
):
    """Estatísticas gerais de apresentações"""
    total = await db.presentations.count_documents({})
    total_sold = await db.presentations.count_documents({"sold": True})
    
    return {
        "total_presentations": total,
        "total_sold": total_sold,
        "conversion_rate": round((total_sold / total * 100), 2) if total > 0 else 0
    }
