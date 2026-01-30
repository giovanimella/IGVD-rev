"""
Modelos de pagamento para o sistema multi-gateway
Suporta PagSeguro e MercadoPago com PIX, Cartão de Crédito e Pagamento Dividido
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class PaymentGateway(str, Enum):
    PAGSEGURO = "pagseguro"
    MERCADOPAGO = "mercadopago"


class PaymentEnvironment(str, Enum):
    SANDBOX = "sandbox"
    PRODUCTION = "production"


class PaymentMethod(str, Enum):
    PIX = "pix"
    CREDIT_CARD = "credit_card"
    SPLIT = "split"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    APPROVED = "approved"
    AUTHORIZED = "authorized"
    PAID = "paid"
    DECLINED = "declined"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class PaymentPurpose(str, Enum):
    TRAINING_FEE = "training_fee"  # Taxa do treinamento presencial
    SALES_LINK = "sales_link"  # Link de pagamento das 10 vendas


# ==================== CONFIGURAÇÕES DO GATEWAY ====================

class GatewayCredentials(BaseModel):
    """Credenciais de um gateway de pagamento"""
    # PagSeguro
    pagseguro_email: Optional[str] = None
    pagseguro_token: Optional[str] = None
    pagseguro_app_id: Optional[str] = None
    pagseguro_app_key: Optional[str] = None
    
    # MercadoPago
    mercadopago_public_key: Optional[str] = None
    mercadopago_access_token: Optional[str] = None
    mercadopago_client_id: Optional[str] = None
    mercadopago_client_secret: Optional[str] = None


class PaymentSettings(BaseModel):
    """Configurações gerais de pagamento"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    active_gateway: PaymentGateway = PaymentGateway.MERCADOPAGO
    environment: PaymentEnvironment = PaymentEnvironment.SANDBOX
    
    # Credenciais Sandbox
    sandbox_credentials: GatewayCredentials = Field(default_factory=GatewayCredentials)
    
    # Credenciais Produção
    production_credentials: GatewayCredentials = Field(default_factory=GatewayCredentials)
    
    # Webhook secret para validação
    webhook_secret: Optional[str] = None
    
    # Configurações de métodos de pagamento
    pix_enabled: bool = True
    credit_card_enabled: bool = True
    split_payment_enabled: bool = True
    
    # Configurações de parcelamento
    max_installments: int = 12
    min_installment_value: float = 5.0  # Valor mínimo de cada parcela
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class PaymentSettingsUpdate(BaseModel):
    """Modelo para atualização das configurações"""
    active_gateway: Optional[PaymentGateway] = None
    environment: Optional[PaymentEnvironment] = None
    sandbox_credentials: Optional[GatewayCredentials] = None
    production_credentials: Optional[GatewayCredentials] = None
    webhook_secret: Optional[str] = None
    pix_enabled: Optional[bool] = None
    credit_card_enabled: Optional[bool] = None
    split_payment_enabled: Optional[bool] = None
    max_installments: Optional[int] = None
    min_installment_value: Optional[float] = None


# ==================== REQUISIÇÕES DE PAGAMENTO ====================

class PayerInfo(BaseModel):
    """Informações do pagador (opcional para Checkout Pro)"""
    name: str = ""
    email: str = ""
    document_type: str = "CPF"  # CPF ou CNPJ
    document_number: str = ""
    phone: Optional[str] = None


class CheckoutProRequest(BaseModel):
    """
    Requisição para criar um Checkout Pro do MercadoPago.
    O cliente será redirecionado para o ambiente seguro do MercadoPago.
    """
    amount: float = Field(..., gt=0)
    title: str  # Título do produto/serviço
    description: Optional[str] = None
    purpose: PaymentPurpose
    reference_id: Optional[str] = None  # ID de referência (ex: ID do treinamento)
    
    # Dados opcionais do pagador (MercadoPago coletará se não informado)
    payer_email: Optional[str] = None
    payer_name: Optional[str] = None
    
    # Configurações do checkout
    max_installments: int = 12
    pix_only: bool = False  # Se True, só permite PIX


class CheckoutProResponse(BaseModel):
    """Resposta da criação de um Checkout Pro"""
    success: bool
    message: str
    transaction_id: str
    preference_id: Optional[str] = None
    checkout_url: Optional[str] = None  # URL para redirecionar o usuário
    status: PaymentStatus


# Mantidos para compatibilidade com código legado (deprecated)
class CardInfo(BaseModel):
    """Informações do cartão (tokenizado) - DEPRECATED: Use Checkout Pro"""
    token: str
    payment_method_id: str
    installments: int = 1
    issuer_id: Optional[str] = None


