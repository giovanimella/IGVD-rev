"""
Sistema de Gerenciamento de Treinamentos Presenciais
- Gerenciamento de turmas pelo admin
- Inscrição de licenciados
- Controle de presença
- Geração de lista de presença em PDF
"""
from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user, require_role
import uuid
import os
import io

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/training", tags=["training"])

# ==================== MODELOS ====================

class TrainingClassCreate(BaseModel):
    date: str  # Data do treinamento (YYYY-MM-DD)
    time: Optional[str] = "08:00"  # Horário de início
    capacity: int = 20  # Capacidade máxima
    location: Optional[str] = None  # Local do treinamento
    hotel_info: Optional[str] = None  # Informações do hotel

class TrainingClassUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    capacity: Optional[int] = None
    location: Optional[str] = None
    hotel_info: Optional[str] = None
    status: Optional[str] = None  # open, closed, completed, attendance_open

class TrainingConfigUpdate(BaseModel):
    days_before_closing: Optional[int] = None  # Dias antes do treinamento para fechar inscrições
    terms_and_conditions: Optional[str] = None  # Termos e condições
    training_instructions: Optional[str] = None  # Instruções do treinamento
    solo_price: Optional[float] = None  # Preço sozinho
    couple_price: Optional[float] = None  # Preço com cônjuge

class SpouseData(BaseModel):
    full_name: str
    phone: str
    email: EmailStr
    address: str
    city: str
    state: str
    zip_code: str
    cpf: str
    rg: str
    birth_date: str

class TrainingRegistration(BaseModel):
    full_name: str
    phone: str
    email: EmailStr
    address: str
    city: str
    state: str
    zip_code: str
    cpf: str
    rg: str
    birth_date: str
    has_spouse: bool = False
    spouse_data: Optional[SpouseData] = None
    terms_accepted: bool = False

# ==================== CONFIGURAÇÕES DO SISTEMA ====================

@router.get("/config")
async def get_training_config(current_user: dict = Depends(get_current_user)):
    """Obter configurações do sistema de treinamento"""
    config = await db.training_config.find_one({"id": "training_config"}, {"_id": 0})
    
    if not config:
        # Configuração padrão
        config = {
            "id": "training_config",
            "days_before_closing": 7,
            "terms_and_conditions": "Termos e condições do treinamento presencial...",
            "training_instructions": "Instruções para o treinamento...",
            "solo_price": 3500.00,
            "couple_price": 6000.00,
            "default_location": "",
            "default_hotel_info": ""
        }
        await db.training_config.insert_one(config)
    
    return config

