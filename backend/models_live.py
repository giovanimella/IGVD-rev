"""
Modelos para o sistema de Lives
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class LiveSettings(BaseModel):
    """Configurações da live atual"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Informações da live
    title: str = "Live Semanal"
    description: Optional[str] = "Toda terça-feira"
    meeting_link: Optional[str] = None  # Link do Google Meet
    
    # Pontuação
    points_reward: int = 10  # Pontos que o licenciado ganha ao participar
    
    # Status
    is_active: bool = False  # Se a live está acontecendo/disponível
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class LiveSettingsUpdate(BaseModel):
    """Atualização das configurações da live"""
    title: Optional[str] = None
    description: Optional[str] = None
    meeting_link: Optional[str] = None
    points_reward: Optional[int] = None
    is_active: Optional[bool] = None


class LiveParticipation(BaseModel):
    """Registro de participação em live"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    user_name: str
    live_id: str
    points_earned: int
    participated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
