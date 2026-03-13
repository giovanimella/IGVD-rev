"""
Modelos para o CRM de Prospects
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class LeadStatus(str, Enum):
    """Status do lead no pipeline"""
    NOVO = "novo"                    # Novo Lead
    CONTATO = "contato"              # Contato Inicial
    NEGOCIACAO = "negociacao"        # Em Negociação
    GANHO = "ganho"                  # Fechado (Ganho)
    PERDIDO = "perdido"              # Fechado (Perdido)


class LeadOrigin(str, Enum):
    """Origem do lead"""
    INDICACAO = "indicacao"
    EVENTO = "evento"
    REDES_SOCIAIS = "redes_sociais"
    REUNIAO = "reuniao"
    SITE = "site"
    WHATSAPP = "whatsapp"
    TELEFONE = "telefone"
    OUTRO = "outro"


class LeadPriority(str, Enum):
    """Prioridade do lead"""
    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"
    URGENTE = "urgente"


# ==================== MODELOS DE LEAD/PROSPECT ====================

class Lead(BaseModel):
    """Modelo de Lead/Prospect"""
    id: str = None
    user_id: str  # Licenciado dono do lead
    
    # Dados básicos
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    cpf: Optional[str] = None
    
    # Localização
    city: Optional[str] = None
    state: Optional[str] = None
    
    # Pipeline
    status: LeadStatus = LeadStatus.NOVO
    origin: Optional[LeadOrigin] = None
    priority: LeadPriority = LeadPriority.MEDIA
    
    # Produto/Venda
    product_interest: Optional[str] = None  # Produto de interesse
    estimated_value: Optional[float] = None  # Valor estimado da venda
    sale_value: Optional[float] = None       # Valor real da venda (quando convertido)
    
    # Datas
    contact_date: Optional[str] = None       # Data do primeiro contato
    next_contact_date: Optional[str] = None  # Data do próximo contato
    converted_date: Optional[str] = None     # Data da conversão
    lost_date: Optional[str] = None          # Data que foi perdido
    
    # Observações
    notes: Optional[str] = None
    lost_reason: Optional[str] = None        # Motivo da perda
    
    # Metadados
    created_at: str = None
    updated_at: str = None
    
    def __init__(self, **data):
        super().__init__(**data)
        if not self.id:
            self.id = str(uuid.uuid4())
        if not self.created_at:
            self.created_at = datetime.utcnow().isoformat()
        self.updated_at = datetime.utcnow().isoformat()


class LeadActivity(BaseModel):
    """Atividade/Histórico do lead"""
    id: str = None
    lead_id: str
    user_id: str
    
    activity_type: str  # call, email, meeting, note, status_change, etc.
    description: str
    
    # Para mudança de status
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    
    created_at: str = None
    
    def __init__(self, **data):
        super().__init__(**data)
        if not self.id:
            self.id = str(uuid.uuid4())
        if not self.created_at:
            self.created_at = datetime.utcnow().isoformat()


class LeadTask(BaseModel):
    """Tarefa associada ao lead"""
    id: str = None
    lead_id: str
    user_id: str
    
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    completed: bool = False
    completed_at: Optional[str] = None
    
    created_at: str = None
    
    def __init__(self, **data):
        super().__init__(**data)
        if not self.id:
            self.id = str(uuid.uuid4())
        if not self.created_at:
            self.created_at = datetime.utcnow().isoformat()


# ==================== REQUESTS ====================

class CreateLeadRequest(BaseModel):
    """Requisição para criar lead"""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    cpf: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    origin: Optional[LeadOrigin] = None
    priority: Optional[LeadPriority] = LeadPriority.MEDIA
    product_interest: Optional[str] = None
    estimated_value: Optional[float] = None
    contact_date: Optional[str] = None
    next_contact_date: Optional[str] = None
    notes: Optional[str] = None


class UpdateLeadRequest(BaseModel):
    """Requisição para atualizar lead"""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    cpf: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    status: Optional[LeadStatus] = None
    origin: Optional[LeadOrigin] = None
    priority: Optional[LeadPriority] = None
    product_interest: Optional[str] = None
    estimated_value: Optional[float] = None
    sale_value: Optional[float] = None
    contact_date: Optional[str] = None
    next_contact_date: Optional[str] = None
    notes: Optional[str] = None
    lost_reason: Optional[str] = None


class MoveLeadRequest(BaseModel):
    """Requisição para mover lead no pipeline"""
    new_status: LeadStatus
    sale_value: Optional[float] = None  # Se convertido
    lost_reason: Optional[str] = None   # Se perdido


class CreateTaskRequest(BaseModel):
    """Requisição para criar tarefa"""
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None


class CreateActivityRequest(BaseModel):
    """Requisição para criar atividade"""
    activity_type: str
    description: str


# ==================== RESPONSES ====================

class PipelineStats(BaseModel):
    """Estatísticas do pipeline"""
    total_leads: int = 0
    leads_by_status: Dict[str, int] = {}
    value_by_status: Dict[str, float] = {}
    total_estimated_value: float = 0
    total_converted_value: float = 0
    conversion_rate: float = 0
    leads_this_month: int = 0
    conversions_this_month: int = 0


class LeadWithDetails(BaseModel):
    """Lead com detalhes (atividades e tarefas)"""
    lead: Dict[str, Any]
    activities: List[Dict[str, Any]] = []
    tasks: List[Dict[str, Any]] = []
