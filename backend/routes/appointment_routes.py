from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user, require_role
import uuid
import os

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/appointments", tags=["appointments"])

# ==================== MODELOS ====================

class AppointmentCreate(BaseModel):
    title: str
    date: str  # ISO format: 2025-01-20
    time: str  # HH:MM format
    category: str  # visita_cliente, reuniao, treinamento, lembrete, outro
    description: Optional[str] = None
    duration: Optional[str] = None  # Livre: "1 hora", "30 min", etc.

# Modelo para eventos da empresa (globais)
class CompanyEventCreate(BaseModel):
    title: str
    date: str  # ISO format: 2025-01-20
    time: str  # HH:MM format
    event_type: str  # live, evento, reuniao, campanha, outro
    description: Optional[str] = None
    duration: Optional[str] = None
    link: Optional[str] = None  # Link para live, reunião online, etc.
    location: Optional[str] = None  # Local físico (se aplicável)

class CompanyEventUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    event_type: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    link: Optional[str] = None
    location: Optional[str] = None
    active: Optional[bool] = None

class AppointmentUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: str
    user_id: str
    title: str
    date: str
    time: str
    category: str
    description: Optional[str] = None
    duration: Optional[str] = None
    created_at: str
    updated_at: str

# ==================== ROTAS DO LICENCIADO ====================

