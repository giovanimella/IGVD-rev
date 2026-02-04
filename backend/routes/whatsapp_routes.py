from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorClient
from models import WhatsAppConfig, WhatsAppMessage, WhatsAppCustomMessage
from auth import get_current_user, require_role
import os
from datetime import datetime, timedelta
import httpx
import logging

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])
logger = logging.getLogger(__name__)


# ==================== CONFIGURAÇÕES ====================

@router.get("/config")
async def get_whatsapp_config(
    current_user: dict = Depends(require_role(["admin"]))
):
    """Obter configurações do WhatsApp (admin)"""
    config = await db.whatsapp_config.find_one({"id": "whatsapp_config"}, {"_id": 0})
    
    if not config:
        # Criar configuração padrão
        default_config = WhatsAppConfig()
        await db.whatsapp_config.insert_one(default_config.model_dump())
        config = default_config.model_dump()
    
    # Mascarar API key
    if config.get("api_key"):
        config["api_key_masked"] = config["api_key"][:8] + "***" + config["api_key"][-4:] if len(config["api_key"]) > 12 else "***"
    
    return config


@router.put("/config")
async def update_whatsapp_config(
    updates: dict,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Atualizar configurações do WhatsApp (admin)"""
    updates["updated_at"] = datetime.now().isoformat()
    
    existing = await db.whatsapp_config.find_one({"id": "whatsapp_config"})
    
    if existing:
        await db.whatsapp_config.update_one(
            {"id": "whatsapp_config"},
            {"$set": updates}
        )
    else:
        config = WhatsAppConfig(**updates)
        await db.whatsapp_config.insert_one(config.model_dump())
    
    return {"message": "Configurações atualizadas com sucesso"}


@router.post("/test-connection")
async def test_whatsapp_connection(
    current_user: dict = Depends(require_role(["admin"]))
):
    """Testar conexão com Evolution API"""
    config = await db.whatsapp_config.find_one({"id": "whatsapp_config"})
    
    if not config or not config.get("api_url") or not config.get("api_key"):
        raise HTTPException(status_code=400, detail="Configurações do WhatsApp não definidas")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Verificar status da instância
            response = await client.get(
                f"{config['api_url']}/instance/connectionState/{config['instance_name']}",
                headers={"apikey": config["api_key"]}
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "status": data.get("state", "unknown"),
                    "message": "Conexão estabelecida com sucesso"
                }
            else:
                return {
                    "success": False,
                    "status": "error",
                    "message": f"Erro na API: {response.status_code}"
                }
    except Exception as e:
        logger.error(f"Erro ao testar conexão WhatsApp: {str(e)}")
        return {
            "success": False,
            "status": "error",
            "message": f"Erro de conexão: {str(e)}"
        }


# ==================== ENVIO DE MENSAGENS ====================

async def send_whatsapp_message(phone: str, message: str, user_id: str, message_type: str):
    """Função auxiliar para enviar mensagem via Evolution API"""
    config = await db.whatsapp_config.find_one({"id": "whatsapp_config"})
    
    if not config or not config.get("enabled"):
        logger.info("WhatsApp desabilitado")
        return False
    
    if not config.get("api_url") or not config.get("api_key") or not config.get("instance_name"):
        logger.error("Configurações do WhatsApp incompletas")
        return False
    
    # Formatar número (remover caracteres especiais e adicionar código do país se necessário)
    phone_formatted = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "").replace("+", "")
    if not phone_formatted.startswith("55") and len(phone_formatted) <= 11:
        phone_formatted = "55" + phone_formatted
    
    # Registrar mensagem
    msg_record = WhatsAppMessage(
        user_id=user_id,
        phone=phone_formatted,
        message_type=message_type,
        content=message
    )
    await db.whatsapp_messages.insert_one(msg_record.model_dump())
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{config['api_url']}/message/sendText/{config['instance_name']}",
                headers={
                    "apikey": config["api_key"],
                    "Content-Type": "application/json"
                },
                json={
                    "number": phone_formatted,
                    "text": message
                }
            )
            
            if response.status_code == 200 or response.status_code == 201:
                await db.whatsapp_messages.update_one(
                    {"id": msg_record.id},
                    {"$set": {"status": "sent", "sent_at": datetime.now().isoformat()}}
                )
                logger.info(f"Mensagem WhatsApp enviada para {phone_formatted}")
                return True
            else:
                error_msg = response.text
                await db.whatsapp_messages.update_one(
                    {"id": msg_record.id},
                    {"$set": {"status": "failed", "error_message": error_msg}}
                )
                logger.error(f"Erro ao enviar WhatsApp: {error_msg}")
                return False
    except Exception as e:
        await db.whatsapp_messages.update_one(
            {"id": msg_record.id},
            {"$set": {"status": "failed", "error_message": str(e)}}
        )
        logger.error(f"Exceção ao enviar WhatsApp: {str(e)}")
        return False


@router.post("/send-custom")
async def send_custom_message(
    message_data: WhatsAppCustomMessage,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Enviar mensagem personalizada para usuários selecionados"""
    config = await db.whatsapp_config.find_one({"id": "whatsapp_config"})
    
    if not config or not config.get("enabled"):
        raise HTTPException(status_code=400, detail="WhatsApp não está habilitado")
    
    if not config.get("notify_custom"):
        raise HTTPException(status_code=400, detail="Notificações personalizadas estão desabilitadas")
    
    # Buscar usuários
    users = await db.users.find(
        {"id": {"$in": message_data.user_ids}, "phone": {"$ne": None}}
    ).to_list(1000)
    
    if not users:
        raise HTTPException(status_code=400, detail="Nenhum usuário com telefone cadastrado")
    
    # Enviar em background
    async def send_messages():
        for user in users:
            if user.get("phone"):
                await send_whatsapp_message(
                    phone=user["phone"],
                    message=message_data.message,
                    user_id=user["id"],
                    message_type="custom"
                )
    
    background_tasks.add_task(send_messages)
    
    return {
        "message": f"Enviando mensagens para {len(users)} usuários",
        "recipients": len(users)
    }


@router.post("/send-to-all")
async def send_to_all_licensees(
    message: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Enviar mensagem para todos os licenciados com telefone"""
    config = await db.whatsapp_config.find_one({"id": "whatsapp_config"})
    
    if not config or not config.get("enabled"):
        raise HTTPException(status_code=400, detail="WhatsApp não está habilitado")
    
    users = await db.users.find(
        {"role": "licenciado", "phone": {"$ne": None}}
    ).to_list(10000)
    
    async def send_messages():
        for user in users:
            if user.get("phone"):
                await send_whatsapp_message(
                    phone=user["phone"],
                    message=message,
                    user_id=user["id"],
                    message_type="custom"
                )
    
    background_tasks.add_task(send_messages)
    
    return {
        "message": f"Enviando mensagens para {len(users)} licenciados",
        "recipients": len(users)
    }


# ==================== HISTÓRICO ====================

@router.get("/messages")
async def get_message_history(
    page: int = 1,
    limit: int = 50,
    status: str = None,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Histórico de mensagens enviadas"""
    skip = (page - 1) * limit
    
    query = {}
    if status:
        query["status"] = status
    
    messages = await db.whatsapp_messages.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for msg in messages:
        msg["_id"] = str(msg.get("_id", ""))
        # Buscar nome do usuário
        user = await db.users.find_one({"id": msg["user_id"]}, {"_id": 0, "full_name": 1})
        msg["user_name"] = user["full_name"] if user else "Desconhecido"
    
    total = await db.whatsapp_messages.count_documents(query)
    
    # Estatísticas
    stats = {
        "total": await db.whatsapp_messages.count_documents({}),
        "sent": await db.whatsapp_messages.count_documents({"status": "sent"}),
        "failed": await db.whatsapp_messages.count_documents({"status": "failed"}),
        "pending": await db.whatsapp_messages.count_documents({"status": "pending"})
    }
    
    return {
        "messages": messages,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "stats": stats
    }


# ==================== NOTIFICAÇÕES AUTOMÁTICAS ====================

@router.post("/trigger/new-module")
async def trigger_new_module_notification(
    module_id: str,
    module_title: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Dispara notificação de novo módulo para todos os licenciados"""
    config = await db.whatsapp_config.find_one({"id": "whatsapp_config"})
    
    if not config or not config.get("enabled") or not config.get("notify_new_modules"):
        return {"message": "Notificação de novos módulos desabilitada", "sent": 0}
    
    users = await db.users.find(
        {"role": "licenciado", "phone": {"$ne": None}}
    ).to_list(10000)
    
    message = f"🎓 *Novo módulo disponível!*\n\n📚 {module_title}\n\nAcesse a plataforma para começar seus estudos!"
    
    async def send_notifications():
        for user in users:
            if user.get("phone"):
                await send_whatsapp_message(
                    phone=user["phone"],
                    message=message,
                    user_id=user["id"],
                    message_type="new_module"
                )
    
    background_tasks.add_task(send_notifications)
    
    return {"message": f"Notificando {len(users)} licenciados", "sent": len(users)}


@router.post("/trigger/live-class")
async def trigger_live_class_notification(
    module_title: str,
    scheduled_time: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Dispara notificação de aula ao vivo"""
    config = await db.whatsapp_config.find_one({"id": "whatsapp_config"})
    
    if not config or not config.get("enabled") or not config.get("notify_live_classes"):
        return {"message": "Notificação de aulas ao vivo desabilitada", "sent": 0}
    
    users = await db.users.find(
        {"role": "licenciado", "phone": {"$ne": None}}
    ).to_list(10000)
    
    message = f"🔴 *Aula ao vivo!*\n\n📺 {module_title}\n⏰ {scheduled_time}\n\nNão perca! Acesse a plataforma agora."
    
    async def send_notifications():
        for user in users:
            if user.get("phone"):
                await send_whatsapp_message(
                    phone=user["phone"],
                    message=message,
                    user_id=user["id"],
                    message_type="live_class"
                )
    
    background_tasks.add_task(send_notifications)
    
    return {"message": f"Notificando {len(users)} licenciados", "sent": len(users)}


@router.post("/trigger/access-reminder")
async def trigger_access_reminder(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Dispara lembretes de acesso para usuários inativos"""
    config = await db.whatsapp_config.find_one({"id": "whatsapp_config"})
    
    if not config or not config.get("enabled") or not config.get("notify_access_reminder"):
        return {"message": "Lembrete de acesso desabilitado", "sent": 0}
    
    days = config.get("access_reminder_days", 7)
    cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    # Buscar usuários inativos
    users = await db.users.find({
        "role": "licenciado",
        "phone": {"$ne": None},
        "$or": [
            {"last_access_at": {"$lt": cutoff_date}},
            {"last_access_at": None}
        ]
    }).to_list(10000)
    
    message = f"👋 *Sentimos sua falta!*\n\nVocê não acessa a plataforma há mais de {days} dias.\n\n📚 Continue seus estudos e alcance seus objetivos!\n\nAcesse agora e retome de onde parou."
    
    async def send_reminders():
        for user in users:
            if user.get("phone"):
                await send_whatsapp_message(
                    phone=user["phone"],
                    message=message,
                    user_id=user["id"],
                    message_type="reminder"
                )
    
    background_tasks.add_task(send_reminders)
    
    return {"message": f"Enviando lembretes para {len(users)} usuários inativos", "sent": len(users)}


@router.post("/trigger/birthday")
async def trigger_birthday_wishes(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Dispara mensagens de aniversário"""
    config = await db.whatsapp_config.find_one({"id": "whatsapp_config"})
    
    if not config or not config.get("enabled") or not config.get("notify_birthday"):
        return {"message": "Mensagem de aniversário desabilitada", "sent": 0}
    
    today = datetime.now().strftime("%m-%d")
    
    # Buscar aniversariantes do dia
    users = await db.users.find({
        "role": "licenciado",
        "phone": {"$ne": None},
        "birthday": {"$regex": f"-{today}$"}
    }).to_list(1000)
    
    async def send_wishes():
        for user in users:
            if user.get("phone"):
                message = f"🎂 *Feliz Aniversário, {user['full_name'].split()[0]}!*\n\n🎉 Desejamos um dia incrível e muito sucesso na sua jornada!\n\nConte sempre conosco! 🌟"
                await send_whatsapp_message(
                    phone=user["phone"],
                    message=message,
                    user_id=user["id"],
                    message_type="birthday"
                )
    
    background_tasks.add_task(send_wishes)
    
    return {"message": f"Enviando parabéns para {len(users)} aniversariantes", "sent": len(users)}
