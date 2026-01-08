from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from models import Conversation, Message, MessageCreate, ConversationResponse
from auth import get_current_user, require_role
import os
from datetime import datetime, timezone
from typing import List

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/conversations")
async def create_or_get_conversation(current_user: dict = Depends(get_current_user)):
    """Cria ou retorna conversa existente do usuário"""
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar se já existe uma conversa ativa
    existing = await db.conversations.find_one({
        "user_id": current_user["sub"],
        "status": "active"
    }, {"_id": 0})
    
    if existing:
        return existing
    
    # Criar nova conversa
    conversation = Conversation(
        user_id=current_user["sub"],
        user_name=user["full_name"]
    )
    
    await db.conversations.insert_one(conversation.model_dump())
    return conversation

@router.get("/conversations", response_model=List[ConversationResponse])
async def get_all_conversations(
    status: str = "active",
    current_user: dict = Depends(require_role(["admin", "supervisor"]))
):
    """Lista todas as conversas (somente para admins/supervisors)"""
    query = {}
    if status:
        query["status"] = status
    
    conversations = await db.conversations.find(
        query, {"_id": 0}
    ).sort("last_message_at", -1).to_list(1000)
    
    return conversations

@router.get("/conversations/my")
async def get_my_conversation(current_user: dict = Depends(get_current_user)):
    """Retorna a conversa do usuário atual"""
    conversation = await db.conversations.find_one({
        "user_id": current_user["sub"]
    }, {"_id": 0})
    
    if not conversation:
        # Criar automaticamente se não existir
        user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
        conversation = Conversation(
            user_id=current_user["sub"],
            user_name=user["full_name"]
        )
        await db.conversations.insert_one(conversation.model_dump())
        return conversation.model_dump()
    
    return conversation

@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Retorna todas as mensagens de uma conversa"""
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")
    
    # Verificar permissão
    if current_user.get("role") not in ["admin", "supervisor"]:
        if conversation["user_id"] != current_user["sub"]:
            raise HTTPException(status_code=403, detail="Acesso negado")
    
    messages = await db.messages.find(
        {"conversation_id": conversation_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    # Marcar mensagens como lidas
    if current_user.get("role") in ["admin", "supervisor"]:
        # Admin/supervisor marcando como lidas as mensagens do usuário
        await db.messages.update_many(
            {
                "conversation_id": conversation_id,
                "sender_role": {"$ne": current_user["role"]},
                "read": False
            },
            {"$set": {"read": True}}
        )
        await db.conversations.update_one(
            {"id": conversation_id},
            {"$set": {"unread_count": 0}}
        )
    else:
        # Usuário marcando como lidas as mensagens do admin
        await db.messages.update_many(
            {
                "conversation_id": conversation_id,
                "sender_role": {"$in": ["admin", "supervisor"]},
                "read": False
            },
            {"$set": {"read": True}}
        )
    
    return messages

@router.post("/messages")
async def send_message(
    message_data: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Envia uma mensagem (será enviada via WebSocket também)"""
    conversation = await db.conversations.find_one(
        {"id": message_data.conversation_id}, {"_id": 0}
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")
    
    # Verificar permissão
    if current_user.get("role") not in ["admin", "supervisor"]:
        if conversation["user_id"] != current_user["sub"]:
            raise HTTPException(status_code=403, detail="Acesso negado")
    
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    
    message = Message(
        conversation_id=message_data.conversation_id,
        sender_id=current_user["sub"],
        sender_name=user["full_name"],
        sender_role=current_user.get("role", "licenciado"),
        message=message_data.message
    )
    
    await db.messages.insert_one(message.model_dump())
    
    # Atualizar conversa
    update_data = {
        "last_message": message_data.message[:100],
        "last_message_at": message.created_at
    }
    
    # Incrementar contador de não lidas se for admin respondendo
    if current_user.get("role") in ["admin", "supervisor"]:
        await db.conversations.update_one(
            {"id": message_data.conversation_id},
            {"$set": update_data}
        )
    else:
        await db.conversations.update_one(
            {"id": message_data.conversation_id},
            {
                "$set": update_data,
                "$inc": {"unread_count": 1}
            }
        )
    
    return message

@router.patch("/conversations/{conversation_id}/status")
async def update_conversation_status(
    conversation_id: str,
    status: str,
    current_user: dict = Depends(require_role(["admin", "supervisor"]))
):
    """Atualiza o status de uma conversa"""
    result = await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {"status": status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")
    
    return {"message": "Status atualizado com sucesso"}

@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Retorna o número de mensagens não lidas"""
    if current_user.get("role") in ["admin", "supervisor"]:
        # Contar todas as conversas com mensagens não lidas
        count = await db.conversations.count_documents({"unread_count": {"$gt": 0}})
        return {"unread_count": count}
    else:
        # Contar mensagens não lidas do usuário
        count = await db.messages.count_documents({
            "conversation_id": {"$exists": True},
            "sender_role": {"$in": ["admin", "supervisor"]},
            "read": False
        })
        
        # Buscar conversation_id do usuário
        conversation = await db.conversations.find_one(
            {"user_id": current_user["sub"]}, {"_id": 0}
        )
        
        if conversation:
            count = await db.messages.count_documents({
                "conversation_id": conversation["id"],
                "sender_role": {"$in": ["admin", "supervisor"]},
                "read": False
            })
        
        return {"unread_count": count}
