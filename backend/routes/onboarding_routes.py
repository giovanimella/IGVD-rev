from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from models import SupervisorLink, LicenseeRegistration, TrainingClass, TrainingClassCreate, FieldSaleNote
from auth import get_current_user, require_role, get_password_hash
import os
import uuid
import secrets
from datetime import datetime, timedelta, timezone
import shutil
from pathlib import Path
from typing import Optional

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

DOCUMENTS_DIR = Path("/app/uploads/documents")
DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)

# ==================== ESTÁGIOS DO ONBOARDING ====================
# registro -> documentos_pf -> pagamento -> agendamento -> treinamento_presencial -> vendas_campo -> documentos_pj -> completo

STAGES_ORDER = [
    "registro",
    "documentos_pf",
    "pagamento",
    "agendamento",
    "treinamento_presencial",
    "vendas_campo",
    "documentos_pj",
    "completo"
]


# ==================== LINKS DE SUPERVISOR ====================

@router.post("/supervisor-links")
async def create_supervisor_link(current_user: dict = Depends(require_role(["admin", "supervisor"]))):
    existing = await db.supervisor_links.find_one({
        "supervisor_id": current_user["sub"],
        "active": True
    }, {"_id": 0})
    
    if existing:
        return existing
    
    link = SupervisorLink(supervisor_id=current_user["sub"])
    await db.supervisor_links.insert_one(link.model_dump())
    
    return link


@router.get("/supervisor-links/my")
async def get_my_supervisor_link(current_user: dict = Depends(require_role(["admin", "supervisor"]))):
    link = await db.supervisor_links.find_one({
        "supervisor_id": current_user["sub"],
        "active": True
    }, {"_id": 0})
    
    if not link:
        link = SupervisorLink(supervisor_id=current_user["sub"])
        await db.supervisor_links.insert_one(link.model_dump())
    
    return link


