from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
import uuid

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "franqueado"

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

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    points: int
    level_title: str
    created_at: str
    updated_at: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

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

class ModuleCreate(BaseModel):
    title: str
    description: str
    order: int
    has_certificate: bool = False
    certificate_template_url: Optional[str] = None
    points_reward: int = 0

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