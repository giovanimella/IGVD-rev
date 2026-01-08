import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_password_hash
from models import User, Module, Reward
import os
from dotenv import load_dotenv

load_dotenv()

async def seed_data():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Criar licenciado de teste
    existing = await db.users.find_one({"email": "licenciado@teste.com"})
    if not existing:
        licenciado = User(
            email="licenciado@teste.com",
            full_name="João Silva",
            role="licenciado",
            points=150,
            level_title="Bronze"
        )
        licenciado_dict = licenciado.model_dump()
        licenciado_dict["password_hash"] = get_password_hash("senha123")
        await db.users.insert_one(licenciado_dict)
        print("✓ Licenciado criado")
    
    # Criar módulo de teste
    existing_module = await db.modules.find_one({"title": "Introdução aos Geradores de Ozônio"})
    if not existing_module:
        module = Module(
            title="Introdução aos Geradores de Ozônio",
            description="Aprenda os fundamentos sobre geradores de ozônio e seus benefícios para residências.",
            order=1,
            has_certificate=True,
            points_reward=50,
            created_by=(await db.users.find_one({"role": "admin"}))["id"]
        )
        await db.modules.insert_one(module.model_dump())
        print("✓ Módulo criado")
    
    # Criar recompensa de teste
    existing_reward = await db.rewards.find_one({"title": "Certificado Bronze"})
    if not existing_reward:
        reward = Reward(
            title="Certificado Bronze",
            description="Certificado de conclusão nível Bronze",
            required_points=100,
            required_level="Bronze",
            active=True
        )
        await db.rewards.insert_one(reward.model_dump())
        print("✓ Recompensa criada")
    
    print("\n✓ Dados de teste criados com sucesso!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
