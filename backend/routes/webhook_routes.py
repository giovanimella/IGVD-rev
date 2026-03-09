from fastapi import APIRouter, HTTPException, Depends, Header, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from typing import Optional, List
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
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://reactivation-bug-fix.preview.emergentagent.com')


# ==================== FUNÇÕES AUXILIARES ====================

async def get_platform_name():
    """Busca o nome da plataforma das configurações do sistema"""
    config = await db.system_config.find_one({"id": "system_config"})
    return config.get("platform_name", "UniOzoxx") if config else "UniOzoxx"


async def get_webhook_config():
    """Busca as configurações de webhook do sistema"""
    config = await db.system_config.find_one({"id": "system_config"}, {"_id": 0})
    return config or {}


# ==================== MODELOS ====================

class WebhookLicenseeCreate(BaseModel):
    id: str  # ID externo do sistema que envia
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    birthday: Optional[str] = None  # Data de nascimento (YYYY-MM-DD)
    leader_id: Optional[str] = None  # ID do líder que indicou
    leader_name: Optional[str] = None  # Nome do líder que indicou
    kit_type: Optional[str] = None  # "master" ou "senior" - define fluxo de onboarding
    responsible_id: Optional[str] = None  # ID do Responsável - usado para associar ao Supervisor


class WebhookConfigUpdate(BaseModel):
    webhook_url: Optional[str] = None
    webhook_enabled: Optional[bool] = None
    webhook_production_api_key: Optional[str] = None
    webhook_sandbox_api_key: Optional[str] = None
    webhook_receive_enabled: Optional[bool] = None


class WebhookLogResponse(BaseModel):
    id: str
    environment: str  # "sandbox" ou "production"
    type: str  # "incoming" ou "outgoing"
    event: str
    user_id: Optional[str] = None
    payload: dict
    validation_errors: Optional[List[str]] = None
    would_create_user: bool = False
    supervisor_would_match: bool = False
    supervisor_id: Optional[str] = None
    success: bool
    created_at: str


# ==================== VERIFICAÇÃO API KEY ====================

async def verify_production_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """Verifica a API Key de PRODUÇÃO do webhook"""
    config = await get_webhook_config()
    
    # Primeiro tentar a nova chave de produção, senão fallback para a antiga
    production_key = config.get("webhook_production_api_key") or config.get("webhook_api_key")
    
    if not production_key:
        raise HTTPException(status_code=401, detail="Webhook de produção não configurado. Configure a API Key no painel admin.")
    
    if x_api_key != production_key:
        raise HTTPException(status_code=401, detail="API Key de produção inválida")
    
    return True


async def verify_sandbox_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    """Verifica a API Key de SANDBOX do webhook"""
    config = await get_webhook_config()
    
    sandbox_key = config.get("webhook_sandbox_api_key")
    
    if not sandbox_key:
        raise HTTPException(status_code=401, detail="Webhook sandbox não configurado. Configure a API Key de sandbox no painel admin.")
    
    if x_api_key != sandbox_key:
        raise HTTPException(status_code=401, detail="API Key de sandbox inválida")
    
    return True