@router.post("/", response_model=AppointmentResponse)
async def create_appointment(
    data: AppointmentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Criar um novo compromisso"""
    user_id = current_user.get("sub")
    appointment = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": data.title,
        "date": data.date,
        "time": data.time,
        "category": data.category,
        "description": data.description,
        "duration": data.duration,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointments.insert_one(appointment)
    appointment.pop("_id", None)
    return appointment

@router.get("/", response_model=List[AppointmentResponse])
async def get_my_appointments(
    current_user: dict = Depends(get_current_user)
):
    """Listar todos os compromissos do usuário logado"""
    user_id = current_user.get("sub")
    appointments = await db.appointments.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("date", 1).to_list(1000)
    return appointments

@router.get("/upcoming")
async def get_upcoming_appointments(
    current_user: dict = Depends(get_current_user)
):
    """Listar compromissos de hoje e dos próximos 3 dias"""
    user_id = current_user.get("sub")
    today = datetime.now(timezone.utc).date()
    end_date = today + timedelta(days=3)
    
    appointments = await db.appointments.find(
        {
            "user_id": user_id,
            "date": {
                "$gte": today.isoformat(),
                "$lte": end_date.isoformat()
            }
        },
        {"_id": 0}
    ).sort([("date", 1), ("time", 1)]).to_list(100)
    
    return appointments

@router.get("/month/{year}/{month}")
async def get_appointments_by_month(
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user)
):
    """Listar compromissos de um mês específico (pessoais + eventos da empresa)"""
    user_id = current_user.get("sub")
    start_date = f"{year}-{month:02d}-01"
    
    # Calcular último dia do mês
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    # Buscar compromissos pessoais
    personal_appointments = await db.appointments.find(
        {
            "user_id": user_id,
            "date": {
                "$gte": start_date,
                "$lt": end_date
            }
        },
        {"_id": 0}
    ).sort([("date", 1), ("time", 1)]).to_list(500)
    
    # Buscar eventos da empresa (globais)
    company_events = await db.company_events.find(
        {
            "active": True,
            "date": {
                "$gte": start_date,
                "$lt": end_date
            }
        },
        {"_id": 0}
    ).sort([("date", 1), ("time", 1)]).to_list(100)
    
    # Converter eventos da empresa para formato de compromisso
    for event in company_events:
        event["is_company_event"] = True
        # Mapear event_type para category visual
        event_type_map = {
            "live": "treinamento",
            "evento": "reuniao",
            "reuniao": "reuniao",
            "campanha": "lembrete",
            "outro": "outro"
        }
        event["category"] = event_type_map.get(event.get("event_type"), "outro")
    
    # Combinar e ordenar
    all_appointments = personal_appointments + company_events
    all_appointments.sort(key=lambda x: (x.get("date", ""), x.get("time", "")))
    
    return all_appointments

@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obter detalhes de um compromisso"""
    user_id = current_user.get("sub")
    appointment = await db.appointments.find_one(
        {"id": appointment_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado")
    
    return appointment

@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: str,
    data: AppointmentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Atualizar um compromisso"""
    user_id = current_user.get("sub")
    appointment = await db.appointments.find_one(
        {"id": appointment_id, "user_id": user_id}
    )
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado")
    
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": updates}
    )
    
    updated = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    return updated

@router.delete("/{appointment_id}")
async def delete_appointment(
    appointment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Excluir um compromisso"""
    user_id = current_user.get("sub")
    result = await db.appointments.delete_one(
        {"id": appointment_id, "user_id": user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado")
    
    return {"message": "Compromisso excluído com sucesso"}

# ==================== ROTAS DO SUPERVISOR ====================

@router.get("/supervisor/licensee/{user_id}")
async def get_licensee_appointments(
    user_id: str,
    current_user: dict = Depends(require_role(["supervisor", "admin"]))
):
    """Supervisor visualiza compromissos de um licenciado"""
    # Verificar se o licenciado existe
    licensee = await db.users.find_one({"id": user_id, "role": "licenciado"})
    if not licensee:
        raise HTTPException(status_code=404, detail="Licenciado não encontrado")
    
    appointments = await db.appointments.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort([("date", 1), ("time", 1)]).to_list(500)
    
    return appointments

@router.get("/supervisor/licensee/{user_id}/month/{year}/{month}")
async def get_licensee_appointments_by_month(
    user_id: str,
    year: int,
    month: int,
    current_user: dict = Depends(require_role(["supervisor", "admin"]))
):
    """Supervisor visualiza compromissos de um licenciado por mês"""
    start_date = f"{year}-{month:02d}-01"
    
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    appointments = await db.appointments.find(
        {
            "user_id": user_id,
            "date": {
                "$gte": start_date,
                "$lt": end_date
            }
        },
        {"_id": 0}
    ).sort([("date", 1), ("time", 1)]).to_list(500)
    
    return appointments


# ==================== EVENTOS DA EMPRESA (ADMIN) ====================

@router.get("/company-events")
async def get_company_events(
    current_user: dict = Depends(require_role(["admin"]))
):
    """Admin: Listar todos os eventos da empresa"""
    events = await db.company_events.find(
        {},
        {"_id": 0}
    ).sort([("date", -1), ("time", 1)]).to_list(500)
    return events

@router.get("/company-events/upcoming")
async def get_upcoming_company_events(
    current_user: dict = Depends(get_current_user)
):
    """Listar próximos eventos da empresa (para qualquer usuário logado)"""
    today = datetime.now(timezone.utc).date()
    
    events = await db.company_events.find(
        {
            "active": True,
            "date": {"$gte": today.isoformat()}
        },
        {"_id": 0}
    ).sort([("date", 1), ("time", 1)]).to_list(50)
    return events

@router.post("/company-events")
async def create_company_event(
    data: CompanyEventCreate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Admin: Criar um novo evento da empresa"""
    event = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "date": data.date,
        "time": data.time,
        "event_type": data.event_type,
        "description": data.description,
        "duration": data.duration,
        "link": data.link,
        "location": data.location,
        "active": True,
        "created_by": current_user.get("sub"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.company_events.insert_one(event)
    event.pop("_id", None)
    return event

@router.put("/company-events/{event_id}")
async def update_company_event(
    event_id: str,
    data: CompanyEventUpdate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Admin: Atualizar um evento da empresa"""
    event = await db.company_events.find_one({"id": event_id})
    
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.company_events.update_one(
        {"id": event_id},
        {"$set": updates}
    )
    
    updated = await db.company_events.find_one({"id": event_id}, {"_id": 0})
    return updated

@router.delete("/company-events/{event_id}")
async def delete_company_event(
    event_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Admin: Excluir um evento da empresa"""
    result = await db.company_events.delete_one({"id": event_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    return {"message": "Evento excluído com sucesso"}
