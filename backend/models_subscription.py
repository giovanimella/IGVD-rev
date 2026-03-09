"""
Modelos de dados para Sistema de Assinatura e Mensalidade Recorrente
Integração com PagBank API de Assinaturas
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


# ==================== ENUMS ====================

class SubscriptionStatus(str, Enum):
    """Status da assinatura"""
    ACTIVE = "active"  # Assinatura ativa e pagamento em dia
    PENDING = "pending"  # Aguardando primeiro pagamento
    OVERDUE = "overdue"  # Pagamento atrasado (1º mês)
    SUSPENDED = "suspended"  # Conta suspensa (2+ meses)
    CANCELLED = "cancelled"  # Assinatura cancelada
    TRIAL = "trial"  # Período de teste (se houver)


class PaymentStatus(str, Enum):
    """Status de um pagamento individual"""
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


# ==================== CONFIGURAÇÕES ====================

class SubscriptionSettings(BaseModel):
    """Configurações globais de assinatura (Admin)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Valor da mensalidade
    monthly_fee: float = 49.90  # Valor padrão R$ 49,90
    
    # Configurações de cobrança
    trial_days: int = 0  # Dias de teste gratuito (0 = sem teste)
    grace_period_days: int = 5  # Dias de tolerância após vencimento
    
    # PagBank - Autenticação Unificada
    # Usado tanto para Assinaturas quanto para Checkout (pagamento único)
    pagbank_email: Optional[str] = None  # Email da conta PagBank
    pagbank_token: Optional[str] = None  # Token Bearer para autenticação
    pagbank_public_key: Optional[str] = None  # Chave pública gerada via API (para criptografia de cartões)
    pagbank_environment: str = "sandbox"  # sandbox ou production
    
    # Configurações de suspensão
    suspend_after_months: int = 2  # Suspender após X meses de inadimplência
    
    # Notificações
    send_payment_failed_email: bool = True
    send_suspension_email: bool = True
    send_reactivation_email: bool = True
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class SubscriptionSettingsUpdate(BaseModel):
    """Atualização de configurações (Admin)"""
    monthly_fee: Optional[float] = None
    trial_days: Optional[int] = None
    grace_period_days: Optional[int] = None
    pagbank_email: Optional[str] = None  # Email PagBank
    pagbank_token: Optional[str] = None
    pagbank_public_key: Optional[str] = None
    pagbank_environment: Optional[str] = None
    suspend_after_months: Optional[int] = None
    send_payment_failed_email: Optional[bool] = None
    send_suspension_email: Optional[bool] = None
    send_reactivation_email: Optional[bool] = None


# ==================== PLANO DE ASSINATURA ====================

class SubscriptionPlan(BaseModel):
    """Plano de assinatura no PagBank"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Identificação
    name: str = "Mensalidade UniOzoxx"
    description: str = "Acesso mensal à plataforma de treinamento"
    
    # Valores
    amount: float = 49.90  # Valor mensal
    currency: str = "BRL"
    
    # PagBank
    pagbank_plan_id: Optional[str] = None  # ID do plano no PagBank
    pagbank_plan_code: Optional[str] = None  # Código do plano
    
    # Configurações
    billing_cycle: str = "monthly"  # Ciclo de cobrança
    is_active: bool = True
    is_default: bool = False  # Se este é o plano padrão para novas assinaturas
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class CreatePlanRequest(BaseModel):
    """Requisição para criar plano (Admin)"""
    name: str = "Mensalidade UniOzoxx"
    description: str = "Acesso mensal à plataforma de treinamento"
    amount: float = 49.90


# ==================== ASSINATURA DO USUÁRIO ====================

class UserSubscription(BaseModel):
    """Assinatura de um usuário"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Usuário
    user_id: str
    user_email: str
    user_name: str
    
    # Plano
    plan_id: str
    monthly_amount: float
    
    # PagBank
    pagbank_subscription_id: Optional[str] = None  # ID da assinatura no PagBank
    pagbank_subscription_code: Optional[str] = None  # Código da assinatura
    pagbank_customer_id: Optional[str] = None  # ID do customer no PagBank (CUST_XXXX) - para reutilizar
    
    # Status
    status: SubscriptionStatus = SubscriptionStatus.PENDING
    
    # Datas importantes
    started_at: Optional[str] = None  # Quando a assinatura foi ativada
    next_billing_date: Optional[str] = None  # Próxima data de cobrança
    last_payment_date: Optional[str] = None  # Última data de pagamento bem-sucedido
    suspended_at: Optional[str] = None  # Quando foi suspensa
    cancelled_at: Optional[str] = None  # Quando foi cancelada
    
    # Controle de inadimplência
    failed_payments_count: int = 0  # Quantos pagamentos falharam consecutivamente
    overdue_months: int = 0  # Quantos meses está atrasado
    
    # Método de pagamento
    payment_method: str = "credit_card"
    card_last_digits: Optional[str] = None  # Últimos 4 dígitos do cartão
    card_brand: Optional[str] = None  # Bandeira (Visa, Mastercard, etc)
    
    # Notificações enviadas
    payment_failed_email_sent: bool = False
    suspension_email_sent: bool = False
    
    # Metadados
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class CreateSubscriptionRequest(BaseModel):
    """Requisição para criar assinatura (Usuário)"""
    # Dados do cliente
    customer_name: str
    customer_email: EmailStr
    customer_cpf: str  # CPF sem formatação
    customer_phone: str
    
    # Endereço de cobrança
    billing_address: Dict[str, str]  # street, number, complement, district, city, state, zipcode
    
    # Dados do cartão
    encrypted_card: str  # Cartão criptografado pelo SDK do PagBank no frontend
    security_code: str   # CVV - vai separado no payment_method
    
    # ID do plano (opcional - se não informado, usa o plano ativo padrão)
    plan_id: Optional[str] = None


