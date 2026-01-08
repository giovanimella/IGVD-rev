import socketio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import jwt

# Criar servidor Socket.IO com CORS configurado
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Armazenar conexões ativas
active_connections = {}

async def verify_token(token: str):
    """Verifica o token JWT"""
    try:
        SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except Exception as e:
        print(f"Erro ao verificar token: {e}")
        return None

@sio.event
async def connect(sid, environ, auth):
    """Evento de conexão"""
    print(f"Cliente conectado: {sid}")
    
    # Verificar autenticação
    if not auth or 'token' not in auth:
        print(f"Cliente {sid} sem token de autenticação")
        await sio.disconnect(sid)
        return False
    
    # Validar token
    user_data = await verify_token(auth['token'])
    if not user_data:
        print(f"Token inválido para {sid}")
        await sio.disconnect(sid)
        return False
    
    # Armazenar conexão
    user_id = user_data.get('sub')
    user_role = user_data.get('role')
    
    active_connections[sid] = {
        'user_id': user_id,
        'role': user_role
    }
    
    print(f"Usuário autenticado: {user_id} (role: {user_role})")
    
    # Se for admin/supervisor, adicionar à sala de admins
    if user_role in ['admin', 'supervisor']:
        await sio.enter_room(sid, 'admins')
        print(f"Admin/Supervisor {user_id} entrou na sala de admins")
    
    # Adicionar usuário à sua própria sala
    await sio.enter_room(sid, f"user_{user_id}")
    
    return True

@sio.event
async def disconnect(sid):
    """Evento de desconexão"""
    print(f"Cliente desconectado: {sid}")
    if sid in active_connections:
        del active_connections[sid]

@sio.event
async def send_message(sid, data):
    """Evento de envio de mensagem"""
    print(f"Mensagem recebida de {sid}: {data}")
    
    if sid not in active_connections:
        print(f"Conexão não autenticada: {sid}")
        return
    
    connection_data = active_connections[sid]
    user_id = connection_data['user_id']
    user_role = connection_data['role']
    
    try:
        conversation_id = data.get('conversation_id')
        message_text = data.get('message')
        
        if not conversation_id or not message_text:
            await sio.emit('error', {'message': 'Dados inválidos'}, room=sid)
            return
        
        # Buscar informações do usuário
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            await sio.emit('error', {'message': 'Usuário não encontrado'}, room=sid)
            return
        
        # Buscar conversa
        conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
        if not conversation:
            await sio.emit('error', {'message': 'Conversa não encontrada'}, room=sid)
            return
        
        # Criar mensagem
        from models import Message
        message = Message(
            conversation_id=conversation_id,
            sender_id=user_id,
            sender_name=user["full_name"],
            sender_role=user_role,
            message=message_text
        )
        
        await db.messages.insert_one(message.model_dump())
        
        # Atualizar conversa
        update_data = {
            "last_message": message_text[:100],
            "last_message_at": message.created_at
        }
        
        if user_role in ["admin", "supervisor"]:
            await db.conversations.update_one(
                {"id": conversation_id},
                {"$set": update_data}
            )
        else:
            await db.conversations.update_one(
                {"id": conversation_id},
                {
                    "$set": update_data,
                    "$inc": {"unread_count": 1}
                }
            )
        
        # Preparar mensagem para emitir
        message_data = message.model_dump()
        
        # Emitir para o remetente
        await sio.emit('new_message', message_data, room=sid)
        
        # Emitir para o destinatário apropriado
        if user_role in ["admin", "supervisor"]:
            # Admin/Supervisor enviou, notificar o usuário
            target_user_id = conversation["user_id"]
            await sio.emit('new_message', message_data, room=f"user_{target_user_id}")
        else:
            # Usuário enviou, notificar todos os admins
            await sio.emit('new_message', message_data, room='admins')
            
            # Criar notificação para admins
            from routes.notification_routes import notify_admins
            await notify_admins(
                "Nova mensagem de suporte",
                f"{user['full_name']} enviou uma mensagem: {message_text[:50]}...",
                "chat_message",
                conversation_id
            )
        
        print(f"Mensagem enviada com sucesso: {message.id}")
        
    except Exception as e:
        print(f"Erro ao processar mensagem: {e}")
        await sio.emit('error', {'message': 'Erro ao enviar mensagem'}, room=sid)

@sio.event
async def typing(sid, data):
    """Evento de digitação"""
    if sid not in active_connections:
        return
    
    connection_data = active_connections[sid]
    user_id = connection_data['user_id']
    user_role = connection_data['role']
    conversation_id = data.get('conversation_id')
    
    if not conversation_id:
        return
    
    # Buscar conversa
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        return
    
    typing_data = {
        'conversation_id': conversation_id,
        'user_id': user_id,
        'is_typing': data.get('is_typing', False)
    }
    
    # Notificar o destinatário
    if user_role in ["admin", "supervisor"]:
        target_user_id = conversation["user_id"]
        await sio.emit('user_typing', typing_data, room=f"user_{target_user_id}")
    else:
        await sio.emit('user_typing', typing_data, room='admins')

@sio.event
async def mark_as_read(sid, data):
    """Marca mensagens como lidas"""
    if sid not in active_connections:
        return
    
    connection_data = active_connections[sid]
    user_role = connection_data['role']
    conversation_id = data.get('conversation_id')
    
    if not conversation_id:
        return
    
    try:
        if user_role in ["admin", "supervisor"]:
            # Admin/supervisor marcando como lidas as mensagens do usuário
            await db.messages.update_many(
                {
                    "conversation_id": conversation_id,
                    "sender_role": {"$ne": user_role},
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
        
        await sio.emit('messages_read', {'conversation_id': conversation_id}, room=sid)
    except Exception as e:
        print(f"Erro ao marcar mensagens como lidas: {e}")
