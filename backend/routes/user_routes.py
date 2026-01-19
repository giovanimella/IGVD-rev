from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from models import UserCreate, User, UserResponse
from auth import get_current_user, require_role, get_password_hash, verify_password
import os
import pandas as pd
import io
import secrets
from datetime import datetime, timedelta, timezone
import asyncio
import resend

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

router = APIRouter(prefix="/users", tags=["users"])

async def get_platform_name():
    """Busca o nome da plataforma das configurações do sistema"""
    config = await db.system_config.find_one({"id": "system_config"})
    return config.get("platform_name", "UniOzoxx") if config else "UniOzoxx"

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user

@router.get("/", response_model=list[UserResponse])
async def get_all_users(current_user: dict = Depends(require_role(["admin", "supervisor"]))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0, "reset_token": 0}).to_list(1000)
    return users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: dict = Depends(require_role(["admin", "supervisor"]))):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user

@router.post("/", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: dict = Depends(require_role(["admin"]))):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Usar senha fornecida ou gerar temporária
    password = user_data.password if user_data.password else secrets.token_urlsafe(12)
    
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        phone=user_data.phone,
        supervisor_id=user_data.supervisor_id
    )
    
    user_dict = user.model_dump()
    user_dict["password_hash"] = get_password_hash(password)
    
    await db.users.insert_one(user_dict)
    
    user_dict.pop("password_hash", None)
    return user_dict

@router.put("/{user_id}")
async def update_user(user_id: str, updates: dict, current_user: dict = Depends(require_role(["admin", "supervisor"]))):
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Se houver senha, fazer hash
    if "password" in updates and updates["password"]:
        updates["password_hash"] = get_password_hash(updates["password"])
        del updates["password"]
    elif "password" in updates:
        del updates["password"]
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return {"message": "Usuário atualizado com sucesso"}

@router.delete("/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {"message": "Usuário deletado com sucesso"}

@router.put("/{user_id}/password")
async def update_password(user_id: str, password_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["sub"] != user_id and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if current_user["sub"] == user_id:
        if not verify_password(password_data.get("current_password", ""), user["password_hash"]):
            raise HTTPException(status_code=400, detail="Senha atual incorreta")
    
    new_password_hash = get_password_hash(password_data["new_password"])
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "password_hash": new_password_hash,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Senha atualizada com sucesso"}

@router.post("/import")
async def import_users(file: UploadFile = File(...), current_user: dict = Depends(require_role(["admin"]))):
    """Importar usuários de arquivo CSV ou XLSX"""
    
    filename = file.filename.lower()
    contents = await file.read()
    
    # Detectar formato e carregar DataFrame
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Formato não suportado. Use CSV ou XLSX")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao ler arquivo: {str(e)}")
    
    required_columns = ['email', 'full_name']
    if not all(col in df.columns for col in required_columns):
        raise HTTPException(status_code=400, detail=f"Arquivo deve conter as colunas: {', '.join(required_columns)}")
    
    imported = 0
    errors = []
    
    for _, row in df.iterrows():
        try:
            email = str(row['email']).strip()
            full_name = str(row['full_name']).strip()
            
            if not email or email == 'nan' or '@' not in email:
                errors.append(f"Email inválido: {email}")
                continue
            
            existing = await db.users.find_one({"email": email})
            if existing:
                errors.append(f"{email}: já cadastrado")
                continue
            
            # Campos opcionais
            phone = str(row.get('phone', '')).strip() if pd.notna(row.get('phone')) else None
            role = str(row.get('role', 'licenciado')).strip().lower() if pd.notna(row.get('role')) else 'licenciado'
            password = str(row.get('password', '')).strip() if pd.notna(row.get('password')) else None
            
            # Validar role
            if role not in ['licenciado', 'supervisor', 'admin']:
                role = 'licenciado'
            
            user = User(
                email=email,
                full_name=full_name,
                role=role,
                phone=phone if phone and phone != 'nan' else None
            )
            
            user_dict = user.model_dump()
            
            # Usar senha fornecida ou gerar temporária
            if password and password != 'nan':
                user_dict["password_hash"] = get_password_hash(password)
            else:
                user_dict["password_hash"] = get_password_hash(secrets.token_urlsafe(12))
            
            await db.users.insert_one(user_dict)
            imported += 1
            
        except Exception as e:
            errors.append(f"{row.get('email', 'Unknown')}: {str(e)}")
    
    return {
        "message": f"{imported} usuários importados com sucesso",
        "imported": imported,
        "errors": errors
    }

@router.post("/import-csv")
async def import_users_csv(file: UploadFile = File(...), current_user: dict = Depends(require_role(["admin"]))):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Arquivo deve ser CSV")
    
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    
    required_columns = ['email', 'full_name']
    if not all(col in df.columns for col in required_columns):
        raise HTTPException(status_code=400, detail=f"CSV deve conter as colunas: {', '.join(required_columns)}")
    
    imported = 0
    errors = []
    
    for _, row in df.iterrows():
        try:
            email = row['email'].strip()
            full_name = row['full_name'].strip()
            
            existing = await db.users.find_one({"email": email})
            if existing:
                errors.append(f"{email}: já cadastrado")
                continue
            
            reset_token = secrets.token_urlsafe(32)
            reset_token_expires = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
            
            user = User(
                email=email,
                full_name=full_name,
                role="licenciado"
            )
            
            user_dict = user.model_dump()
            user_dict["password_hash"] = get_password_hash(secrets.token_urlsafe(16))
            user_dict["reset_token"] = reset_token
            user_dict["reset_token_expires"] = reset_token_expires
            
            await db.users.insert_one(user_dict)
            
            reset_link = f"{FRONTEND_URL}/reset-password/{reset_token}"
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #06b6d4;">Bem-vindo à Plataforma UniOzoxx!</h2>
                    <p>Olá {full_name},</p>
                    <p>Sua conta foi criada com sucesso. Para definir sua senha e acessar a plataforma, clique no link abaixo:</p>
                    <a href="{reset_link}" style="background-color: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">Definir Senha</a>
                    <p>Este link expira em 7 dias.</p>
                    <p>Seu email de login: <strong>{email}</strong></p>
                </body>
            </html>
            """
            
            try:
                params = {
                    "from": SENDER_EMAIL,
                    "to": [email],
                    "subject": "Bem-vindo à Plataforma UniOzoxx",
                    "html": html_content
                }
                await asyncio.to_thread(resend.Emails.send, params)
            except Exception as e:
                print(f"Erro ao enviar email para {email}: {e}")
            
            imported += 1
        except Exception as e:
            errors.append(f"{row.get('email', 'Unknown')}: {str(e)}")
    
    return {
        "message": f"{imported} usuários importados com sucesso",
        "imported": imported,
        "errors": errors
    }