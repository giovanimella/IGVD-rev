from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
import uuid

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "licenciado"
    phone: Optional[str] = None
    supervisor_id: Optional[str] = None
    password: Optional[str] = None  # Senha opcional - se não fornecida, gera temporária

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str
    points: int = 0
    level_title: str = "Iniciante"
    profile_picture: Optional[str] = None  # URL da foto de perfil
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    
    current_stage: str = "registro"
    supervisor_id: Optional[str] = None
    registration_link_token: Optional[str] = None
    phone: Optional[str] = None
    documents_uploaded: List[str] = []
    payment_status: str = "pending"
    payment_transaction_id: Optional[str] = None
    scheduled_training_date: Optional[str] = None
    training_class_id: Optional[str] = None
    training_attended: bool = False
    field_sales_count: int = 0
    field_sales_notes: List[dict] = []
    # Novos campos
    birthday: Optional[str] = None  # Data de aniversário (YYYY-MM-DD)
    terms_accepted: bool = False  # Se aceitou os termos
    terms_accepted_at: Optional[str] = None  # Data/hora de aceite
    last_access_at: Optional[str] = None  # Último acesso à plataforma

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    points: int
    level_title: str
    profile_picture: Optional[str] = None
    created_at: str
    updated_at: str
    current_stage: Optional[str] = None
    phone: Optional[str] = None
    payment_status: Optional[str] = None
    supervisor_id: Optional[str] = None
    leader_id: Optional[str] = None
    leader_name: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class LicenseeRegistration(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str
    registration_token: str

class Module(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    order: int
    has_certificate: bool = False
    certificate_template_url: Optional[str] = None
    points_reward: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    created_by: str
    is_acolhimento: bool = False
    has_assessment: bool = False
    visibility_delay_months: int = 0  # 0 = aparece imediatamente, X = aparece após X meses
    allow_rewatch: bool = True  # Se o licenciado pode reassistir capítulos concluídos
    module_type: str = "standard"  # 'standard', 'live_class'
    live_stream_url: Optional[str] = None  # URL do YouTube/Twitch para aulas ao vivo
    live_stream_platform: Optional[str] = None  # 'youtube', 'twitch'
    live_stream_scheduled: Optional[str] = None  # Data/hora agendada da transmissão

class ModuleCreate(BaseModel):
    title: str
    description: str
    order: int
    has_certificate: bool = False
    certificate_template_url: Optional[str] = None
    points_reward: int = 0
    is_acolhimento: bool = False
    has_assessment: bool = False
    visibility_delay_months: int = 0
    allow_rewatch: bool = True
    module_type: str = "standard"
    live_stream_url: Optional[str] = None
    live_stream_platform: Optional[str] = None
    live_stream_scheduled: Optional[str] = None
    cover_image: Optional[str] = None  # URL da imagem de capa do módulo

class Chapter(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    module_id: str
    title: str
    description: str
    order: int
    content_type: str
    video_url: Optional[str] = None
    document_url: Optional[str] = None
    text_content: Optional[str] = None
    duration_minutes: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class ChapterCreate(BaseModel):
    module_id: str
    title: str
    description: str
    order: int
    content_type: str
    video_url: Optional[str] = None
    document_url: Optional[str] = None
    text_content: Optional[str] = None
    duration_minutes: int = 0

class Assessment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    module_id: str
    title: str
    description: str
    passing_score: int
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class AssessmentCreate(BaseModel):
    module_id: str
    title: str
    description: str
    passing_score: int

class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assessment_id: str
    question_text: str
    question_type: str  # 'single_choice' ou 'multiple_choice'
    points: int
    order: int
    options: List[str] = []
    correct_answers: List[str] = []  # Lista de respostas corretas (para múltipla escolha)

class QuestionCreate(BaseModel):
    assessment_id: str
    question_text: str
    question_type: str  # 'single_choice' ou 'multiple_choice'
    points: int
    order: int
    options: List[str] = []
    correct_answers: List[str] = []

class UserAssessment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    assessment_id: str
    answers: List[dict]
    score: int
    passed: bool
    completed_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class AssessmentSubmission(BaseModel):
    assessment_id: str
    answers: List[dict]

class UserProgress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    module_id: str
    chapter_id: str
    completed: bool = False
    completed_at: Optional[str] = None
    watched_percentage: int = 0

class ProgressUpdate(BaseModel):
    chapter_id: str
    module_id: str
    completed: bool = False
    watched_percentage: float = 0

class Reward(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    required_points: int
    required_level: Optional[str] = None
    image_url: Optional[str] = None
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class RewardCreate(BaseModel):
    title: str
    description: str
    required_points: int
    required_level: Optional[str] = None
    image_url: Optional[str] = None
    active: bool = True

class RewardRedemption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    reward_id: str
    requested_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    status: str = "pending"
    approved_at: Optional[str] = None
    approved_by: Optional[str] = None
    delivered_at: Optional[str] = None

class SupervisorLink(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    supervisor_id: str
    token: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    registrations_count: int = 0

class TrainingClass(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    capacity: int = 20
    enrolled_count: int = 0
    status: str = "open"
    closes_at: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class TrainingClassCreate(BaseModel):
    date: str
    capacity: int = 20

class FieldSaleNote(BaseModel):
    date: str
    note: str
    sale_number: int

class FileFolder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    icon: str = "📁"  # emoji do ícone
    color: str = "#06b6d4"  # cor da pasta
    order: int = 0
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class FileFolderCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: str = "📁"
    color: str = "#06b6d4"
    order: int = 0

class FileRepository(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_filename: str
    file_type: str
    category: str
    folder_id: Optional[str] = None  # ID da pasta (opcional)
    file_url: str
    file_size: int
    uploaded_by: str
    uploaded_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class FileUpload(BaseModel):
    category: str
    file_type: str

class Certificate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    module_id: str
    issued_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    certificate_url: str

class EmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: str
    html_content: str

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: str
    read: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    related_id: Optional[str] = None

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: str
    related_id: Optional[str] = None

class Banner(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_url: str
    title: Optional[str] = None
    link: Optional[str] = None
    order: int = 0
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class BannerCreate(BaseModel):
    image_url: str
    title: Optional[str] = None
    link: Optional[str] = None
    order: int = 0
    active: bool = True

class Post(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    content: str
    author_id: str
    author_name: str
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class PostCreate(BaseModel):
    title: str
    description: str
    content: str
    active: bool = True

class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    status: str = "active"
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None
    unread_count: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class ConversationResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    status: str
    last_message: Optional[str]
    last_message_at: Optional[str]
    unread_count: int
    created_at: str

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    message: str
    read: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class MessageCreate(BaseModel):
    conversation_id: str
    message: str

class UserAccess(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    accessed_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))

# ==================== GAMIFICAÇÃO ====================

class Badge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    icon: str  # emoji ou nome do ícone
    color: str = "#06b6d4"  # cor do badge
    points_reward: int = 0  # pontos ao conquistar
    criteria_type: str  # 'modules_completed', 'days_streak', 'points_reached', 'manual', 'first_module', 'all_modules'
    criteria_value: int = 0  # valor para atingir o critério
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class BadgeCreate(BaseModel):
    name: str
    description: str
    icon: str
    color: str = "#06b6d4"
    points_reward: int = 0
    criteria_type: str
    criteria_value: int = 0
    active: bool = True

class UserBadge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    badge_id: str
    earned_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class UserStreak(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    current_streak: int = 0
    longest_streak: int = 0
    last_access_date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class WeeklyChallenge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    challenge_type: str  # 'complete_modules', 'complete_chapters', 'earn_points', 'daily_access'
    target_value: int  # valor alvo para completar
    points_reward: int  # pontos de recompensa
    start_date: str
    end_date: str
    active: bool = True
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class WeeklyChallengeCreate(BaseModel):
    title: str
    description: str
    challenge_type: str
    target_value: int
    points_reward: int
    start_date: str
    end_date: str
    active: bool = True

class UserChallengeProgress(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    challenge_id: str
    current_progress: int = 0
    completed: bool = False
    completed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

# ==================== CONFIGURAÇÕES DO SISTEMA ====================

class SystemConfig(BaseModel):
    id: str = "system_config"  # ID fixo, só existe uma configuração
    platform_name: str = "IGVD - Instituto Global de Vendas Diretas"  # Nome da plataforma (alterável pelo admin)
    minimum_passing_score: int = 70  # Nota mínima global para passar (porcentagem)
    certificate_template_path: Optional[str] = None  # Caminho do template de certificado
    certificate_name_y_position: int = 400  # Posição Y do nome no certificado (de baixo para cima)
    certificate_module_y_position: int = 360  # Posição Y do nome do módulo no certificado
    certificate_date_y_position: int = 320  # Posição Y da data no certificado
    platform_logo: Optional[str] = None  # URL da logo da plataforma
    # Configurações de Webhook
    webhook_url: Optional[str] = None  # URL de destino para webhook de saída
    webhook_enabled: bool = False  # Habilitar envio de webhooks
    webhook_api_key: Optional[str] = None  # API Key para autenticar webhooks de entrada
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

# ==================== CHAT DE AULA AO VIVO ====================

class LiveChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    module_id: str
    user_id: str
    user_name: str
    message: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class LiveChatMessageCreate(BaseModel):
    module_id: str
    message: str

# ==================== CERTIFICADOS ====================

class Certificate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    module_id: str
    user_name: str
    module_title: str
    completion_date: str
    certificate_path: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

import secrets

# ==================== TIMELINE SOCIAL (COMUNIDADE) ====================

class TimelinePost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str
    author_name: str
    author_avatar: Optional[str] = None
    content: str
    image_url: Optional[str] = None  # URL da imagem anexada
    likes_count: int = 0
    comments_count: int = 0
    is_pinned: bool = False  # Post fixado no topo
    is_active: bool = True  # Se foi excluído/moderado
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class TimelinePostCreate(BaseModel):
    content: str
    image_url: Optional[str] = None

class TimelineComment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    post_id: str
    author_id: str
    author_name: str
    author_avatar: Optional[str] = None
    content: str
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class TimelineCommentCreate(BaseModel):
    content: str

class TimelineLike(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    post_id: str
    user_id: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class TimelineReaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    post_id: str
    user_id: str
    reaction_type: str  # 'like', 'love', 'celebrate', 'support', 'insightful'
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

# ==================== TERMOS DE ACEITE DIGITAL ====================

class DigitalTerm(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str  # HTML ou Markdown do conteúdo do termo
    version: str = "1.0"
    is_active: bool = True  # Termo atual ativo
    is_required: bool = True  # Se é obrigatório aceitar
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class DigitalTermCreate(BaseModel):
    title: str
    content: str
    version: str = "1.0"
    is_active: bool = True
    is_required: bool = True

class TermAcceptance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_email: str
    term_id: str
    term_version: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    accepted_at: str = Field(default_factory=lambda: datetime.now().isoformat())

# ==================== CONFIGURAÇÕES DE WHATSAPP (EVOLUTION API) ====================

class WhatsAppConfig(BaseModel):
    id: str = "whatsapp_config"
    enabled: bool = False
    api_url: Optional[str] = None  # URL da Evolution API
    api_key: Optional[str] = None  # API Key da Evolution API
    instance_name: Optional[str] = None  # Nome da instância
    # Configurações de notificações
    notify_new_modules: bool = True  # Notificar novos módulos
    notify_tips: bool = True  # Enviar dicas periódicas
    notify_access_reminder: bool = True  # Lembrete de acesso (X dias sem acessar)
    notify_birthday: bool = True  # Feliz aniversário
    notify_live_classes: bool = True  # Aulas ao vivo
    notify_custom: bool = True  # Notas personalizadas do admin
    access_reminder_days: int = 7  # Dias sem acesso para enviar lembrete
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class WhatsAppMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    phone: str
    message_type: str  # 'new_module', 'tip', 'reminder', 'birthday', 'live_class', 'custom'
    content: str
    status: str = "pending"  # 'pending', 'sent', 'failed'
    error_message: Optional[str] = None
    sent_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class WhatsAppCustomMessage(BaseModel):
    user_ids: List[str]  # Lista de IDs de usuários para enviar
    message: str

# ==================== FILTRO DE PALAVRAS (COMUNIDADE) ====================

class BannedWord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    word: str  # Palavra proibida (será armazenada em lowercase)
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class BannedWordCreate(BaseModel):
    word: str

class BannedWordsConfig(BaseModel):
    id: str = "banned_words_config"
    enabled: bool = True  # Se o filtro está ativo
    block_post: bool = True  # Bloquear post inteiro ou apenas censurar
    replacement: str = "***"  # Texto de substituição
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())