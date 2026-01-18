"""
UniOzoxx - Wizard de Configuração Inicial
==========================================
Execute este script na primeira instalação para configurar a plataforma.

Uso:
    python setup_wizard.py

O wizard irá:
1. Coletar configurações do servidor e banco de dados
2. Testar conexão com MongoDB
3. Criar usuário administrador inicial
4. Gerar arquivos .env
5. Inicializar o banco de dados com dados padrão
"""

import os
import sys
import secrets
import asyncio
from getpass import getpass

# Cores para terminal
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header():
    print(f"""
{Colors.CYAN}{Colors.BOLD}
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              🎓 UniOzoxx - Wizard de Configuração             ║
║                                                               ║
║         Plataforma de Treinamento para Licenciados            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
{Colors.END}
""")

def print_step(step_num, total, title):
    print(f"\n{Colors.BLUE}{Colors.BOLD}[Passo {step_num}/{total}] {title}{Colors.END}")
    print("=" * 50)

def print_success(message):
    print(f"{Colors.GREEN}✓ {message}{Colors.END}")

def print_error(message):
    print(f"{Colors.RED}✗ {message}{Colors.END}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠ {message}{Colors.END}")

def get_input(prompt, default=None, required=True, password=False):
    """Coleta input do usuário com valor padrão opcional"""
    if default:
        display_prompt = f"{prompt} [{default}]: "
    else:
        display_prompt = f"{prompt}: "
    
    while True:
        if password:
            value = getpass(display_prompt)
        else:
            value = input(display_prompt).strip()
        
        if not value and default:
            return default
        elif not value and required:
            print_error("Este campo é obrigatório.")
        else:
            return value

def generate_secret_key():
    """Gera uma chave secreta segura"""
    return secrets.token_hex(32)

async def test_mongodb_connection(mongo_url, db_name):
    """Testa conexão com MongoDB"""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        db = client[db_name]
        
        # Tenta uma operação simples
        await db.command('ping')
        
        return True, None
    except Exception as e:
        return False, str(e)

async def create_admin_user(mongo_url, db_name, email, password, full_name):
    """Cria usuário administrador inicial"""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import bcrypt
        import uuid
        from datetime import datetime, timezone
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Verificar se já existe admin
        existing = await db.users.find_one({"role": "admin"})
        if existing:
            return True, "Usuário admin já existe"
        
        # Hash da senha
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Criar usuário
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "full_name": full_name,
            "hashed_password": hashed_password,
            "role": "admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "current_stage": "completo",
            "points": 0,
            "streak": 0
        }
        
        await db.users.insert_one(admin_user)
        
        return True, None
    except Exception as e:
        return False, str(e)

