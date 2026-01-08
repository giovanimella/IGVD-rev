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

async def create_test_modules():
    """Cria módulos de teste com capítulos"""
    
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Módulos de teste
    modules_data = [
        {
            "title": "Introdução à Ozoxx",
            "description": "Conheça a história, valores e missão da Ozoxx",
            "is_acolhimento": True,
            "has_certificate": True,
            "points": 50,
            "chapters": [
                {"title": "História da Ozoxx", "content": "Neste capítulo você aprenderá sobre a fundação e evolução da empresa...", "video_url": "", "order": 0},
                {"title": "Missão e Valores", "content": "Entenda os valores que guiam a Ozoxx no dia a dia...", "video_url": "", "order": 1},
                {"title": "Estrutura Organizacional", "content": "Conheça como a empresa está organizada...", "video_url": "", "order": 2}
            ]
        },
        {
            "title": "Produtos e Serviços",
            "description": "Aprenda sobre todos os produtos e serviços oferecidos pela Ozoxx",
            "is_acolhimento": True,
            "has_certificate": True,
            "points": 75,
            "chapters": [
                {"title": "Catálogo de Produtos", "content": "Conheça toda a linha de produtos Ozoxx...", "video_url": "", "order": 0},
                {"title": "Serviços Oferecidos", "content": "Descubra os serviços que complementam nossos produtos...", "video_url": "", "order": 1},
                {"title": "Diferenciais Competitivos", "content": "Entenda o que nos torna únicos no mercado...", "video_url": "", "order": 2},
                {"title": "Garantias e Políticas", "content": "Saiba sobre nossas políticas de garantia e troca...", "video_url": "", "order": 3}
            ]
        },
        {
            "title": "Técnicas de Vendas",
            "description": "Desenvolva habilidades essenciais para vender com excelência",
            "is_acolhimento": False,
            "has_certificate": True,
            "points": 100,
            "chapters": [
                {"title": "Abordagem ao Cliente", "content": "Como fazer uma primeira abordagem eficiente...", "video_url": "", "order": 0},
                {"title": "Identificação de Necessidades", "content": "Técnicas para descobrir o que o cliente realmente precisa...", "video_url": "", "order": 1},
                {"title": "Apresentação de Soluções", "content": "Como apresentar produtos de forma persuasiva...", "video_url": "", "order": 2},
                {"title": "Fechamento de Vendas", "content": "Estratégias para concretizar a venda...", "video_url": "", "order": 3},
                {"title": "Pós-Venda", "content": "A importância do relacionamento após a venda...", "video_url": "", "order": 4}
            ]
        },
        {
            "title": "Gestão de Franquia",
            "description": "Aprenda a gerenciar sua franquia com eficiência",
            "is_acolhimento": False,
            "has_certificate": True,
            "points": 120,
            "chapters": [
                {"title": "Gestão Financeira", "content": "Controle suas finanças e maximize lucros...", "video_url": "", "order": 0},
                {"title": "Gestão de Estoque", "content": "Como manter seu estoque sempre organizado...", "video_url": "", "order": 1},
                {"title": "Gestão de Pessoas", "content": "Lidere sua equipe com excelência...", "video_url": "", "order": 2},
                {"title": "Marketing Local", "content": "Estratégias para divulgar sua franquia...", "video_url": "", "order": 3}
            ]
        },
        {
            "title": "Atendimento ao Cliente",
            "description": "Excelência no atendimento para fidelizar clientes",
            "is_acolhimento": False,
            "has_certificate": False,
            "points": 80,
            "chapters": [
                {"title": "Princípios do Bom Atendimento", "content": "Os pilares de um atendimento excepcional...", "video_url": "", "order": 0},
                {"title": "Comunicação Eficaz", "content": "Como se comunicar de forma clara e empática...", "video_url": "", "order": 1},
                {"title": "Resolução de Conflitos", "content": "Técnicas para lidar com clientes insatisfeitos...", "video_url": "", "order": 2}
            ]
        }
    ]
    
    print("=" * 60)
    print("✅ CRIANDO MÓDULOS DE TESTE")
    print("=" * 60)
    
    for module_data in modules_data:
        # Criar módulo
        module_id = str(uuid.uuid4())
        module = {
            "id": module_id,
            "title": module_data["title"],
            "description": module_data["description"],
            "is_acolhimento": module_data["is_acolhimento"],
            "has_certificate": module_data["has_certificate"],
            "certificate_template": None,
            "points": module_data["points"],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        await db.modules.insert_one(module)
        print(f"✅ Módulo criado: {module['title']}")
        
        # Criar capítulos
        for chapter_data in module_data["chapters"]:
            chapter = {
                "id": str(uuid.uuid4()),
                "module_id": module_id,
                "title": chapter_data["title"],
                "content": chapter_data["content"],
                "video_url": chapter_data["video_url"],
                "order": chapter_data["order"],
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            await db.chapters.insert_one(chapter)
            print(f"   - Capítulo: {chapter['title']}")
    
    print("=" * 60)
    print(f"✅ TOTAL: {len(modules_data)} módulos criados com sucesso!")
    print("=" * 60)
    print("\n📊 RESUMO:")
    print(f"   • Módulos de Acolhimento: 2")
    print(f"   • Módulos Avançados: 3")
    print(f"   • Total de Capítulos: ~17")
    print(f"   • Total de Pontos Disponíveis: 425")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_modules())
