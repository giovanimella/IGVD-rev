from fastapi import APIRouter, HTTPException, Depends, Request
from motor.motor_asyncio import AsyncIOMotorClient
from models import DigitalTerm, DigitalTermCreate, TermAcceptance
from auth import get_current_user, require_role
import os
from datetime import datetime
from pathlib import Path
import uuid

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/terms", tags=["terms"])


# ==================== ADMIN - GERENCIAR TERMOS ====================

@router.get("/admin/all")
async def get_all_terms(
    current_user: dict = Depends(require_role(["admin"]))
):
    """Lista todos os termos (admin)"""
    terms = await db.digital_terms.find({}).sort("created_at", -1).to_list(100)
    
    for term in terms:
        term["_id"] = str(term.get("_id", ""))
        # Contar aceites
        term["acceptance_count"] = await db.term_acceptances.count_documents({"term_id": term["id"]})
    
    return {"terms": terms}


@router.post("/admin")
async def create_term(
    term_data: DigitalTermCreate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Criar novo termo (admin)"""
    # Se o novo termo for ativo, desativar os outros
    if term_data.is_active:
        await db.digital_terms.update_many(
            {"is_active": True},
            {"$set": {"is_active": False, "updated_at": datetime.now().isoformat()}}
        )
    
    term = DigitalTerm(
        title=term_data.title,
        content=term_data.content,
        version=term_data.version,
        is_active=term_data.is_active,
        is_required=term_data.is_required,
        created_by=current_user["sub"]
    )
    
    await db.digital_terms.insert_one(term.model_dump())
    
    return {"message": "Termo criado com sucesso", "term": term.model_dump()}


@router.put("/admin/{term_id}")
async def update_term(
    term_id: str,
    updates: dict,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Atualizar termo (admin)"""
    term = await db.digital_terms.find_one({"id": term_id})
    
    if not term:
        raise HTTPException(status_code=404, detail="Termo não encontrado")
    
    # Se está ativando este termo, desativar os outros
    if updates.get("is_active", False) and not term.get("is_active", False):
        await db.digital_terms.update_many(
            {"is_active": True, "id": {"$ne": term_id}},
            {"$set": {"is_active": False, "updated_at": datetime.now().isoformat()}}
        )
    
    updates["updated_at"] = datetime.now().isoformat()
    
    await db.digital_terms.update_one(
        {"id": term_id},
        {"$set": updates}
    )
    
    return {"message": "Termo atualizado com sucesso"}


@router.delete("/admin/{term_id}")
async def delete_term(
    term_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Excluir termo (admin)"""
    term = await db.digital_terms.find_one({"id": term_id})
    
    if not term:
        raise HTTPException(status_code=404, detail="Termo não encontrado")
    
    # Verificar se há aceites
    acceptance_count = await db.term_acceptances.count_documents({"term_id": term_id})
    
    if acceptance_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Não é possível excluir termo com {acceptance_count} aceites. Desative-o em vez disso."
        )
    
    await db.digital_terms.delete_one({"id": term_id})
    
    return {"message": "Termo excluído com sucesso"}


@router.get("/admin/{term_id}/acceptances")
async def get_term_acceptances(
    term_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Listar aceites de um termo (admin)"""
    term = await db.digital_terms.find_one({"id": term_id})
    
    if not term:
        raise HTTPException(status_code=404, detail="Termo não encontrado")
    
    acceptances = await db.term_acceptances.find(
        {"term_id": term_id}
    ).sort("accepted_at", -1).to_list(1000)
    
    for acceptance in acceptances:
        acceptance["_id"] = str(acceptance.get("_id", ""))
    
    return {
        "term": {"id": term["id"], "title": term["title"], "version": term["version"]},
        "acceptances": acceptances,
        "total": len(acceptances)
    }


# ==================== USUÁRIO - VER E ACEITAR TERMOS ====================

@router.get("/active")
async def get_active_term(
    current_user: dict = Depends(get_current_user)
):
    """Buscar termo ativo atual"""
    term = await db.digital_terms.find_one(
        {"is_active": True},
        {"_id": 0}
    )
    
    if not term:
        return {"term": None, "needs_acceptance": False}
    
    # Verificar se usuário já aceitou este termo
    acceptance = await db.term_acceptances.find_one({
        "user_id": current_user["id"],
        "term_id": term["id"]
    })
    
    return {
        "term": term,
        "needs_acceptance": acceptance is None and term.get("is_required", True),
        "already_accepted": acceptance is not None,
        "accepted_at": acceptance["accepted_at"] if acceptance else None
    }


@router.get("/check")
async def check_terms_status(
    current_user: dict = Depends(get_current_user)
):
    """Verificar se usuário precisa aceitar termos"""
    term = await db.digital_terms.find_one({"is_active": True, "is_required": True})
    
    if not term:
        return {"needs_acceptance": False}
    
    acceptance = await db.term_acceptances.find_one({
        "user_id": current_user["id"],
        "term_id": term["id"]
    })
    
    return {
        "needs_acceptance": acceptance is None,
        "term_id": term["id"] if acceptance is None else None,
        "term_title": term["title"] if acceptance is None else None
    }


@router.post("/accept")
async def accept_term(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Aceitar termo ativo"""
    term = await db.digital_terms.find_one({"is_active": True})
    
    if not term:
        raise HTTPException(status_code=404, detail="Nenhum termo ativo encontrado")
    
    # Verificar se já aceitou
    existing_acceptance = await db.term_acceptances.find_one({
        "user_id": current_user["id"],
        "term_id": term["id"]
    })
    
    if existing_acceptance:
        raise HTTPException(status_code=400, detail="Você já aceitou este termo")
    
    # Registrar aceite
    acceptance = TermAcceptance(
        user_id=current_user["id"],
        user_name=current_user["full_name"],
        user_email=current_user["email"],
        term_id=term["id"],
        term_version=term["version"],
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    await db.term_acceptances.insert_one(acceptance.model_dump())
    
    # Atualizar usuário
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "terms_accepted": True,
            "terms_accepted_at": acceptance.accepted_at,
            "updated_at": datetime.now().isoformat()
        }}
    )
    
    return {
        "message": "Termo aceito com sucesso",
        "acceptance": acceptance.model_dump()
    }


@router.get("/my-acceptances")
async def get_my_acceptances(
    current_user: dict = Depends(get_current_user)
):
    """Listar meus aceites de termos"""
    acceptances = await db.term_acceptances.find(
        {"user_id": current_user["id"]}
    ).sort("accepted_at", -1).to_list(100)
    
    # Buscar detalhes dos termos
    for acceptance in acceptances:
        acceptance["_id"] = str(acceptance.get("_id", ""))
        term = await db.digital_terms.find_one({"id": acceptance["term_id"]}, {"_id": 0, "title": 1, "version": 1})
        if term:
            acceptance["term_title"] = term["title"]
    
    return {"acceptances": acceptances}


@router.get("/download/{acceptance_id}")
async def download_acceptance(
    acceptance_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Gerar comprovante de aceite para download"""
    acceptance = await db.term_acceptances.find_one({"id": acceptance_id})
    
    if not acceptance:
        raise HTTPException(status_code=404, detail="Aceite não encontrado")
    
    # Verificar se é do usuário atual ou admin
    if acceptance["user_id"] != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    # Buscar termo
    term = await db.digital_terms.find_one({"id": acceptance["term_id"]}, {"_id": 0})
    
    if not term:
        raise HTTPException(status_code=404, detail="Termo não encontrado")
    
    # Retornar dados para gerar PDF no frontend
    return {
        "acceptance": {
            "id": acceptance["id"],
            "user_name": acceptance["user_name"],
            "user_email": acceptance["user_email"],
            "accepted_at": acceptance["accepted_at"],
            "ip_address": acceptance.get("ip_address"),
            "user_agent": acceptance.get("user_agent")
        },
        "term": {
            "title": term["title"],
            "version": term["version"],
            "content": term["content"]
        }
    }
