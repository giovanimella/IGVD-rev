"""
Modelos para o sistema de Lives
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid


class LiveSettings(BaseModel):
    """Configurações gerais da live"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Informações da live
    title: str = "Live Semanal"
    description: Optional[str] = "Toda terça-feira"
    meeting_link: Optional[str] = None  # Link do Google Meet
    
    # Pontuação
    points_reward: int = 10  # Pontos que o licenciado ganha ao participar
    
    # Sessão atual
    current_session_id: Optional[str] = None  # ID da sessão ativa
    is_active: bool = False
    
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


class LiveSession(BaseModel):
    """Sessão de uma live (cada vez que a live é ativada)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    points_reward: int = 10
    
    # Status
    is_active: bool = True
    
    # Contadores
    participants_count: int = 0
    
    # Timestamps
    started_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    ended_at: Optional[str] = None


class LiveParticipation(BaseModel):
    """Registro de participação em live"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str  # ID da sessão da live
    user_id: str
    user_email: str
    user_name: str
    points_earned: int
    participated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
