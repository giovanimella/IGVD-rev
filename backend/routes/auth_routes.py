from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from models import (
    UserLogin, UserCreate, User, UserResponse, 
    PasswordResetRequest, PasswordResetConfirm
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, require_role
)
import os
import secrets
from datetime import datetime, timedelta, timezone
import asyncio
import resend
import pandas as pd
import io

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

router = APIRouter(prefix="/auth", tags=["auth"])

async def get_platform_name():
    """Busca o nome da plataforma das configurações do sistema"""
    config = await db.system_config.find_one({"id": "system_config"})
    return config.get("platform_name", "UniOzoxx") if config else "UniOzoxx"

@router.post("/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")
    
    access_token = create_access_token(data={
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"]
    })
    
    # Registrar acesso
    from models import UserAccess
    access = UserAccess(user_id=user["id"])
    await db.user_accesses.insert_one(access.model_dump())
    
    # Atualizar streak
    from routes.gamification_routes import update_user_streak
    await update_user_streak(user["id"])
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "points": user.get("points", 0),
            "level_title": user.get("level_title", "Iniciante")
        }
    }

@router.post("/request-reset")
async def request_password_reset(request: PasswordResetRequest):
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user:
        return {"message": "Se o email existir, um link de redefinição será enviado"}
    
    reset_token = secrets.token_urlsafe(32)
    reset_token_expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    
    await db.users.update_one(
        {"email": request.email},
        {"$set": {
            "reset_token": reset_token,
            "reset_token_expires": reset_token_expires
        }}
    )
    
    reset_link = f"{FRONTEND_URL}/reset-password/{reset_token}"
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #06b6d4;">Redefinição de Senha - UniOzoxx</h2>
            <p>Olá {user['full_name']},</p>
            <p>Você solicitou a redefinição de senha. Clique no link abaixo para definir uma nova senha:</p>
            <a href="{reset_link}" style="background-color: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">Redefinir Senha</a>
            <p>Este link expira em 1 hora.</p>
            <p>Se você não solicitou esta redefinição, ignore este email.</p>
        </body>
    </html>
    """
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [request.email],
            "subject": "Redefinição de Senha - UniOzoxx",
            "html": html_content
        }
        await asyncio.to_thread(resend.Emails.send, params)
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
    
    return {"message": "Se o email existir, um link de redefinição será enviado"}

@router.post("/reset-password")
async def reset_password(request: PasswordResetConfirm):
    user = await db.users.find_one({
        "reset_token": request.token
    }, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    
    expires = datetime.fromisoformat(user["reset_token_expires"])
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expirado")
    
    new_password_hash = get_password_hash(request.new_password)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "password_hash": new_password_hash,
            "reset_token": None,
            "reset_token_expires": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Senha redefinida com sucesso"}


@router.post("/set-password")
async def set_initial_password(request: PasswordResetConfirm):
    """Define a senha inicial para usuários cadastrados via webhook"""
    user = await db.users.find_one({
        "password_token": request.token
    }, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    
    # Verificar expiração
    expires = user.get("password_token_expires", 0)
    if datetime.now().timestamp() > expires:
        raise HTTPException(status_code=400, detail="Token expirado. Solicite um novo cadastro.")
    
    new_password_hash = get_password_hash(request.new_password)
    
    # Determinar próximo estágio baseado no kit_type
    # Kit Master: mantém em "completo" (já definido no cadastro)
    # Kit Senior: avança para documentos_pf
    kit_type = user.get("kit_type", "senior")
    current_stage = user.get("current_stage", "registro")
    
    if kit_type == "master":
        # Kit Master mantém como completo
        next_stage = "completo"
    else:
        # Kit Senior segue fluxo normal
        next_stage = "documentos_pf"
    
    # Atualizar senha e avançar para próxima etapa
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "password_hash": new_password_hash,
            "password_token": None,
            "password_token_expires": None,
            "current_stage": next_stage,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Senha definida com sucesso! Você já pode fazer login."}