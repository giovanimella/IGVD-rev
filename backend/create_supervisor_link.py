import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime
import uuid
import secrets

# Carregar variáveis de ambiente
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def create_supervisor_link():
    """Cria link de registro para o supervisor de teste"""
    
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Buscar supervisor
    supervisor = await db.users.find_one({"email": "supervisor@ozoxx.com"}, {"_id": 0})
    
    if not supervisor:
        print("❌ Supervisor não encontrado!")
        return
    
    # Verificar se já existe link
    existing = await db.supervisor_links.find_one({"supervisor_id": supervisor["id"]})
    
    if existing:
        print("✅ Link já existe!")
        print(f"Token: {existing['token']}")
        return
    
    # Criar novo link
    link_data = {
        "id": str(uuid.uuid4()),
        "supervisor_id": supervisor["id"],
        "supervisor_name": supervisor["full_name"],
        "token": secrets.token_urlsafe(32),
        "created_at": datetime.now().isoformat()
    }
    
    await db.supervisor_links.insert_one(link_data)
    
    print("=" * 60)
    print("✅ LINK DE REGISTRO CRIADO COM SUCESSO!")
    print("=" * 60)
    print(f"Supervisor: {supervisor['full_name']}")
    print(f"Token: {link_data['token']}")
    print(f"Link: http://localhost:3000/register/{link_data['token']}")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_supervisor_link())
