from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
import uuid

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "licenciado"

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

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    points: int
    level_title: str
    created_at: str
    updated_at: str
    current_stage: Optional[str] = None
    phone: Optional[str] = None
    payment_status: Optional[str] = None

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

class ModuleCreate(BaseModel):
    title: str
    description: str
    order: int
    has_certificate: bool = False
    certificate_template_url: Optional[str] = None
    points_reward: int = 0
    is_acolhimento: bool = False
    has_assessment: bool = False

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
    question_type: str
    points: int
    order: int
    options: List[str] = []
    correct_answer: Optional[str] = None

class QuestionCreate(BaseModel):
    assessment_id: str
    question_text: str
    question_type: str
    points: int
    order: int
    options: List[str] = []
    correct_answer: Optional[str] = None

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
    watched_percentage: int = 0

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

class FileRepository(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_filename: str
    file_type: str
    category: str
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

import secrets