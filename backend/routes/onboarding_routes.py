from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from models import SupervisorLink, FranchiseeRegistration, TrainingClass, TrainingClassCreate, FieldSaleNote
from auth import get_current_user, require_role, get_password_hash
import os
import secrets
from datetime import datetime, timedelta, timezone
import shutil
from pathlib import Path

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

DOCUMENTS_DIR = Path("/app/uploads/documents")
DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)

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

@router.post("/register")
async def register_franchisee(registration: FranchiseeRegistration):
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
        current_stage="documentos"
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
        "next_stage": "documentos"
    }

@router.post("/upload-document/{document_type}")
async def upload_document(
    document_type: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if document_type not in ["cpf", "rg", "comprovante_endereco"]:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido")
    
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if user.get("current_stage") != "documentos":
        raise HTTPException(status_code=400, detail="Etapa de documentos já foi concluída")
    
    file_extension = Path(file.filename).suffix
    if file_extension.lower() not in [".jpg", ".jpeg", ".png", ".pdf"]:
        raise HTTPException(status_code=400, detail="Formato de arquivo inválido")
    
    import uuid
    unique_filename = f"{current_user['sub']}_{document_type}_{uuid.uuid4()}{file_extension}"
    file_path = DOCUMENTS_DIR / unique_filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    document_url = f"/uploads/documents/{unique_filename}"
    
    documents_uploaded = user.get("documents_uploaded", [])
    
    documents_uploaded = [doc for doc in documents_uploaded if not doc.startswith(document_type)]
    documents_uploaded.append(f"{document_type}:{document_url}")
    
    await db.users.update_one(
        {"id": current_user["sub"]},
        {"$set": {"documents_uploaded": documents_uploaded}}
    )
    
    required_docs = ["cpf", "rg", "comprovante_endereco"]
    uploaded_types = [doc.split(":")[0] for doc in documents_uploaded]
    
    if all(doc_type in uploaded_types for doc_type in required_docs):
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
        "documents_uploaded": len(uploaded_types),
        "total_required": len(required_docs)
    }

@router.get("/my-stage")
async def get_my_stage(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return {
        "current_stage": user.get("current_stage", "completo"),
        "payment_status": user.get("payment_status"),
        "documents_uploaded": user.get("documents_uploaded", []),
        "field_sales_count": user.get("field_sales_count", 0),
        "training_attended": user.get("training_attended", False),
        "scheduled_training_date": user.get("scheduled_training_date")
    }

@router.post("/training-classes")
async def create_training_class(class_data: TrainingClassCreate, current_user: dict = Depends(require_role(["admin"]))):
    from datetime import datetime
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

@router.put("/approve-field-sales/{user_id}")
async def approve_field_sales(user_id: str, current_user: dict = Depends(require_role(["admin"]))):
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "field_sales_count": 10,
            "current_stage": "completo"
        }}
    )
    
    return {"message": "Vendas aprovadas. Licenciado agora tem acesso completo"}