@router.put("/config")
async def update_training_config(
    data: TrainingConfigUpdate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Atualizar configurações do sistema de treinamento"""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.training_config.update_one(
            {"id": "training_config"},
            {"$set": updates},
            upsert=True
        )
    
    return await get_training_config(current_user)

# ==================== GERENCIAMENTO DE TURMAS (ADMIN) ====================

@router.post("/classes")
async def create_training_class(
    data: TrainingClassCreate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Criar uma nova turma de treinamento"""
    # Obter configuração para data de fechamento
    config = await db.training_config.find_one({"id": "training_config"}, {"_id": 0})
    days_before = config.get("days_before_closing", 7) if config else 7
    
    # Calcular data de fechamento
    training_date = datetime.strptime(data.date, "%Y-%m-%d")
    closing_date = training_date - timedelta(days=days_before)
    
    training_class = {
        "id": str(uuid.uuid4()),
        "date": data.date,
        "time": data.time or "08:00",
        "capacity": data.capacity,
        "location": data.location or config.get("default_location", ""),
        "hotel_info": data.hotel_info or config.get("default_hotel_info", ""),
        "closing_date": closing_date.strftime("%Y-%m-%d"),
        "enrolled_count": 0,
        "status": "open",  # open, closed, completed
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["sub"]
    }
    
    await db.training_classes_v2.insert_one(training_class)
    training_class.pop("_id", None)
    
    return training_class

@router.get("/classes")
async def get_all_training_classes(
    status: Optional[str] = None,
    current_user: dict = Depends(require_role(["admin", "supervisor"]))
):
    """Listar todas as turmas de treinamento"""
    query = {}
    if status:
        query["status"] = status
    
    classes = await db.training_classes_v2.find(query, {"_id": 0}).sort("date", 1).to_list(100)
    
    # Adicionar contagem real de inscritos
    for cls in classes:
        registrations = await db.training_registrations.count_documents({
            "class_id": cls["id"],
            "payment_status": "paid"
        })
        cls["enrolled_count"] = registrations
        cls["available_spots"] = cls["capacity"] - registrations
    
    return classes

@router.get("/classes/available")
async def get_available_classes(current_user: dict = Depends(get_current_user)):
    """Listar turmas disponíveis para inscrição (licenciado)"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Turmas abertas cuja data de fechamento ainda não passou
    classes = await db.training_classes_v2.find({
        "status": "open",
        "closing_date": {"$gte": today}
    }, {"_id": 0}).sort("date", 1).to_list(100)
    
    available = []
    for cls in classes:
        registrations = await db.training_registrations.count_documents({
            "class_id": cls["id"],
            "payment_status": "paid"
        })
        if registrations < cls["capacity"]:
            cls["enrolled_count"] = registrations
            cls["available_spots"] = cls["capacity"] - registrations
            available.append(cls)
    
    return available

@router.get("/classes/{class_id}")
async def get_training_class(
    class_id: str,
    current_user: dict = Depends(require_role(["admin", "supervisor"]))
):
    """Obter detalhes de uma turma específica"""
    cls = await db.training_classes_v2.find_one({"id": class_id}, {"_id": 0})
    if not cls:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    
    # Buscar inscritos
    registrations = await db.training_registrations.find(
        {"class_id": class_id},
        {"_id": 0}
    ).to_list(100)
    
    # Enriquecer com dados do usuário
    for reg in registrations:
        user = await db.users.find_one(
            {"id": reg["user_id"]},
            {"_id": 0, "full_name": 1, "email": 1, "supervisor_id": 1}
        )
        if user:
            reg["user_full_name"] = user.get("full_name")
            reg["user_email"] = user.get("email")
            
            # Buscar nome do supervisor
            if user.get("supervisor_id"):
                supervisor = await db.users.find_one(
                    {"id": user["supervisor_id"]},
                    {"_id": 0, "full_name": 1}
                )
                reg["supervisor_name"] = supervisor.get("full_name") if supervisor else None
    
    cls["registrations"] = registrations
    cls["enrolled_count"] = len([r for r in registrations if r.get("payment_status") == "paid"])
    
    return cls

@router.put("/classes/{class_id}")
async def update_training_class(
    class_id: str,
    data: TrainingClassUpdate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Atualizar uma turma de treinamento"""
    cls = await db.training_classes_v2.find_one({"id": class_id})
    if not cls:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Se a data mudou, recalcular data de fechamento
    if "date" in updates:
        config = await db.training_config.find_one({"id": "training_config"}, {"_id": 0})
        days_before = config.get("days_before_closing", 7) if config else 7
        training_date = datetime.strptime(updates["date"], "%Y-%m-%d")
        closing_date = training_date - timedelta(days=days_before)
        updates["closing_date"] = closing_date.strftime("%Y-%m-%d")
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.training_classes_v2.update_one(
        {"id": class_id},
        {"$set": updates}
    )
    
    return await get_training_class(class_id, current_user)

@router.delete("/classes/{class_id}")
async def delete_training_class(
    class_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Excluir uma turma de treinamento"""
    cls = await db.training_classes_v2.find_one({"id": class_id})
    if not cls:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    
    # Verificar se há inscritos pagos
    paid_count = await db.training_registrations.count_documents({
        "class_id": class_id,
        "payment_status": "paid"
    })
    
    if paid_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir turma com {paid_count} inscritos pagos"
        )
    
    await db.training_classes_v2.delete_one({"id": class_id})
    await db.training_registrations.delete_many({"class_id": class_id})
    
    return {"message": "Turma excluída com sucesso"}

# ==================== INSCRIÇÃO DO LICENCIADO ====================

@router.get("/my-registration")
async def get_my_registration(current_user: dict = Depends(get_current_user)):
    """Obter inscrição atual do licenciado"""
    registration = await db.training_registrations.find_one(
        {"user_id": current_user["sub"]},
        {"_id": 0}
    )
    
    if registration:
        # Buscar dados da turma
        cls = await db.training_classes_v2.find_one(
            {"id": registration["class_id"]},
            {"_id": 0}
        )
        registration["training_class"] = cls
    
    # Buscar configuração
    config = await db.training_config.find_one({"id": "training_config"}, {"_id": 0})
    
    return {
        "registration": registration,
        "config": config
    }

@router.post("/register")
async def register_for_training(
    data: TrainingRegistration,
    current_user: dict = Depends(get_current_user)
):
    """Licenciado se inscreve para o treinamento presencial"""
    # Verificar se usuário está na etapa correta
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if user.get("current_stage") != "treinamento_presencial":
        raise HTTPException(status_code=400, detail="Você ainda não está na etapa de treinamento presencial")
    
    if not data.terms_accepted:
        raise HTTPException(status_code=400, detail="Você deve aceitar os termos e condições")
    
    # Verificar se já tem inscrição
    existing = await db.training_registrations.find_one({"user_id": current_user["sub"]})
    if existing:
        # Se já pagou, não pode se inscrever novamente
        if existing.get("payment_status") == "paid":
            raise HTTPException(status_code=400, detail="Você já está inscrito em uma turma")
        # Se não pagou, atualizar dados
        await db.training_registrations.delete_one({"user_id": current_user["sub"]})
    
    # Buscar configuração
    config = await db.training_config.find_one({"id": "training_config"}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=500, detail="Configurações não encontradas")
    
    # Calcular valor
    price = config.get("couple_price", 6000.00) if data.has_spouse else config.get("solo_price", 3500.00)
    
    # Encontrar turma disponível automaticamente
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    available_classes = await db.training_classes_v2.find({
        "status": "open",
        "closing_date": {"$gte": today}
    }, {"_id": 0}).sort("date", 1).to_list(100)
    
    assigned_class = None
    for cls in available_classes:
        enrolled = await db.training_registrations.count_documents({
            "class_id": cls["id"],
            "payment_status": "paid"
        })
        if enrolled < cls["capacity"]:
            assigned_class = cls
            break
    
    if not assigned_class:
        raise HTTPException(status_code=400, detail="Não há turmas disponíveis no momento")
    
    # Criar inscrição
    registration = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["sub"],
        "class_id": assigned_class["id"],
        "personal_data": {
            "full_name": data.full_name,
            "phone": data.phone,
            "email": data.email,
            "address": data.address,
            "city": data.city,
            "state": data.state,
            "zip_code": data.zip_code,
            "cpf": data.cpf,
            "rg": data.rg,
            "birth_date": data.birth_date
        },
        "has_spouse": data.has_spouse,
        "spouse_data": data.spouse_data.model_dump() if data.spouse_data else None,
        "price": price,
        "payment_status": "pending",  # pending, paid
        "payment_transaction_id": None,
        "terms_accepted": True,
        "terms_accepted_at": datetime.now(timezone.utc).isoformat(),
        "attendance_status": None,  # None, present, absent
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.training_registrations.insert_one(registration)
    registration.pop("_id", None)
    
    return {
        "message": "Inscrição realizada com sucesso",
        "registration": registration,
        "assigned_class": assigned_class,
        "price": price
    }

@router.post("/simulate-payment")
async def simulate_training_payment(current_user: dict = Depends(get_current_user)):
    """Simular pagamento do treinamento (modo teste)"""
    registration = await db.training_registrations.find_one(
        {"user_id": current_user["sub"]},
        {"_id": 0}
    )
    
    if not registration:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada")
    
    if registration.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Pagamento já realizado")
    
    # Simular pagamento bem-sucedido
    transaction_id = f"TRAINING_{uuid.uuid4().hex[:12].upper()}"
    
    await db.training_registrations.update_one(
        {"user_id": current_user["sub"]},
        {"$set": {
            "payment_status": "paid",
            "payment_transaction_id": transaction_id,
            "paid_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Pagamento simulado com sucesso",
        "transaction_id": transaction_id,
        "status": "paid"
    }

# ==================== CONTROLE DE PRESENÇA (ADMIN) ====================

@router.put("/registrations/{registration_id}/attendance")
async def mark_attendance(
    registration_id: str,
    present: bool,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Marcar presença ou ausência de um licenciado"""
    registration = await db.training_registrations.find_one({"id": registration_id})
    if not registration:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada")
    
    attendance_status = "present" if present else "absent"
    
    await db.training_registrations.update_one(
        {"id": registration_id},
        {"$set": {
            "attendance_status": attendance_status,
            "attendance_marked_at": datetime.now(timezone.utc).isoformat(),
            "attendance_marked_by": current_user["sub"]
        }}
    )
    
    # Se presente, avançar para próxima etapa (vendas_campo)
    if present:
        await db.users.update_one(
            {"id": registration["user_id"]},
            {"$set": {
                "current_stage": "vendas_campo",
                "training_attended": True
            }}
        )
    else:
        # Se ausente, manter na etapa mas precisa realocar
        # Limpar inscrição para permitir nova alocação
        await db.training_registrations.update_one(
            {"id": registration_id},
            {"$set": {
                "needs_reallocation": True,
                "class_id": None,  # Remove da turma atual
                "payment_status": "paid"  # Mantém como pago
            }}
        )
    
    return {
        "message": f"Presença marcada como {'presente' if present else 'ausente'}",
        "attendance_status": attendance_status,
        "advanced_to_next_stage": present
    }

@router.post("/registrations/{registration_id}/reallocate")
async def reallocate_registration(
    registration_id: str,
    class_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Realocar licenciado que faltou para outra turma"""
    registration = await db.training_registrations.find_one({"id": registration_id})
    if not registration:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada")
    
    # Verificar se a turma existe e tem vaga
    cls = await db.training_classes_v2.find_one({"id": class_id})
    if not cls:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    
    enrolled = await db.training_registrations.count_documents({
        "class_id": class_id,
        "payment_status": "paid"
    })
    
    if enrolled >= cls["capacity"]:
        raise HTTPException(status_code=400, detail="Turma sem vagas disponíveis")
    
    await db.training_registrations.update_one(
        {"id": registration_id},
        {"$set": {
            "class_id": class_id,
            "needs_reallocation": False,
            "attendance_status": None,
            "reallocated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Licenciado realocado com sucesso"}

@router.put("/classes/{class_id}/open-attendance")
async def open_attendance(
    class_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Marcar que o treinamento ocorreu e abrir página de presença"""
    cls = await db.training_classes_v2.find_one({"id": class_id})
    if not cls:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    
    # Atualizar status da turma para attendance_open (presença aberta)
    await db.training_classes_v2.update_one(
        {"id": class_id},
        {"$set": {
            "status": "attendance_open",
            "training_occurred": True,
            "training_occurred_at": datetime.now(timezone.utc).isoformat(),
            "training_occurred_by": current_user["sub"]
        }}
    )
    
    return {
        "message": "Treinamento marcado como realizado. Página de presença aberta.",
        "status": "attendance_open"
    }

@router.put("/classes/{class_id}/close-attendance")
async def close_attendance(
    class_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Finalizar marcação de presença e concluir turma"""
    cls = await db.training_classes_v2.find_one({"id": class_id})
    if not cls:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    
    # Verificar quantos não tiveram presença marcada
    not_marked = await db.training_registrations.count_documents({
        "class_id": class_id,
        "payment_status": "paid",
        "attendance_status": None
    })
    
    if not_marked > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Ainda há {not_marked} participante(s) sem presença marcada"
        )
    
    # Atualizar status da turma para completed
    await db.training_classes_v2.update_one(
        {"id": class_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Marcação de presença finalizada. Turma concluída.",
        "status": "completed"
    }

class AttendanceMarkRequest(BaseModel):
    registration_id: str
    attendance_status: str  # "present" ou "absent"

@router.put("/classes/{class_id}/mark-attendance")
async def mark_attendance(
    class_id: str,
    data: AttendanceMarkRequest,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Marcar presença de um participante"""
    cls = await db.training_classes_v2.find_one({"id": class_id})
    if not cls:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    
    if cls.get("status") != "attendance_open":
        raise HTTPException(status_code=400, detail="A marcação de presença não está aberta para esta turma")
    
    registration = await db.training_registrations.find_one({"id": data.registration_id})
    if not registration:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada")
    
    # Atualizar status de presença
    await db.training_registrations.update_one(
        {"id": data.registration_id},
        {"$set": {
            "attendance_status": data.attendance_status,
            "attendance_marked_at": datetime.now(timezone.utc).isoformat(),
            "attendance_marked_by": current_user["sub"]
        }}
    )
    
    # Se marcou como presente, avançar o licenciado para a etapa de vendas em campo
    if data.attendance_status == "present":
        user_id = registration.get("user_id")
        if user_id:
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            if user and user.get("current_stage") == "treinamento_presencial":
                await db.users.update_one(
                    {"id": user_id},
                    {"$set": {
                        "current_stage": "vendas_campo",
                        "training_completed_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                return {
                    "message": f"Presença marcada. {user.get('full_name')} avançou para etapa de Vendas em Campo.",
                    "advanced": True
                }
    elif data.attendance_status == "absent":
        # Realocar para próxima turma
        user_id = registration.get("user_id")
        if user_id:
            # Limpar a turma atual para permitir nova inscrição
            await db.training_registrations.update_one(
                {"id": data.registration_id},
                {"$set": {
                    "needs_reallocation": True,
                    "original_class_id": class_id
                }}
            )
            return {
                "message": "Falta registrada. Licenciado será realocado para próxima turma.",
                "advanced": False
            }
    
    return {
        "message": "Presença atualizada com sucesso.",
        "advanced": False
    }

@router.get("/classes/{class_id}/attendees")
async def get_class_attendees(
    class_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Obter lista de participantes com status de presença"""
    cls = await db.training_classes_v2.find_one({"id": class_id}, {"_id": 0})
    if not cls:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    
    registrations = await db.training_registrations.find(
        {"class_id": class_id, "payment_status": "paid"},
        {"_id": 0}
    ).to_list(1000)
    
    # Enriquecer com dados do usuário
    for reg in registrations:
        user = await db.users.find_one({"id": reg.get("user_id")}, {"_id": 0, "full_name": 1, "email": 1, "phone": 1})
        if user:
            reg["user_data"] = user
    
    return {
        "class": cls,
        "attendees": registrations
    }

# ==================== GERAÇÃO DE PDF - LISTA DE PRESENÇA ====================

@router.get("/classes/{class_id}/attendance-pdf")
async def generate_attendance_pdf(
    class_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Gerar PDF da lista de presença (3 dias)"""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
    from reportlab.lib.enums import TA_CENTER
    
    cls = await db.training_classes_v2.find_one({"id": class_id}, {"_id": 0})
    if not cls:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    
    # Buscar inscritos pagos
    registrations = await db.training_registrations.find({
        "class_id": class_id,
        "payment_status": "paid"
    }, {"_id": 0}).to_list(100)
    
    # Criar PDF em memória
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5*cm,
        leftMargin=1.5*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        alignment=TA_CENTER,
        spaceAfter=30
    )
    
    # Preparar dados da tabela
    header = ['#', 'Nome Completo', 'CPF', 'Cônjuge', 'Assinatura']
    
    data_rows = []
    for i, reg in enumerate(registrations, 1):
        personal = reg.get("personal_data", {})
        spouse_name = ""
        if reg.get("has_spouse") and reg.get("spouse_data"):
            spouse_name = reg["spouse_data"].get("full_name", "Sim")
        
        data_rows.append([
            str(i),
            personal.get("full_name", ""),
            personal.get("cpf", ""),
            spouse_name,
            ""  # Espaço para assinatura
        ])
    
    # Criar elementos do documento
    elements = []
    
    # Formatar data
    training_date = datetime.strptime(cls["date"], "%Y-%m-%d")
    formatted_date = training_date.strftime("%d/%m/%Y")
    
    # Gerar 3 páginas (uma para cada dia)
    for day in range(1, 4):
        # Calcular data do dia
        day_date = training_date + timedelta(days=day-1)
        day_formatted = day_date.strftime("%d/%m/%Y")
        
        # Título
        title = Paragraph(f"Lista de Presença - Dia {day:02d}", title_style)
        elements.append(title)
        
        # Subtítulo com informações
        subtitle = Paragraph(
            f"Treinamento Presencial - {day_formatted}<br/>"
            f"Local: {cls.get('location', 'A definir')}<br/>"
            f"Horário: {cls.get('time', '08:00')}",
            subtitle_style
        )
        elements.append(subtitle)
        
        # Tabela
        table_data = [header] + data_rows
        
        col_widths = [1*cm, 7*cm, 3.5*cm, 3.5*cm, 3*cm]
        
        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0891b2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWHEIGHT', (0, 1), (-1, -1), 25),
        ]))
        
        elements.append(table)
        
        # Espaço para observações
        elements.append(Spacer(1, 30))
        obs = Paragraph("<b>Observações:</b> _" + "_" * 80, styles['Normal'])
        elements.append(obs)
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("_" * 90, styles['Normal']))
        
        # Quebra de página (exceto na última)
        if day < 3:
            elements.append(PageBreak())
    
    # Gerar PDF
    doc.build(elements)
    buffer.seek(0)
    
    # Nome do arquivo
    filename = f"lista_presenca_turma_{cls['date']}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

# ==================== VISUALIZAÇÃO SUPERVISOR ====================

@router.get("/supervisor/licensees")
async def get_supervisor_licensees_training(
    current_user: dict = Depends(require_role(["admin", "supervisor"]))
):
    """Supervisor visualiza status de treinamento dos seus licenciados"""
    query = {}
    if current_user["role"] == "supervisor":
        query["supervisor_id"] = current_user["sub"]
    
    # Buscar licenciados
    licensees = await db.users.find(
        {**query, "role": "licenciado"},
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "current_stage": 1}
    ).to_list(500)
    
    # Enriquecer com dados de inscrição
    for licensee in licensees:
        registration = await db.training_registrations.find_one(
            {"user_id": licensee["id"]},
            {"_id": 0}
        )
        if registration:
            licensee["training_registration"] = registration
            
            # Buscar dados da turma
            if registration.get("class_id"):
                cls = await db.training_classes_v2.find_one(
                    {"id": registration["class_id"]},
                    {"_id": 0, "date": 1, "time": 1, "location": 1}
                )
                licensee["training_class"] = cls
    
    return licensees