async def send_set_password_email(email: str, full_name: str, token: str):
    """Envia email com link para definir senha"""
    try:
        reset_url = f"{FRONTEND_URL}/set-password?token={token}"
        
        # Buscar nome da plataforma
        platform_name = await get_platform_name()
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0891b2;">{platform_name}</h1>
            </div>
            
            <h2 style="color: #1e293b;">Bem-vindo(a), {full_name}!</h2>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Seu cadastro na plataforma {platform_name} foi realizado com sucesso!
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
                © {platform_name} - Plataforma de Treinamento
            </p>
        </div>
        """
        
        resend.Emails.send({
            "from": f"{platform_name} <{SENDER_EMAIL}>",
            "to": [email],
            "subject": f"Bem-vindo à {platform_name} - Defina sua senha",
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
        
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30.0
            )
            
            # Registrar log do webhook
            await db.webhook_logs.insert_one({
                "id": str(uuid.uuid4()),
                "environment": "production",
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
            "environment": "production",
            "type": "outgoing",
            "event": "onboarding_completed",
            "user_id": user_id,
            "error": str(e),
            "success": False,
            "created_at": datetime.now().isoformat()
        })
        
        return False


async def validate_licensee_data(data: WebhookLicenseeCreate):
    """
    Valida os dados do licenciado e retorna informações sobre o que aconteceria.
    Usado tanto no sandbox quanto para validação prévia na produção.
    """
    validation_errors = []
    warnings = []
    
    # Verificar se email já existe
    existing_email = await db.users.find_one({"email": data.email})
    if existing_email:
        validation_errors.append(f"Email '{data.email}' já cadastrado no sistema")
    
    # Verificar se ID já existe
    existing_id = await db.users.find_one({"id": data.id})
    if existing_id:
        validation_errors.append(f"ID '{data.id}' já existe no sistema")
    
    # Validar formato do birthday
    if data.birthday:
        try:
            datetime.strptime(data.birthday, "%Y-%m-%d")
        except ValueError:
            validation_errors.append(f"Data de nascimento '{data.birthday}' inválida. Use formato YYYY-MM-DD")
    
    # Validar kit_type
    if data.kit_type and data.kit_type.lower() not in ["master", "senior"]:
        warnings.append(f"kit_type '{data.kit_type}' não reconhecido. Valores válidos: 'master' ou 'senior'. Será usado 'senior' como padrão.")
    
    # Verificar líder se fornecido
    leader_found = None
    if data.leader_id:
        leader = await db.users.find_one({"id": data.leader_id}, {"_id": 0, "full_name": 1})
        if leader:
            leader_found = leader.get("full_name")
        else:
            warnings.append(f"leader_id '{data.leader_id}' não encontrado no sistema")
    
    # Verificar supervisor via responsible_id
    supervisor_info = None
    if data.responsible_id:
        supervisor = await db.users.find_one(
            {"role": "supervisor", "external_id": data.responsible_id},
            {"_id": 0, "id": 1, "full_name": 1}
        )
        if supervisor:
            supervisor_info = {
                "id": supervisor.get("id"),
                "name": supervisor.get("full_name"),
                "matched": True
            }
        else:
            warnings.append(f"Nenhum supervisor encontrado com external_id '{data.responsible_id}'")
            supervisor_info = {"matched": False}
    
    # Determinar stage inicial
    kit_type = (data.kit_type or "senior").lower()
    if kit_type not in ["master", "senior"]:
        kit_type = "senior"
    initial_stage = "completo" if kit_type == "master" else "registro"
    
    return {
        "is_valid": len(validation_errors) == 0,
        "validation_errors": validation_errors,
        "warnings": warnings,
        "would_create_user": len(validation_errors) == 0,
        "supervisor_info": supervisor_info,
        "leader_found": leader_found,
        "kit_type_normalized": kit_type,
        "initial_stage": initial_stage
    }


# ==================== ENDPOINTS SANDBOX ====================

@router.post("/sandbox/licensee")
async def webhook_sandbox_create_licensee(
    data: WebhookLicenseeCreate,
    _: bool = Depends(verify_sandbox_api_key)
):
    """
    🧪 SANDBOX - Endpoint para testes de integração.
    
    Valida os dados e simula a criação do licenciado SEM criar de verdade.
    Todos os testes são registrados nos logs para análise.
    
    Use este endpoint para:
    - Testar a integração antes de ir para produção
    - Validar o formato dos dados
    - Verificar se IDs e emails já existem
    - Testar a associação de supervisores
    """
    
    # Validar dados
    validation = await validate_licensee_data(data)
    
    # Simular resposta que seria dada em produção
    simulated_response = {
        "id": data.id,
        "email": data.email,
        "full_name": data.full_name,
        "birthday": data.birthday,
        "kit_type": validation["kit_type_normalized"],
        "initial_stage": validation["initial_stage"],
        "supervisor_id": validation["supervisor_info"]["id"] if validation["supervisor_info"] and validation["supervisor_info"].get("matched") else None,
        "supervisor_name": validation["supervisor_info"]["name"] if validation["supervisor_info"] and validation["supervisor_info"].get("matched") else None,
        "supervisor_matched": validation["supervisor_info"]["matched"] if validation["supervisor_info"] else False,
        "email_sent": validation["is_valid"]  # Em sandbox, simula que enviaria
    }
    
    # Registrar log detalhado do teste
    log_entry = {
        "id": str(uuid.uuid4()),
        "environment": "sandbox",
        "type": "incoming",
        "event": "licensee_test",
        "user_id": data.id,
        "payload": data.model_dump(),
        "validation_result": validation,
        "simulated_response": simulated_response,
        "would_create_user": validation["is_valid"],
        "supervisor_would_match": validation["supervisor_info"]["matched"] if validation["supervisor_info"] else False,
        "supervisor_id": validation["supervisor_info"]["id"] if validation["supervisor_info"] and validation["supervisor_info"].get("matched") else None,
        "success": True,  # O teste em si sempre é bem sucedido
        "created_at": datetime.now().isoformat()
    }
    await db.webhook_logs.insert_one(log_entry)
    
    # Se houver erros de validação, retornar erro simulado
    if not validation["is_valid"]:
        return {
            "sandbox": True,
            "success": False,
            "message": "SANDBOX: Validação falhou - Este cadastro NÃO seria aceito em produção",
            "validation_errors": validation["validation_errors"],
            "warnings": validation["warnings"],
            "data": simulated_response,
            "log_id": log_entry["id"]
        }
    
    # Retornar sucesso simulado
    return {
        "sandbox": True,
        "success": True,
        "message": "SANDBOX: Validação OK - Este cadastro SERIA aceito em produção",
        "warnings": validation["warnings"],
        "data": simulated_response,
        "log_id": log_entry["id"],
        "notes": [
            "✅ Dados validados com sucesso",
            "✅ Usuário seria criado no sistema",
            f"{'✅' if simulated_response['supervisor_matched'] else '⚠️'} Supervisor {'seria associado' if simulated_response['supervisor_matched'] else 'NÃO seria associado'}",
            "✅ Email de boas-vindas seria enviado",
            "ℹ️ Nenhum dado foi criado - este é apenas um teste"
        ]
    }


@router.get("/sandbox/validate")
async def webhook_sandbox_validate_config(
    _: bool = Depends(verify_sandbox_api_key)
):
    """
    🧪 SANDBOX - Valida a configuração do webhook.
    
    Use este endpoint para verificar se:
    - A API Key de sandbox está correta
    - O sistema está pronto para receber requisições
    """
    config = await get_webhook_config()
    
    return {
        "sandbox": True,
        "success": True,
        "message": "Configuração de sandbox válida!",
        "config": {
            "sandbox_configured": bool(config.get("webhook_sandbox_api_key")),
            "production_configured": bool(config.get("webhook_production_api_key") or config.get("webhook_api_key")),
            "receive_enabled": config.get("webhook_receive_enabled", False),
            "outgoing_webhook_enabled": config.get("webhook_enabled", False)
        }
    }


# ==================== ENDPOINTS PRODUÇÃO ====================

@router.post("/licensee")
async def webhook_create_licensee(
    data: WebhookLicenseeCreate,
    _: bool = Depends(verify_production_api_key)
):
    """
    🚀 PRODUÇÃO - Webhook para cadastrar novo licenciado.
    
    Requer header X-API-Key com a chave de PRODUÇÃO configurada no sistema.
    
    ⚠️ IMPORTANTE: O recebimento de cadastros precisa estar HABILITADO no painel admin.
    Se estiver desabilitado, retornará erro 403.
    
    Campos recebidos:
    - id: ID externo do licenciado (obrigatório)
    - full_name: Nome completo (obrigatório)
    - email: Email (obrigatório)
    - phone: Telefone
    - birthday: Data de nascimento (YYYY-MM-DD)
    - leader_id: ID do líder que cadastrou
    - leader_name: Nome do líder
    - kit_type: Kit adquirido (master ou senior)
    - responsible_id: ID do Responsável (para associar ao Supervisor via external_id)
    """
    
    # Verificar se o recebimento está habilitado
    config = await get_webhook_config()
    if not config.get("webhook_receive_enabled", False):
        # Registrar tentativa bloqueada
        await db.webhook_logs.insert_one({
            "id": str(uuid.uuid4()),
            "environment": "production",
            "type": "incoming",
            "event": "licensee_blocked",
            "user_id": data.id,
            "payload": data.model_dump(),
            "blocked_reason": "Recebimento de cadastros via API está desabilitado",
            "success": False,
            "created_at": datetime.now().isoformat()
        })
        
        raise HTTPException(
            status_code=403, 
            detail="Recebimento de cadastros via API está desabilitado. Entre em contato com o administrador."
        )
    
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
        leader = await db.users.find_one({"id": data.leader_id}, {"_id": 0, "full_name": 1})
        if leader:
            leader_name_to_save = leader.get("full_name")
    
    # Processar associação de supervisor via responsible_id
    supervisor_id = None
    supervisor_name = None
    
    if data.responsible_id:
        supervisor = await db.users.find_one(
            {"role": "supervisor", "external_id": data.responsible_id},
            {"_id": 0, "id": 1, "full_name": 1}
        )
        
        if supervisor:
            supervisor_id = supervisor.get("id")
            supervisor_name = supervisor.get("full_name")
            print(f"Supervisor encontrado para responsible_id {data.responsible_id}: {supervisor_name} (ID: {supervisor_id})")
        else:
            print(f"Nenhum supervisor encontrado com external_id: {data.responsible_id}")
    
    # Gerar token para definir senha (válido por 48h)
    password_token = secrets.token_urlsafe(32)
    token_expires = datetime.now().timestamp() + (48 * 3600)
    
    # Determinar stage inicial baseado no kit_type
    kit_type = (data.kit_type or "senior").lower()
    if kit_type not in ["master", "senior"]:
        kit_type = "senior"
    initial_stage = "completo" if kit_type == "master" else "registro"
    
    # Criar usuário
    user = {
        "id": data.id,
        "email": data.email,
        "full_name": data.full_name,
        "phone": data.phone,
        "birthday": data.birthday,
        "role": "licenciado",
        "points": 0,
        "level_title": "Iniciante",
        "leader_id": data.leader_id,
        "leader_name": leader_name_to_save,
        "supervisor_id": supervisor_id,
        "supervisor_name": supervisor_name,
        "responsible_id": data.responsible_id,
        "password_hash": None,
        "password_token": password_token,
        "password_token_expires": token_expires,
        "current_stage": initial_stage,
        "kit_type": kit_type,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "created_via_webhook": True
    }
    
    await db.users.insert_one(user)
    
    # Registrar log do webhook
    await db.webhook_logs.insert_one({
        "id": str(uuid.uuid4()),
        "environment": "production",
        "type": "incoming",
        "event": "licensee_created",
        "user_id": data.id,
        "payload": data.model_dump(),
        "supervisor_matched": supervisor_id is not None,
        "supervisor_id": supervisor_id,
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
            "birthday": data.birthday,
            "kit_type": kit_type,
            "initial_stage": initial_stage,
            "supervisor_id": supervisor_id,
            "supervisor_name": supervisor_name,
            "supervisor_matched": supervisor_id is not None,
            "email_sent": email_sent
        }
    }


# ==================== ENDPOINTS DE LOGS ====================

@router.get("/logs")
async def get_webhook_logs(
    limit: int = Query(50, ge=1, le=500),
    type: Optional[str] = Query(None, description="incoming ou outgoing"),
    environment: Optional[str] = Query(None, description="sandbox ou production"),
    event: Optional[str] = Query(None, description="Tipo de evento específico")
):
    """
    Lista os logs de webhooks (entrada e saída).
    
    Filtros disponíveis:
    - type: "incoming" ou "outgoing"
    - environment: "sandbox" ou "production"
    - event: tipo específico de evento
    """
    query = {}
    
    if type:
        query["type"] = type
    if environment:
        query["environment"] = environment
    if event:
        query["event"] = event
    
    logs = await db.webhook_logs.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return logs


@router.get("/logs/stats")
async def get_webhook_logs_stats():
    """
    Retorna estatísticas dos logs de webhook.
    """
    # Total por ambiente
    sandbox_count = await db.webhook_logs.count_documents({"environment": "sandbox"})
    production_count = await db.webhook_logs.count_documents({"environment": "production"})
    
    # Total por tipo
    incoming_count = await db.webhook_logs.count_documents({"type": "incoming"})
    outgoing_count = await db.webhook_logs.count_documents({"type": "outgoing"})
    
    # Sucesso/Falha
    success_count = await db.webhook_logs.count_documents({"success": True})
    failed_count = await db.webhook_logs.count_documents({"success": False})
    
    # Últimos 7 dias
    seven_days_ago = datetime.now().isoformat()[:10]
    recent_count = await db.webhook_logs.count_documents({
        "created_at": {"$gte": seven_days_ago}
    })
    
    return {
        "total": sandbox_count + production_count,
        "by_environment": {
            "sandbox": sandbox_count,
            "production": production_count
        },
        "by_type": {
            "incoming": incoming_count,
            "outgoing": outgoing_count
        },
        "by_status": {
            "success": success_count,
            "failed": failed_count
        },
        "last_7_days": recent_count
    }


@router.delete("/logs/sandbox")
async def clear_sandbox_logs():
    """
    Limpa todos os logs do ambiente SANDBOX.
    Útil para limpar logs de teste antes de uma nova rodada de testes.
    """
    result = await db.webhook_logs.delete_many({"environment": "sandbox"})
    
    return {
        "success": True,
        "message": f"{result.deleted_count} logs de sandbox removidos"
    }


# ==================== ENDPOINTS DE STATUS ====================

@router.get("/status")
async def get_webhook_status():
    """
    Retorna o status atual das configurações de webhook.
    Endpoint público para verificar disponibilidade.
    """
    config = await get_webhook_config()
    
    return {
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "production": {
                "url": "/api/webhook/licensee",
                "configured": bool(config.get("webhook_production_api_key") or config.get("webhook_api_key")),
                "receive_enabled": config.get("webhook_receive_enabled", False)
            },
            "sandbox": {
                "url": "/api/webhook/sandbox/licensee",
                "configured": bool(config.get("webhook_sandbox_api_key")),
                "always_available": True
            }
        },
        "outgoing_webhook": {
            "enabled": config.get("webhook_enabled", False),
            "url_configured": bool(config.get("webhook_url"))
        }
    }