class UpdatePaymentMethodRequest(BaseModel):
    """Atualização do método de pagamento"""
    encrypted_card: str  # Cartão criptografado pelo SDK
    card_holder_name: str
    card_security_code: str  # CVV


# ==================== HISTÓRICO DE PAGAMENTOS ====================

class SubscriptionPayment(BaseModel):
    """Registro de um pagamento da assinatura"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Referências
    subscription_id: str
    user_id: str
    plan_id: str
    
    # PagBank
    pagbank_charge_id: Optional[str] = None  # ID da cobrança no PagBank
    pagbank_transaction_id: Optional[str] = None
    
    # Valores
    amount: float
    currency: str = "BRL"
    
    # Status
    status: PaymentStatus = PaymentStatus.PENDING
    status_detail: Optional[str] = None
    
    # Datas
    billing_date: str  # Data de cobrança programada
    paid_at: Optional[str] = None  # Data de pagamento efetivo
    failed_at: Optional[str] = None
    
    # Detalhes de falha
    failure_reason: Optional[str] = None
    failure_code: Optional[str] = None
    
    # Tentativas
    retry_count: int = 0
    last_retry_at: Optional[str] = None
    
    # Metadados
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


# ==================== WEBHOOKS ====================

class SubscriptionWebhookEvent(BaseModel):
    """Evento de webhook recebido do PagBank"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Tipo de evento
    event_type: str  # subscription.created, subscription.paid, subscription.failed, etc
    
    # IDs
    pagbank_subscription_id: Optional[str] = None
    pagbank_charge_id: Optional[str] = None
    subscription_id: Optional[str] = None  # ID interno do sistema
    
    # Status
    status: Optional[str] = None
    
    # Payload completo do webhook
    raw_payload: Dict[str, Any] = Field(default_factory=dict)
    
    # Processamento
    processed: bool = False
    processed_at: Optional[str] = None
    processing_error: Optional[str] = None
    
    # Timestamps
    received_at: str = Field(default_factory=lambda: datetime.now().isoformat())


# ==================== RESPONSES ====================

class SubscriptionResponse(BaseModel):
    """Resposta com dados da assinatura"""
    success: bool
    message: str
    subscription: Optional[Dict[str, Any]] = None
    pagbank_subscription_id: Optional[str] = None


class SubscriptionStatusResponse(BaseModel):
    """Resposta sobre o status da assinatura do usuário"""
    has_active_subscription: bool
    status: Optional[SubscriptionStatus] = None
    is_blocked: bool  # Se está bloqueado por inadimplência
    overdue_months: int = 0
    next_billing_date: Optional[str] = None
    monthly_amount: Optional[float] = None
    subscription: Optional[Dict[str, Any]] = None
