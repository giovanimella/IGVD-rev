import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
sys.path.append('/app/backend')
from auth import get_password_hash
from models import User

mongo_url = "mongodb://localhost:27017"
db_name = "test_database"

async def create_licensee():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Verificar se já existe
    existing = await db.users.find_one({"email": "licenciado@teste.com"})
    if existing:
        # Atualizar role se necessário
        await db.users.update_one(
            {"email": "licenciado@teste.com"},
            {"$set": {"role": "licenciado", "current_stage": "completo"}}
        )
        print("✓ Usuário licenciado@teste.com atualizado")
    else:
        # Criar novo
        user = User(
            email="licenciado@teste.com",
            full_name="João Silva (Licenciado)",
            role="licenciado",
            points=150,
            level_title="Bronze",
            phone="11999999999",
            current_stage="completo"
        )
        user_dict = user.model_dump()
        user_dict["password_hash"] = get_password_hash("senha123")
        
        await db.users.insert_one(user_dict)
        print("✓ Usuário licenciado@teste.com criado")
    
    # Listar usuários
    users = await db.users.find({}, {"_id": 0, "email": 1, "role": 1, "current_stage": 1}).to_list(10)
    print("\n✓ Usuários no sistema:")
    for user in users:
        print(f"  - {user['email']}: {user['role']} (Stage: {user.get('current_stage', 'N/A')})")
    
    client.close()

asyncio.run(create_licensee())
