from fastapi import APIRouter, HTTPException, Depends, Header
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import os
import uuid
import secrets
import httpx
import resend

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/webhook", tags=["webhook"])

# Configuração do Resend
resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@email.ozoxx.com.br')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://level-manager.preview.emergentagent.com')


# ==================== MODELOS ====================

class WebhookLicenseeCreate(BaseModel):
    id: str  # ID externo do sistema que envia
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    leader_id: Optional[str] = None  # ID do líder que indicou
    leader_name: Optional[str] = None  # Nome do líder que indicou


class WebhookConfigUpdate(BaseModel):
    webhook_url: Optional[str] = None
    webhook_enabled: Optional[bool] = None
    webhook_api_key: Optional[str] = None


# ==================== FUNÇÕES AUXILIARES ====================

async def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """Verifica a API Key do webhook"""
    config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
    
    if not config or not config.get("webhook_api_key"):
        raise HTTPException(status_code=401, detail="Webhook não configurado")
    
    if x_api_key != config.get("webhook_api_key"):
        raise HTTPException(status_code=401, detail="API Key inválida")
    
    return True


async def send_set_password_email(email: str, full_name: str, token: str):
    """Envia email com link para definir senha"""
    try:
        reset_url = f"{FRONTEND_URL}/set-password?token={token}"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0891b2;">UniOzoxx</h1>
            </div>
            
            <h2 style="color: #1e293b;">Bem-vindo(a), {full_name}!</h2>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Seu cadastro na plataforma UniOzoxx foi realizado com sucesso!
            </p>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Para acessar a plataforma, clique no botão abaixo para definir sua senha:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" 
                   style="background-color: #0891b2; color: white; padding: 14px 28px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold;
                          display: inline-block;">
                    Definir Minha Senha
                </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
            </p>
            <p style="color: #0891b2; font-size: 14px; word-break: break-all;">
                {reset_url}
            </p>
            
            <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
                Este link é válido por 48 horas.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                © UniOzoxx - Plataforma de Treinamento
            </p>
        </div>
        """
        
        resend.Emails.send({
            "from": f"UniOzoxx <{SENDER_EMAIL}>",
            "to": [email],
            "subject": "Bem-vindo à UniOzoxx - Defina sua senha",
            "html": html_content
        })
        
        return True
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
        return False


async def send_webhook_notification(user_id: str, full_name: str):
    """Envia webhook de confirmação de onboarding completo"""
    try:
        config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
        
        if not config:
            return False
        
        webhook_url = config.get("webhook_url")
        webhook_enabled = config.get("webhook_enabled", False)
        
        if not webhook_url or not webhook_enabled:
            print("Webhook não configurado ou desabilitado")
            return False
        
        payload = {
            "event": "onboarding_completed",
            "timestamp": datetime.now().isoformat(),
            "data": {
                "id": user_id,
                "full_name": full_name
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30.0
            )
            
            # Registrar log do webhook
            await db.webhook_logs.insert_one({
                "id": str(uuid.uuid4()),
                "type": "outgoing",
                "event": "onboarding_completed",
                "user_id": user_id,
                "url": webhook_url,
                "payload": payload,
                "status_code": response.status_code,
                "success": response.status_code in [200, 201, 202],
                "created_at": datetime.now().isoformat()
            })
            
            return response.status_code in [200, 201, 202]
            
    except Exception as e:
        print(f"Erro ao enviar webhook: {e}")
        
        # Registrar erro
        await db.webhook_logs.insert_one({
            "id": str(uuid.uuid4()),
            "type": "outgoing",
            "event": "onboarding_completed",
            "user_id": user_id,
            "error": str(e),
            "success": False,
            "created_at": datetime.now().isoformat()
        })
        
        return False


# ==================== ENDPOINTS ====================

@router.post("/licensee")
async def webhook_create_licensee(
    data: WebhookLicenseeCreate,
    _: bool = Depends(verify_api_key)
):
    """
    Webhook para cadastrar novo licenciado.
    Requer header X-API-Key com a chave configurada no sistema.
    """
    
    # Verificar se email já existe
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado no sistema")
    
    # Verificar se ID já existe
    existing_id = await db.users.find_one({"id": data.id})
    if existing_id:
        raise HTTPException(status_code=400, detail="ID já existe no sistema")
    
    # Processar informações do líder
    leader_name_to_save = data.leader_name
    if data.leader_id and not leader_name_to_save:
        # Se não foi fornecido leader_name, tenta buscar do banco
        leader = await db.users.find_one({"id": data.leader_id}, {"_id": 0, "full_name": 1})
        if leader:
            leader_name_to_save = leader.get("full_name")
    
    # Gerar token para definir senha (válido por 48h)
    password_token = secrets.token_urlsafe(32)
    token_expires = datetime.now().timestamp() + (48 * 3600)  # 48 horas
    
    # Criar usuário
    user = {
        "id": data.id,  # Usa o ID externo
        "email": data.email,
        "full_name": data.full_name,
        "phone": data.phone,
        "role": "licenciado",
        "points": 0,
        "level_title": "Iniciante",
        "leader_id": data.leader_id,
        "leader_name": leader_name_to_save,
        "password_hash": None,  # Sem senha até o usuário definir
        "password_token": password_token,
        "password_token_expires": token_expires,
        "current_stage": "registro",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "created_via_webhook": True
    }
    
    await db.users.insert_one(user)
    
    # Registrar log do webhook
    await db.webhook_logs.insert_one({
        "id": str(uuid.uuid4()),
        "type": "incoming",
        "event": "licensee_created",
        "user_id": data.id,
        "payload": data.model_dump(),
        "success": True,
        "created_at": datetime.now().isoformat()
    })
    
    # Enviar email com link para definir senha
    email_sent = await send_set_password_email(data.email, data.full_name, password_token)
    
    return {
        "success": True,
        "message": "Licenciado cadastrado com sucesso",
        "data": {
            "id": data.id,
            "email": data.email,
            "full_name": data.full_name,
            "email_sent": email_sent
        }
    }


@router.get("/logs")
async def get_webhook_logs(
    limit: int = 50,
    type: Optional[str] = None
):
    """Lista os logs de webhooks (apenas para admin via interface)"""
    query = {}
    if type:
        query["type"] = type
    
    logs = await db.webhook_logs.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return logs
