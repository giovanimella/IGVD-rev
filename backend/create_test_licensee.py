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

async def create_test_licensee():
    """Cria um licenciado de teste para chat"""
    
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Dados do licenciado
    email = "licenciado.teste@ozoxx.com"
    password = "licenciado123"
    full_name = "Licenciado Teste"
    
    # Verificar se já existe
    existing = await db.users.find_one({"email": email})
    if existing:
        print(f"✅ Licenciado já existe!")
        print(f"📧 Email: {email}")
        print(f"🔑 Senha: {password}")
        return
    
    # Criar usuário licenciado
    licensee = {
        "id": str(uuid.uuid4()),
        "email": email,
        "full_name": full_name,
        "role": "licenciado",
        "password_hash": get_password_hash(password),
        "points": 150,
        "level_title": "Intermediário",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "current_stage": "completo",
        "supervisor_id": None,
        "registration_link_token": None,
        "phone": "11999887766",
        "documents_uploaded": [],
        "payment_status": "paid",
        "payment_transaction_id": None,
        "scheduled_training_date": None,
        "training_class_id": None,
        "training_attended": True,
        "field_sales_count": 10,
        "field_sales_notes": []
    }
    
    await db.users.insert_one(licensee)
    
    print("=" * 60)
    print("✅ LICENCIADO DE TESTE CRIADO COM SUCESSO!")
    print("=" * 60)
    print(f"📧 Email: {email}")
    print(f"🔑 Senha: {password}")
    print(f"👤 Nome: {full_name}")
    print(f"🎯 Role: licenciado")
    print(f"⭐ Pontos: 150")
    print("=" * 60)
    print("💡 Use para testar o chat do lado do licenciado!")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_licensee())