@router.get("/supervisor-links/{token}/validate")
async def validate_supervisor_link(token: str):
    link = await db.supervisor_links.find_one({"token": token, "active": True}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Link inválido ou expirado")
    
    supervisor = await db.users.find_one({"id": link["supervisor_id"]}, {"_id": 0, "password_hash": 0})
    
    return {
        "valid": True,
        "supervisor_name": supervisor.get("full_name") if supervisor else "Supervisor"
    }


# ==================== REGISTRO ====================

@router.post("/register")
async def register_licensee(registration: LicenseeRegistration):
    link = await db.supervisor_links.find_one({
        "token": registration.registration_token,
        "active": True
    }, {"_id": 0})
    
    if not link:
        raise HTTPException(status_code=400, detail="Link de registro inválido")
    
    existing = await db.users.find_one({"email": registration.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    from models import User
    user = User(
        email=registration.email,
        full_name=registration.full_name,
        phone=registration.phone,
        role="licenciado",
        supervisor_id=link["supervisor_id"],
        registration_link_token=registration.registration_token,
        current_stage="documentos_pf"  # Começa na etapa de documentos PF
    )
    
    user_dict = user.model_dump()
    user_dict["password_hash"] = get_password_hash(registration.password)
    
    await db.users.insert_one(user_dict)
    
    await db.supervisor_links.update_one(
        {"token": registration.registration_token},
        {"$inc": {"registrations_count": 1}}
    )
    
    return {
        "message": "Cadastro realizado com sucesso",
        "user_id": user.id,
        "next_stage": "documentos_pf"
    }


# ==================== DOCUMENTOS PESSOA FÍSICA ====================

@router.post("/documents/pf/{document_type}")
async def upload_document_pf(
    document_type: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload de documento de Pessoa Física (RG, CPF, Comprovante de Residência)"""
    
    valid_types = ["rg", "cpf", "comprovante_residencia"]
    if document_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Tipo inválido. Use: {', '.join(valid_types)}")
    
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar se está na etapa correta
    if user.get("current_stage") not in ["documentos_pf", "documentos"]:
        raise HTTPException(status_code=400, detail="Você não está na etapa de documentos PF")
    
    # Validar arquivo
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in [".jpg", ".jpeg", ".png", ".pdf"]:
        raise HTTPException(status_code=400, detail="Formato inválido. Use JPG, PNG ou PDF")
    
    # Criar pasta do usuário
    user_folder = DOCUMENTS_DIR / current_user["sub"] / "pessoa_fisica"
    user_folder.mkdir(parents=True, exist_ok=True)
    
    # Salvar arquivo
    unique_filename = f"{document_type}_{uuid.uuid4().hex[:8]}{file_extension}"
    file_path = user_folder / unique_filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    document_url = f"/api/uploads/documents/{current_user['sub']}/pessoa_fisica/{unique_filename}"
    
    # Atualizar documentos do usuário
    documents_pf = user.get("documents_pf", {})
    documents_pf[document_type] = {
        "url": document_url,
        "filename": file.filename,
        "uploaded_at": datetime.now().isoformat()
    }
    
    await db.users.update_one(
        {"id": current_user["sub"]},
        {"$set": {"documents_pf": documents_pf}}
    )
    
    # Verificar se todos os documentos foram enviados
    required_docs = ["rg", "cpf", "comprovante_residencia"]
    all_uploaded = all(doc in documents_pf for doc in required_docs)
    
    if all_uploaded:
        await db.users.update_one(
            {"id": current_user["sub"]},
            {"$set": {"current_stage": "pagamento"}}
        )
        return {
            "message": "Documento enviado com sucesso",
            "next_stage": "pagamento",
            "all_documents_uploaded": True
        }
    
    return {
        "message": "Documento enviado com sucesso",
        "document_type": document_type,
        "uploaded_count": len(documents_pf),
        "total_required": len(required_docs)
    }


@router.get("/documents/pf")
async def get_documents_pf(current_user: dict = Depends(get_current_user)):
    """Lista documentos PF do usuário logado"""
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "documents_pf": 1})
    return user.get("documents_pf", {}) if user else {}


# ==================== DOCUMENTOS PESSOA JURÍDICA ====================

@router.post("/documents/pj/{document_type}")
async def upload_document_pj(
    document_type: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload de documento de Pessoa Jurídica (Cartão CNPJ, Contrato Social)"""
    
    valid_types = ["cartao_cnpj", "contrato_social"]
    if document_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Tipo inválido. Use: {', '.join(valid_types)}")
    
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar se está na etapa correta
    if user.get("current_stage") != "documentos_pj":
        raise HTTPException(status_code=400, detail="Você não está na etapa de documentos PJ")
    
    # Validar arquivo
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in [".jpg", ".jpeg", ".png", ".pdf"]:
        raise HTTPException(status_code=400, detail="Formato inválido. Use JPG, PNG ou PDF")
    
    # Criar pasta do usuário
    user_folder = DOCUMENTS_DIR / current_user["sub"] / "pessoa_juridica"
    user_folder.mkdir(parents=True, exist_ok=True)
    
    # Salvar arquivo
    unique_filename = f"{document_type}_{uuid.uuid4().hex[:8]}{file_extension}"
    file_path = user_folder / unique_filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    document_url = f"/api/uploads/documents/{current_user['sub']}/pessoa_juridica/{unique_filename}"
    
    # Atualizar documentos do usuário
    documents_pj = user.get("documents_pj", {})
    documents_pj[document_type] = {
        "url": document_url,
        "filename": file.filename,
        "uploaded_at": datetime.now().isoformat()
    }
    
    await db.users.update_one(
        {"id": current_user["sub"]},
        {"$set": {"documents_pj": documents_pj}}
    )
    
    # Verificar se todos os documentos foram enviados
    required_docs = ["cartao_cnpj", "contrato_social"]
    all_uploaded = all(doc in documents_pj for doc in required_docs)
    
    if all_uploaded:
        # Etapa final - marcar como completo
        await db.users.update_one(
            {"id": current_user["sub"]},
            {"$set": {"current_stage": "completo"}}
        )
        
        # Disparar webhook de conclusão
        from routes.webhook_routes import send_webhook_notification
        await send_webhook_notification(current_user["sub"], user.get("full_name", ""))
        
        return {
            "message": "Documento enviado com sucesso",
            "next_stage": "completo",
            "all_documents_uploaded": True
        }
    
    return {
        "message": "Documento enviado com sucesso",
        "document_type": document_type,
        "uploaded_count": len(documents_pj),
        "total_required": len(required_docs)
    }


@router.get("/documents/pj")
async def get_documents_pj(current_user: dict = Depends(get_current_user)):
    """Lista documentos PJ do usuário logado"""
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "documents_pj": 1})
    return user.get("documents_pj", {}) if user else {}


# ==================== ACESSO SUPERVISOR AOS DOCUMENTOS ====================

@router.get("/supervisor/licensee/{user_id}/documents")
async def get_licensee_documents(
    user_id: str,
    current_user: dict = Depends(require_role(["admin", "supervisor"]))
):
    """Supervisor/Admin visualiza documentos de um licenciado"""
    
    # Buscar o licenciado
    licensee = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not licensee:
        raise HTTPException(status_code=404, detail="Licenciado não encontrado")
    
    # Verificar se é supervisor deste licenciado (ou admin)
    if current_user["role"] == "supervisor":
        if licensee.get("supervisor_id") != current_user["sub"]:
            raise HTTPException(status_code=403, detail="Você não é o supervisor deste licenciado")
    
    return {
        "user_id": user_id,
        "full_name": licensee.get("full_name"),
        "email": licensee.get("email"),
        "current_stage": licensee.get("current_stage"),
        "documents_pf": licensee.get("documents_pf", {}),
        "documents_pj": licensee.get("documents_pj", {})
    }


# ==================== ESTÁGIO ATUAL ====================

@router.get("/my-stage")
async def get_my_stage(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Compatibilidade com estágio antigo
    current_stage = user.get("current_stage", "completo")
    if current_stage == "documentos":
        current_stage = "documentos_pf"
    
    return {
        "current_stage": current_stage,
        "payment_status": user.get("payment_status"),
        "documents_pf": user.get("documents_pf", {}),
        "documents_pj": user.get("documents_pj", {}),
        "documents_uploaded": user.get("documents_uploaded", []),  # Compatibilidade
        "field_sales_count": user.get("field_sales_count", 0),
        "training_attended": user.get("training_attended", False),
        "scheduled_training_date": user.get("scheduled_training_date")
    }


# ==================== ENDPOINT ANTIGO - COMPATIBILIDADE ====================

@router.post("/upload-document/{document_type}")
async def upload_document_legacy(
    document_type: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Endpoint legado - redireciona para o novo sistema de documentos PF"""
    
    # Mapear nomes antigos para novos
    type_mapping = {
        "cpf": "cpf",
        "rg": "rg",
        "comprovante_endereco": "comprovante_residencia"
    }
    
    if document_type not in type_mapping:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido")
    
    new_type = type_mapping[document_type]
    return await upload_document_pf(new_type, file, current_user)


# ==================== TURMAS DE TREINAMENTO ====================

@router.post("/training-classes")
async def create_training_class(class_data: TrainingClassCreate, current_user: dict = Depends(require_role(["admin"]))):
    training_date = datetime.fromisoformat(class_data.date)
    closes_at = (training_date - timedelta(days=10)).isoformat()
    
    training_class = TrainingClass(
        date=class_data.date,
        capacity=class_data.capacity,
        closes_at=closes_at
    )
    
    await db.training_classes.insert_one(training_class.model_dump())
    return training_class


@router.get("/training-classes")
async def get_available_training_classes(current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    
    classes = await db.training_classes.find({
        "status": "open",
        "closes_at": {"$gt": now}
    }, {"_id": 0}).sort("date", 1).to_list(100)
    
    for cls in classes:
        cls["available_spots"] = cls["capacity"] - cls["enrolled_count"]
    
    return classes


@router.post("/schedule-training/{class_id}")
async def schedule_training(class_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if user.get("current_stage") != "agendamento":
        raise HTTPException(status_code=400, detail="Você ainda não pode agendar o treinamento")
    
    training_class = await db.training_classes.find_one({"id": class_id}, {"_id": 0})
    if not training_class:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    
    if training_class["enrolled_count"] >= training_class["capacity"]:
        raise HTTPException(status_code=400, detail="Turma lotada")
    
    if training_class["status"] != "open":
        raise HTTPException(status_code=400, detail="Turma não está disponível para agendamento")
    
    await db.users.update_one(
        {"id": current_user["sub"]},
        {"$set": {
            "training_class_id": class_id,
            "scheduled_training_date": training_class["date"],
            "current_stage": "treinamento_presencial"
        }}
    )
    
    await db.training_classes.update_one(
        {"id": class_id},
        {"$inc": {"enrolled_count": 1}}
    )
    
    return {"message": "Treinamento agendado com sucesso", "training_date": training_class["date"]}


# ==================== VENDAS EM CAMPO ====================

@router.post("/field-sales/note")
async def add_field_sale_note(note_data: FieldSaleNote, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if user.get("current_stage") != "vendas_campo":
        raise HTTPException(status_code=400, detail="Você ainda não está na etapa de vendas")
    
    if note_data.sale_number < 1 or note_data.sale_number > 10:
        raise HTTPException(status_code=400, detail="Número de venda inválido (1-10)")
    
    field_sales_notes = user.get("field_sales_notes", [])
    
    field_sales_notes = [note for note in field_sales_notes if note.get("sale_number") != note_data.sale_number]
    field_sales_notes.append(note_data.model_dump())
    
    await db.users.update_one(
        {"id": current_user["sub"]},
        {"$set": {"field_sales_notes": field_sales_notes}}
    )
    
    return {"message": "Anotação salva com sucesso"}


@router.get("/field-sales/notes")
async def get_field_sales_notes(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return user.get("field_sales_notes", [])


# ==================== ADMIN - MARCAR PRESENÇA ====================

@router.put("/mark-training-attendance/{user_id}")
async def mark_training_attendance(user_id: str, attended: bool, current_user: dict = Depends(require_role(["admin"]))):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    updates = {"training_attended": attended}
    
    if attended:
        updates["current_stage"] = "vendas_campo"
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": updates}
    )
    
    return {"message": "Presença atualizada com sucesso"}


# ==================== ADMIN - APROVAR VENDAS ====================

@router.put("/approve-field-sales/{user_id}")
async def approve_field_sales(user_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """Aprovar vendas em campo - avança para documentos PJ"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "field_sales_count": 10,
            "current_stage": "documentos_pj"  # Agora vai para documentos PJ, não completo
        }}
    )
    
    return {"message": "Vendas aprovadas. Licenciado deve enviar documentos PJ."}


# ==================== ADMIN - COMPLETAR MANUALMENTE ====================

@router.put("/complete-onboarding/{user_id}")
async def complete_onboarding_manually(user_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """Admin completa o onboarding manualmente"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if user.get("current_stage") == "completo":
        raise HTTPException(status_code=400, detail="Onboarding já está completo")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"current_stage": "completo"}}
    )
    
    # Disparar webhook de conclusão
    from routes.webhook_routes import send_webhook_notification
    await send_webhook_notification(user_id, user.get("full_name", ""))
    
    return {"message": "Onboarding concluído manualmente"}
