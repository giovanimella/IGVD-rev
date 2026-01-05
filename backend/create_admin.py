import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_password_hash
from models import User
import os
from dotenv import load_dotenv

load_dotenv()

async def create_admin():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    existing = await db.users.find_one({"email": "admin@ozoxx.com"})
    if existing:
        print("Admin já existe!")
        return
    
    admin = User(
        email="admin@ozoxx.com",
        full_name="Administrador Ozoxx",
        role="admin"
    )
    
    admin_dict = admin.model_dump()
    admin_dict["password_hash"] = get_password_hash("admin123")
    
    await db.users.insert_one(admin_dict)
    print("Admin criado com sucesso!")
    print("Email: admin@ozoxx.com")
    print("Senha: admin123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin())