class PixPaymentRequest(BaseModel):
    """Requisição de pagamento PIX - DEPRECATED: Use Checkout Pro"""
    amount: float = Field(..., gt=0)
    description: str
    payer: PayerInfo
    purpose: PaymentPurpose
    reference_id: Optional[str] = None


class CreditCardPaymentRequest(BaseModel):
    """Requisição de pagamento com cartão - DEPRECATED: Use Checkout Pro"""
    amount: float = Field(..., gt=0)
    description: str
    payer: PayerInfo
    card: CardInfo
    purpose: PaymentPurpose
    reference_id: Optional[str] = None


class SplitPaymentRequest(BaseModel):
    """Pagamento dividido - DEPRECATED: Use Checkout Pro"""
    total_amount: float = Field(..., gt=0)
    description: str
    payer: PayerInfo
    purpose: PaymentPurpose
    reference_id: Optional[str] = None
    pix_amount: float = Field(default=0, ge=0)
    card1_amount: float = Field(default=0, ge=0)
    card1: Optional[CardInfo] = None
    card2_amount: float = Field(default=0, ge=0)
    card2: Optional[CardInfo] = None


# ==================== TRANSAÇÕES ====================

class Transaction(BaseModel):
    """Registro de transação de pagamento"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Identificadores
    user_id: str
    gateway_transaction_id: Optional[str] = None
    reference_id: Optional[str] = None
    
    # Gateway e método
    gateway: PaymentGateway
    payment_method: PaymentMethod
    environment: PaymentEnvironment
    
    # Valores
    amount: float
    currency: str = "BRL"
    installments: int = 1
    
    # Para pagamentos divididos
    pix_amount: Optional[float] = None
    card_amount: Optional[float] = None
    pix_transaction_id: Optional[str] = None
    card_transaction_id: Optional[str] = None
    card2_amount: Optional[float] = None
    card2_transaction_id: Optional[str] = None
    
    # Status
    status: PaymentStatus = PaymentStatus.PENDING
    status_detail: Optional[str] = None
    
    # PIX específico
    pix_qr_code: Optional[str] = None
    pix_qr_code_base64: Optional[str] = None
    pix_copy_paste: Optional[str] = None
    pix_expiration: Optional[str] = None
    
    # Propósito
    purpose: PaymentPurpose
    description: Optional[str] = None
    
    # Pagador
    payer_email: Optional[str] = None
    payer_name: Optional[str] = None
    payer_document: Optional[str] = None
    
    # Metadados
    metadata: Dict[str, Any] = Field(default_factory=dict)
    webhook_notifications: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    paid_at: Optional[str] = None
    refunded_at: Optional[str] = None


class TransactionResponse(BaseModel):
    """Resposta de uma transação"""
    success: bool
    message: str
    transaction_id: str
    gateway_transaction_id: Optional[str] = None
    status: PaymentStatus
    
    # PIX específico
    pix_qr_code: Optional[str] = None
    pix_qr_code_base64: Optional[str] = None
    pix_copy_paste: Optional[str] = None
    pix_expiration: Optional[str] = None
    
    # Para split payments
    split_details: Optional[Dict[str, Any]] = None


# ==================== WEBHOOKS ====================

class WebhookEvent(BaseModel):
    """Evento de webhook recebido"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gateway: PaymentGateway
    event_type: str
    gateway_event_id: str
    transaction_id: Optional[str] = None
    gateway_transaction_id: Optional[str] = None
    status: Optional[str] = None
    raw_payload: Dict[str, Any] = Field(default_factory=dict)
    processed: bool = False
    received_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    processed_at: Optional[str] = None


# ==================== LINK DE PAGAMENTO ====================

class PaymentLink(BaseModel):
    """Link de pagamento para as 10 vendas"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Licenciado que criou o link
    
    # Configurações do link
    title: str
    description: str
    amount: float
    
    # Gateway
    gateway: PaymentGateway
    gateway_link_id: Optional[str] = None
    gateway_link_url: Optional[str] = None
    
    # Status
    is_active: bool = True
    uses_count: int = 0
    max_uses: Optional[int] = None
    
    # Validade
    expires_at: Optional[str] = None
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class CreatePaymentLinkRequest(BaseModel):
    """Requisição para criar link de pagamento"""
    title: str
    description: str
    amount: float = Field(..., gt=0)
    max_uses: Optional[int] = None
    expires_in_days: Optional[int] = None
