import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
sys.path.append('/app/backend')

mongo_url = "mongodb://localhost:27017"
db_name = "test_database"

async def update_roles():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Atualizar todos os usuários com role "franqueado" para "licenciado"
    result = await db.users.update_many(
        {"role": "franqueado"},
        {"$set": {"role": "licenciado"}}
    )
    
    print(f"✓ {result.modified_count} usuários atualizados de 'franqueado' para 'licenciado'")
    
    # Listar todos os usuários para verificar
    users = await db.users.find({}, {"_id": 0, "email": 1, "role": 1}).to_list(10)
    print("\n✓ Usuários no sistema:")
    for user in users:
        print(f"  - {user['email']}: {user['role']}")
    
    client.close()

asyncio.run(update_roles())
