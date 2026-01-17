from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from database import db
from auth import get_current_user, require_role
import uuid

router = APIRouter(prefix="/appointments", tags=["appointments"])

# ==================== MODELOS ====================

class AppointmentCreate(BaseModel):
    title: str
    date: str  # ISO format: 2025-01-20
    time: str  # HH:MM format
    category: str  # visita_cliente, reuniao, treinamento, lembrete, outro
    description: Optional[str] = None
    duration: Optional[str] = None  # Livre: "1 hora", "30 min", etc.

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
    appointment = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
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
    appointments = await db.appointments.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("date", 1).to_list(1000)
    return appointments

@router.get("/upcoming")
async def get_upcoming_appointments(
    current_user: dict = Depends(get_current_user)
):
    """Listar compromissos de hoje e dos próximos 3 dias"""
    today = datetime.now(timezone.utc).date()
    end_date = today + timedelta(days=3)
    
    appointments = await db.appointments.find(
        {
            "user_id": current_user["id"],
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
    """Listar compromissos de um mês específico"""
    start_date = f"{year}-{month:02d}-01"
    
    # Calcular último dia do mês
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    appointments = await db.appointments.find(
        {
            "user_id": current_user["id"],
            "date": {
                "$gte": start_date,
                "$lt": end_date
            }
        },
        {"_id": 0}
    ).sort([("date", 1), ("time", 1)]).to_list(500)
    
    return appointments

@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obter detalhes de um compromisso"""
    appointment = await db.appointments.find_one(
        {"id": appointment_id, "user_id": current_user["id"]},
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
    appointment = await db.appointments.find_one(
        {"id": appointment_id, "user_id": current_user["id"]}
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
    result = await db.appointments.delete_one(
        {"id": appointment_id, "user_id": current_user["id"]}
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