async def initialize_database(mongo_url, db_name):
    """Inicializa banco de dados com dados padrão"""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import uuid
        from datetime import datetime, timezone
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Criar índices
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.modules.create_index("order")
        await db.progress.create_index([("user_id", 1), ("chapter_id", 1)], unique=True)
        
        # Criar configurações iniciais
        
        # 1. Configurações do sistema
        system_config = await db.system_config.find_one({"id": "system_config"})
        if not system_config:
            await db.system_config.insert_one({
                "id": "system_config",
                "platform_name": "UniOzoxx",
                "min_score_percentage": 70,
                "certificate_name_y": 320,
                "certificate_date_y": 440,
                "certificate_module_y": 260,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        # 2. Configurações de treinamento
        training_config = await db.training_config.find_one({"id": "training_config"})
        if not training_config:
            await db.training_config.insert_one({
                "id": "training_config",
                "days_before_closing": 7,
                "solo_price": 3500.0,
                "couple_price": 6000.0,
                "terms_and_conditions": "Termos e condições do treinamento presencial.\n\nAo se inscrever, você concorda com as seguintes condições:\n\n1. O treinamento tem duração de 3 dias\n2. Hospedagem e alimentação estão inclusos\n3. Em caso de ausência, será necessário reagendar sem custo adicional\n4. É obrigatório apresentar documento de identificação no check-in",
                "training_instructions": "Instruções para o treinamento:\n\n1. Chegue com 30 minutos de antecedência\n2. Traga documento de identificação com foto\n3. Use roupas confortáveis\n4. Materiais serão fornecidos no local"
            })
        
        # 3. Níveis de gamificação padrão
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
        
        return True, None
    except Exception as e:
        return False, str(e)

def create_env_files(config):
    """Cria arquivos .env com as configurações"""
    
    # Backend .env
    backend_env = f"""# Configurações do Backend - Gerado pelo Wizard
MONGO_URL={config['mongo_url']}
DB_NAME={config['db_name']}
JWT_SECRET_KEY={config['jwt_secret']}
ACCESS_TOKEN_EXPIRE_MINUTES=1440
RESEND_API_KEY={config.get('resend_api_key', '')}
EMAIL_FROM={config.get('email_from', 'noreply@seudominio.com.br')}
APP_URL={config['app_url']}
ENVIRONMENT=production
"""
    
    # Frontend .env
    frontend_env = f"""# Configurações do Frontend - Gerado pelo Wizard
REACT_APP_BACKEND_URL={config['app_url']}
REACT_APP_NAME=UniOzoxx
REACT_APP_VERSION=1.0.0
"""
    
    # Salvar arquivos
    backend_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
    frontend_path = os.path.join(os.path.dirname(__file__), 'frontend', '.env')
    
    with open(backend_path, 'w') as f:
        f.write(backend_env)
    
    with open(frontend_path, 'w') as f:
        f.write(frontend_env)
    
    return backend_path, frontend_path

def main():
    print_header()
    
    print(f"""
{Colors.YELLOW}Este wizard irá configurar a plataforma UniOzoxx.
Você precisará das seguintes informações:

  • URL do seu domínio (ex: https://uniozoxx.com.br)
  • Dados de conexão do MongoDB
  • Email e senha do administrador inicial
  • (Opcional) Chave API do Resend para emails
{Colors.END}
""")
    
    input(f"{Colors.CYAN}Pressione ENTER para continuar...{Colors.END}")
    
    config = {}
    total_steps = 5
    
    # ========== PASSO 1: URL DO SERVIDOR ==========
    print_step(1, total_steps, "Configuração do Servidor")
    
    print("""
A URL da aplicação é o endereço onde os usuários acessarão a plataforma.
Exemplos:
  • https://uniozoxx.com.br
  • https://app.suaempresa.com.br
  • https://treinamento.suaempresa.com.br
""")
    
    config['app_url'] = get_input("URL da aplicação", "https://uniozoxx.com.br")
    
    # Remover barra final se houver
    config['app_url'] = config['app_url'].rstrip('/')
    
    print_success(f"URL configurada: {config['app_url']}")
    
    # ========== PASSO 2: BANCO DE DADOS ==========
    print_step(2, total_steps, "Configuração do Banco de Dados")
    
    print("""
A plataforma usa MongoDB como banco de dados.
Você pode usar:
  • MongoDB local: mongodb://localhost:27017
  • MongoDB Atlas: mongodb+srv://usuario:senha@cluster.mongodb.net
""")
    
    config['mongo_url'] = get_input("String de conexão MongoDB", "mongodb://localhost:27017")
    config['db_name'] = get_input("Nome do banco de dados", "uniozoxx_prod")
    
    print(f"\n{Colors.CYAN}Testando conexão com MongoDB...{Colors.END}")
    
    success, error = asyncio.run(test_mongodb_connection(config['mongo_url'], config['db_name']))
    
    if success:
        print_success("Conexão com MongoDB estabelecida!")
    else:
        print_error(f"Falha na conexão: {error}")
        print_warning("Verifique as credenciais e tente novamente.")
        retry = get_input("Tentar novamente? (s/n)", "s")
        if retry.lower() != 's':
            print("\nInstalação cancelada.")
            sys.exit(1)
        else:
            main()  # Reiniciar wizard
            return
    
    # ========== PASSO 3: SEGURANÇA ==========
    print_step(3, total_steps, "Configuração de Segurança")
    
    print("""
Uma chave secreta é necessária para gerar tokens de autenticação.
Vou gerar uma automaticamente, mas você pode definir sua própria.
""")
    
    generated_key = generate_secret_key()
    use_generated = get_input(f"Usar chave gerada automaticamente? (s/n)", "s")
    
    if use_generated.lower() == 's':
        config['jwt_secret'] = generated_key
        print_success("Chave secreta gerada!")
    else:
        config['jwt_secret'] = get_input("Digite sua chave secreta (mínimo 32 caracteres)")
    
    # ========== PASSO 4: USUÁRIO ADMIN ==========
    print_step(4, total_steps, "Criar Usuário Administrador")
    
    print("""
Vamos criar o primeiro usuário administrador da plataforma.
Este usuário terá acesso total ao sistema.
""")
    
    admin_name = get_input("Nome completo do administrador", "Administrador")
    admin_email = get_input("Email do administrador")
    admin_password = get_input("Senha do administrador (mínimo 6 caracteres)", password=True)
    
    while len(admin_password) < 6:
        print_error("A senha deve ter no mínimo 6 caracteres.")
        admin_password = get_input("Senha do administrador", password=True)
    
    confirm_password = get_input("Confirme a senha", password=True)
    
    while admin_password != confirm_password:
        print_error("As senhas não coincidem.")
        admin_password = get_input("Senha do administrador", password=True)
        confirm_password = get_input("Confirme a senha", password=True)
    
    # ========== PASSO 5: EMAIL (OPCIONAL) ==========
    print_step(5, total_steps, "Configuração de Email (Opcional)")
    
    print("""
Para enviar emails (recuperação de senha, notificações), 
você precisa de uma conta no Resend (https://resend.com).

Você pode pular esta etapa e configurar depois.
""")
    
    setup_email = get_input("Configurar email agora? (s/n)", "n")
    
    if setup_email.lower() == 's':
        config['resend_api_key'] = get_input("Chave API do Resend")
        config['email_from'] = get_input("Email de remetente", f"noreply@{config['app_url'].replace('https://', '').replace('http://', '')}")
    else:
        config['resend_api_key'] = ''
        config['email_from'] = ''
    
    # ========== APLICAR CONFIGURAÇÕES ==========
    print(f"\n{Colors.BLUE}{Colors.BOLD}Aplicando configurações...{Colors.END}")
    print("=" * 50)
    
    # 1. Criar arquivos .env
    print(f"\n{Colors.CYAN}1. Criando arquivos de configuração...{Colors.END}")
    try:
        backend_path, frontend_path = create_env_files(config)
        print_success(f"Backend: {backend_path}")
        print_success(f"Frontend: {frontend_path}")
    except Exception as e:
        print_error(f"Erro ao criar arquivos: {e}")
        sys.exit(1)
    
    # 2. Inicializar banco de dados
    print(f"\n{Colors.CYAN}2. Inicializando banco de dados...{Colors.END}")
    success, error = asyncio.run(initialize_database(config['mongo_url'], config['db_name']))
    if success:
        print_success("Banco de dados inicializado!")
    else:
        print_error(f"Erro: {error}")
    
    # 3. Criar usuário admin
    print(f"\n{Colors.CYAN}3. Criando usuário administrador...{Colors.END}")
    success, error = asyncio.run(create_admin_user(
        config['mongo_url'], 
        config['db_name'], 
        admin_email, 
        admin_password,
        admin_name
    ))
    if success:
        if error:
            print_warning(error)
        else:
            print_success(f"Administrador criado: {admin_email}")
    else:
        print_error(f"Erro: {error}")
    
    # ========== CONCLUSÃO ==========
    print(f"""
{Colors.GREEN}{Colors.BOLD}
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║               ✓ CONFIGURAÇÃO CONCLUÍDA!                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
{Colors.END}

{Colors.CYAN}Resumo da Instalação:{Colors.END}
  • URL: {config['app_url']}
  • Banco: {config['db_name']}
  • Admin: {admin_email}

{Colors.YELLOW}Próximos Passos:{Colors.END}

  1. {Colors.BOLD}Build do Frontend:{Colors.END}
     cd frontend && yarn install && yarn build

  2. {Colors.BOLD}Iniciar o Backend:{Colors.END}
     cd backend && pip install -r requirements.txt
     uvicorn server:app --host 0.0.0.0 --port 8001

  3. {Colors.BOLD}Configurar Nginx/Apache{Colors.END} (veja DEPLOY.md)

  4. {Colors.BOLD}Acessar a plataforma:{Colors.END}
     {config['app_url']}

{Colors.CYAN}Credenciais de Acesso:{Colors.END}
  • Email: {admin_email}
  • Senha: (a que você definiu)

{Colors.YELLOW}Documentação completa em: DEPLOY.md{Colors.END}
""")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Instalação cancelada pelo usuário.{Colors.END}")
        sys.exit(0)
