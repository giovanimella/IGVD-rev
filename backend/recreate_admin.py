import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime
import uuid

# Carregar variáveis de ambiente
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Importar get_password_hash
sys.path.insert(0, str(ROOT_DIR))
from auth import get_password_hash

async def recreate_admin():
    """Deleta e recria o usuário admin"""
    
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Dados do admin
    email = "admin@ozoxx.com"
    password = "admin123"
    full_name = "Administrador Ozoxx"
    
    # Deletar se existir
    result = await db.users.delete_one({"email": email})
    if result.deleted_count > 0:
        print("✅ Admin antigo deletado!")
    
    # Criar novo admin
    admin = {
        "id": str(uuid.uuid4()),
        "email": email,
        "full_name": full_name,
        "role": "admin",
        "password_hash": get_password_hash(password),
        "points": 0,
        "level_title": "Administrador",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "current_stage": "completo",
        "supervisor_id": None,
        "registration_link_token": None,
        "phone": None,
        "documents_uploaded": [],
        "payment_status": "paid",
        "payment_transaction_id": None,
        "scheduled_training_date": None,
        "training_class_id": None,
        "training_attended": True,
        "field_sales_count": 0,
        "field_sales_notes": []
    }
    
    await db.users.insert_one(admin)
    
    print("=" * 60)
    print("✅ ADMIN RECRIADO COM SUCESSO!")
    print("=" * 60)
    print(f"📧 Email: {email}")
    print(f"🔑 Senha: {password}")
    print(f"👤 Nome: {full_name}")
    print(f"🎯 Role: admin")
    print("=" * 60)
    print("💡 Use estas credenciais para fazer login na plataforma!")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(recreate_admin())
