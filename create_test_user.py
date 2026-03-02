import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime
import uuid

# Carregar variáveis de ambiente
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

# Importar get_password_hash
sys.path.insert(0, str(ROOT_DIR))
from auth import get_password_hash

async def create_requested_test_licensee():
    """Cria o licenciado com as credenciais específicas solicitadas para teste"""
    
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Dados do licenciado conforme solicitado
    email = "test.licensee@ozoxx.com"
    password = "test123"
    full_name = "Test Licensee User"
    
    # Verificar se já existe
    existing = await db.users.find_one({"email": email})
    if existing:
        print(f"✅ Usuário já existe!")
        print(f"📧 Email: {email}")
        print(f"🔑 Senha: {password}")
        print(f"👤 Nome: {existing.get('full_name', 'N/A')}")
        print(f"🎯 Role: {existing.get('role', 'N/A')}")
        print(f"📍 Stage: {existing.get('current_stage', 'N/A')}")
        client.close()
        return
    
    # Criar usuário licenciado
    licensee = {
        "id": str(uuid.uuid4()),
        "email": email,
        "full_name": full_name,
        "role": "licenciado",
        "password_hash": get_password_hash(password),
        "points": 75,
        "level_title": "Iniciante",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "current_stage": "treinamento_presencial",  # Stage ideal para testar pagamento de inscrição
        "supervisor_id": None,
        "registration_link_token": None,
        "phone": "11987654321",
        "cpf": "123.456.789-00",
        "documents_uploaded": [],
        "payment_status": "pending",
        "payment_transaction_id": None,
        "scheduled_training_date": None,
        "training_class_id": None,
        "training_attended": False,
        "training_fee_paid": False,  # Para testar pagamento de taxa
        "field_sales_count": 0,
        "field_sales_notes": []
    }
    
    await db.users.insert_one(licensee)
    
    print("=" * 60)
    print("✅ USUÁRIO DE TESTE CRIADO COM SUCESSO!")
    print("=" * 60)
    print(f"📧 Email: {email}")
    print(f"🔑 Senha: {password}")
    print(f"👤 Nome: {full_name}")
    print(f"🎯 Role: licenciado")
    print(f"📍 Stage: treinamento_presencial (ideal para testar pagamento)")
    print(f"⭐ Pontos: 75")
    print("=" * 60)
    print("💡 Pronto para testar as rotas de vendas e pagamento!")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_requested_test_licensee())