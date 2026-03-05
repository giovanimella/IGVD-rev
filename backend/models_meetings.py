"""
Modelos de dados para Sistema de Reuniões
Licenciados podem cadastrar reuniões e participantes para ganhar pontos
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid


# ==================== ENUMS ====================

class MeetingStatus(str, Enum):
    """Status da reunião"""
    DRAFT = "draft"  # Rascunho - ainda cadastrando participantes
    CLOSED = "closed"  # Lista fechada - pontos já creditados
    CANCELLED = "cancelled"  # Reunião cancelada


# ==================== CONFIGURAÇÕES ====================

class MeetingSettings(BaseModel):
    """Configurações globais do sistema de reuniões (Admin)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Pontuação - Nova Regra
    points_per_meeting: int = 10  # Pontos ganhos por reunião (se atingir mínimo)
    min_participants_for_points: int = 20  # Mínimo de participantes para ganhar pontos
    
    # Legado (mantido para compatibilidade)
    points_per_participant: int = 0  # Descontinuado - usar points_per_meeting
    
    # Limites
    min_participants: int = 1  # Mínimo de participantes para fechar lista
    max_participants_per_meeting: int = 100  # Máximo por reunião
    
    # Configurações
    require_email: bool = True  # Email obrigatório
    require_phone: bool = True  # Telefone obrigatório
    allow_duplicate_participants: bool = False  # Permitir mesmo CPF em reuniões diferentes
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class MeetingSettingsUpdate(BaseModel):
    """Atualização de configurações (Admin)"""
    # Nova regra de pontuação
    points_per_meeting: Optional[int] = None  # Pontos por reunião
    min_participants_for_points: Optional[int] = None  # Mínimo para ganhar pontos
    
    # Legado
    points_per_participant: Optional[int] = None  # Descontinuado
    
    # Limites
    min_participants: Optional[int] = None
    max_participants_per_meeting: Optional[int] = None
    
    # Configurações
    require_email: Optional[bool] = None
    require_phone: Optional[bool] = None
    allow_duplicate_participants: Optional[bool] = None


# ==================== REUNIÃO ====================

class Meeting(BaseModel):
    """Reunião cadastrada pelo licenciado"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Licenciado
    user_id: str
    user_name: str
    
    # Dados da reunião
    title: str  # Ex: "Reunião de Vendas - Centro"
    description: Optional[str] = None
    location: str  # Local da reunião
    meeting_date: str  # Data da reunião (YYYY-MM-DD)
    meeting_time: str  # Hora da reunião (HH:MM)
    
    # Status
    status: MeetingStatus = MeetingStatus.DRAFT
    
    # Participantes
    participants_count: int = 0  # Quantidade de participantes
    
    # Pontuação - Nova Regra
    points_awarded: int = 0  # Pontos creditados ao fechar lista
    points_per_meeting: int = 0  # Pontos configurados no momento do fechamento
    min_participants_for_points: int = 0  # Mínimo necessário no momento do fechamento
    qualified_for_points: bool = False  # Se atingiu o mínimo para ganhar pontos
    
    # Legado
    points_per_participant: int = 0  # Descontinuado
    
    # Datas importantes
    closed_at: Optional[str] = None  # Quando a lista foi fechada
    cancelled_at: Optional[str] = None
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class CreateMeetingRequest(BaseModel):
    """Requisição para criar reunião"""
    title: str
    description: Optional[str] = None
    location: str
    meeting_date: str  # YYYY-MM-DD
    meeting_time: str  # HH:MM


class UpdateMeetingRequest(BaseModel):
    """Atualização de dados da reunião"""
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    meeting_date: Optional[str] = None
    meeting_time: Optional[str] = None


# ==================== PARTICIPANTE ====================

class MeetingParticipant(BaseModel):
    """Participante de uma reunião"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Reunião
    meeting_id: str
    user_id: str  # Licenciado que cadastrou
    
    # Dados do participante
    name: str
    email: str
    phone: str
    cpf: Optional[str] = None  # CPF opcional para controle de duplicatas
    
    # Metadados
    notes: Optional[str] = None  # Observações sobre o participante
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class AddParticipantRequest(BaseModel):
    """Requisição para adicionar participante"""
    name: str
    email: str
    phone: str
    cpf: Optional[str] = None
    notes: Optional[str] = None


class BulkAddParticipantsRequest(BaseModel):
    """Adicionar múltiplos participantes de uma vez"""
    participants: List[AddParticipantRequest]


# ==================== RESPONSES ====================

class MeetingResponse(BaseModel):
    """Resposta com dados da reunião"""
    success: bool
    message: str
    meeting: Optional[dict] = None
    participants: Optional[List[dict]] = None


class CloseMeetingResponse(BaseModel):
    """Resposta ao fechar lista de reunião"""
    success: bool
    message: str
    meeting_id: str
    participants_count: int
    points_awarded: int
    new_total_points: int  # Total de pontos do usuário após creditação


# ==================== ESTATÍSTICAS ====================

class MeetingStats(BaseModel):
    """Estatísticas de reuniões do usuário"""
    total_meetings: int = 0
    total_closed_meetings: int = 0
    total_participants: int = 0
    total_points_earned: int = 0
    current_month_meetings: int = 0
    current_month_participants: int = 0
