from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from models import LiveChatMessage, LiveChatMessageCreate
from auth import get_current_user
import os
from datetime import datetime, timezone
from typing import List

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/live-class", tags=["live-class"])

@router.get("/{module_id}/chat")
async def get_live_chat_messages(
    module_id: str,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Retorna as mensagens do chat de uma aula ao vivo"""
    # Verificar se o módulo existe e é do tipo live_class
    module = await db.modules.find_one({"id": module_id}, {"_id": 0})
    if not module:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    
    if module.get("module_type") != "live_class":
        raise HTTPException(status_code=400, detail="Este módulo não é uma aula ao vivo")
    
    messages = await db.live_chat_messages.find(
        {"module_id": module_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Retornar em ordem cronológica
    return list(reversed(messages))

@router.post("/{module_id}/chat")
async def send_live_chat_message(
    module_id: str,
    message_data: LiveChatMessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Envia uma mensagem no chat da aula ao vivo"""
    # Verificar se o módulo existe e é do tipo live_class
    module = await db.modules.find_one({"id": module_id}, {"_id": 0})
    if not module:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    
    if module.get("module_type") != "live_class":
        raise HTTPException(status_code=400, detail="Este módulo não é uma aula ao vivo")
    
    # Buscar dados do usuário
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Criar mensagem
    message = LiveChatMessage(
        module_id=module_id,
        user_id=current_user["sub"],
        user_name=user["full_name"],
        message=message_data.message
    )
    
    await db.live_chat_messages.insert_one(message.model_dump())
    
    return message.model_dump()

@router.delete("/{module_id}/chat/{message_id}")
async def delete_live_chat_message(
    module_id: str,
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Deleta uma mensagem do chat (apenas admin ou autor)"""
    message = await db.live_chat_messages.find_one(
        {"id": message_id, "module_id": module_id},
        {"_id": 0}
    )
    
    if not message:
        raise HTTPException(status_code=404, detail="Mensagem não encontrada")
    
    # Verificar permissão
    if current_user.get("role") != "admin" and message["user_id"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Sem permissão para deletar esta mensagem")
    
    await db.live_chat_messages.delete_one({"id": message_id})
    
    return {"message": "Mensagem deletada com sucesso"}

@router.delete("/{module_id}/chat")
async def clear_live_chat(
    module_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Limpa todo o chat de uma aula ao vivo (apenas admin)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem limpar o chat")
    
    result = await db.live_chat_messages.delete_many({"module_id": module_id})
    
    return {"message": f"{result.deleted_count} mensagens deletadas"}
