"""
Script de inicialização do banco de dados
Cria índices, configurações padrão e dados iniciais
"""
import asyncio
import uuid
import os
import sys
from datetime import datetime, timezone

# Adicionar backend ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

async def init_database():
    from motor.motor_asyncio import AsyncIOMotorClient
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'uniozoxx_prod')
    
    print(f"Conectando ao MongoDB: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # 1. Criar índices
    print("Criando índices...")
    
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.users.create_index("supervisor_id")
    await db.users.create_index("role")
    
    await db.modules.create_index("order")
    await db.modules.create_index("id", unique=True)
    
    await db.chapters.create_index("module_id")
    await db.chapters.create_index("id", unique=True)
    
    await db.progress.create_index([("user_id", 1), ("chapter_id", 1)], unique=True)
    await db.progress.create_index("user_id")
    
    await db.badges.create_index("id", unique=True)
    await db.user_badges.create_index([("user_id", 1), ("badge_id", 1)], unique=True)
    
    await db.files.create_index("id", unique=True)
    await db.files.create_index("folder_id")
    
    await db.folders.create_index("id", unique=True)
    
    await db.assessments.create_index("module_id")
    await db.assessment_results.create_index([("user_id", 1), ("assessment_id", 1)])
    
    await db.certificates.create_index([("user_id", 1), ("module_id", 1)], unique=True)
    
    await db.notifications.create_index("user_id")
    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    
    await db.appointments.create_index("user_id")
    await db.appointments.create_index([("user_id", 1), ("start_time", 1)])
    
    await db.training_classes_v2.create_index("id", unique=True)
    await db.training_classes_v2.create_index("date")
    
    await db.training_registrations.create_index("user_id")
    await db.training_registrations.create_index("class_id")
    
    await db.levels.create_index("id", unique=True)
    await db.levels.create_index("min_points")
    
    print("Índices criados!")
    
    # 2. Configurações do sistema
    print("Configurando sistema...")
    
    system_config = await db.system_config.find_one({"id": "system_config"})
    if not system_config:
        await db.system_config.insert_one({
            "id": "system_config",
            "platform_name": "UniOzoxx",
            "min_score_percentage": 70,
            "certificate_name_y": 320,
            "certificate_date_y": 440,
            "certificate_module_y": 260,
            "points_per_chapter": 10,
            "points_per_module": 50,
            "points_per_badge": 25,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        print("  - Configurações do sistema criadas")
    
    # 3. Configurações de treinamento
    training_config = await db.training_config.find_one({"id": "training_config"})
    if not training_config:
        await db.training_config.insert_one({
            "id": "training_config",
            "days_before_closing": 7,
            "solo_price": 3500.0,
            "couple_price": 6000.0,
            "terms_and_conditions": """TERMOS E CONDIÇÕES DO TREINAMENTO PRESENCIAL

Ao se inscrever no treinamento presencial, você concorda com as seguintes condições:

1. DURAÇÃO E LOCAL
   - O treinamento tem duração de 3 (três) dias consecutivos
   - Local e horário serão informados após confirmação da inscrição

2. HOSPEDAGEM E ALIMENTAÇÃO
   - Hospedagem em hotel parceiro está inclusa no valor
   - Café da manhã, almoço e jantar estão inclusos durante o período

3. PRESENÇA
   - A presença é obrigatória em todos os dias do treinamento
   - Em caso de ausência, o participante será realocado para a próxima turma
   - Não há reembolso em caso de desistência após o pagamento

4. DOCUMENTAÇÃO
   - É obrigatório apresentar documento de identificação com foto no check-in
   - Para cônjuges, os mesmos documentos são necessários

5. CANCELAMENTO
   - Cancelamentos devem ser solicitados com no mínimo 7 dias de antecedência
   - Após esse prazo, não há possibilidade de reembolso

Ao prosseguir com a inscrição, você declara ter lido e concordado com todos os termos acima.""",
            "training_instructions": """INSTRUÇÕES PARA O TREINAMENTO

ANTES DO TREINAMENTO:
- Confirme sua inscrição com antecedência
- Verifique a data, horário e local do treinamento
- Separe seus documentos de identificação

NO DIA:
- Chegue com 30 minutos de antecedência
- Traga documento de identificação com foto (RG ou CNH)
- Use roupas confortáveis e calçados fechados
- Traga material para anotações (caderno e caneta)

DURANTE O TREINAMENTO:
- Mantenha o celular no silencioso
- Participe ativamente das atividades
- Em caso de dúvidas, não hesite em perguntar

HOSPEDAGEM:
- O check-in no hotel é feito na véspera do treinamento
- Café da manhã será servido no hotel
- Transporte hotel-local de treinamento será disponibilizado"""
        })
        print("  - Configurações de treinamento criadas")
    
    # 4. Níveis de gamificação
    levels_count = await db.levels.count_documents({})
    if levels_count == 0:
        default_levels = [
            {"id": str(uuid.uuid4()), "title": "Iniciante", "min_points": 0, "icon": "🌱", "color": "#10b981", "description": "Começando a jornada", "order": 1},
            {"id": str(uuid.uuid4()), "title": "Aprendiz", "min_points": 100, "icon": "📚", "color": "#3b82f6", "description": "Em fase de aprendizado", "order": 2},
            {"id": str(uuid.uuid4()), "title": "Intermediário", "min_points": 300, "icon": "⭐", "color": "#f59e0b", "description": "Evoluindo constantemente", "order": 3},
            {"id": str(uuid.uuid4()), "title": "Avançado", "min_points": 600, "icon": "🚀", "color": "#8b5cf6", "description": "Dominando o conhecimento", "order": 4},
            {"id": str(uuid.uuid4()), "title": "Expert", "min_points": 1000, "icon": "🏆", "color": "#ef4444", "description": "Especialista no assunto", "order": 5},
            {"id": str(uuid.uuid4()), "title": "Mestre", "min_points": 2000, "icon": "👑", "color": "#eab308", "description": "Nível máximo de excelência", "order": 6}
        ]
        await db.levels.insert_many(default_levels)
        print("  - Níveis de gamificação criados")
    
    # 5. Badges padrão
    badges_count = await db.badges.count_documents({})
    if badges_count == 0:
        default_badges = [
            {"id": str(uuid.uuid4()), "name": "Primeiro Passo", "description": "Completou o primeiro capítulo", "icon": "👣", "points": 10, "criteria": "complete_first_chapter"},
            {"id": str(uuid.uuid4()), "name": "Explorador", "description": "Completou 5 capítulos", "icon": "🔍", "points": 25, "criteria": "complete_5_chapters"},
            {"id": str(uuid.uuid4()), "name": "Dedicado", "description": "Acessou a plataforma 7 dias seguidos", "icon": "🔥", "points": 50, "criteria": "streak_7_days"},
            {"id": str(uuid.uuid4()), "name": "Estudioso", "description": "Completou um módulo inteiro", "icon": "📖", "points": 100, "criteria": "complete_module"},
            {"id": str(uuid.uuid4()), "name": "Mestre", "description": "Passou em uma avaliação com 100%", "icon": "🎯", "points": 75, "criteria": "perfect_score"},
        ]
        await db.badges.insert_many(default_badges)
        print("  - Badges padrão criados")
    
    print("\n✓ Banco de dados inicializado com sucesso!")
    
    # Estatísticas
    users_count = await db.users.count_documents({})
    modules_count = await db.modules.count_documents({})
    
    print(f"\nEstatísticas:")
    print(f"  - Usuários: {users_count}")
    print(f"  - Módulos: {modules_count}")
    print(f"  - Níveis: {await db.levels.count_documents({})}")
    print(f"  - Badges: {await db.badges.count_documents({})}")

if __name__ == "__main__":
    # Carregar variáveis de ambiente do .env se existir
    env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
    
    asyncio.run(init_database())
