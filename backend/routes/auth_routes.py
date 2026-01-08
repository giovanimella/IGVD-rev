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
            <h2 style="color: #06b6d4;">Redefinição de Senha - Ozoxx</h2>
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
            "subject": "Redefinição de Senha - Ozoxx",
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