"""
Script para configurar valores padrão do Sistema de Assinaturas e Reuniões
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'uniozoxx_prod')

async def setup_subscription_settings():
    """Configura settings padrão de assinatura"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Verificar se já existe
    existing = await db.subscription_settings.find_one({})
    
    if not existing:
        settings = {
            "id": "default",
            "monthly_fee": 49.90,
            "trial_days": 0,
            "grace_period_days": 5,
            "pagbank_subscription_token": None,
            "pagbank_subscription_email": None,
            "pagbank_environment": "sandbox",
            "suspend_after_months": 2,
            "send_payment_failed_email": True,
            "send_suspension_email": True,
            "send_reactivation_email": True,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        await db.subscription_settings.insert_one(settings)
        print("✅ Configurações de assinatura criadas")
    else:
        print("⚠️ Configurações de assinatura já existem")
    
    client.close()


async def setup_meeting_settings():
    """Configura settings padrão de reuniões"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Verificar se já existe
    existing = await db.meeting_settings.find_one({})
    
    if not existing:
        settings = {
            "id": "default",
            "points_per_participant": 1,
            "min_participants": 1,
            "max_participants_per_meeting": 100,
            "require_email": True,
            "require_phone": True,
            "allow_duplicate_participants": False,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        await db.meeting_settings.insert_one(settings)
        print("✅ Configurações de reuniões criadas")
    else:
        print("⚠️ Configurações de reuniões já existem")
    
    client.close()


async def main():
    print("🚀 Configurando sistema de Assinaturas e Reuniões...")
    print(f"📦 Banco de dados: {db_name}")
    print()
    
    await setup_subscription_settings()
    await setup_meeting_settings()
    
    print()
    print("✅ Configuração concluída!")
    print()
    print("📝 Próximos passos:")
    print("1. Acesse o painel administrativo")
    print("2. Vá em 'Assinaturas' para configurar o token do PagBank")
    print("3. Configure o valor da mensalidade se necessário (padrão: R$ 49,90)")
    print("4. Configure os pontos por participante nas Reuniões (padrão: 1 ponto)")


if __name__ == "__main__":
    asyncio.run(main())
