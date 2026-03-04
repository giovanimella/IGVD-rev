"""
Serviço de envio de emails usando Resend
"""
import resend
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Configurar API key do Resend
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    from_email: Optional[str] = None
):
    """
    Envia um email usando Resend
    
    Args:
        to_email: Email do destinatário
        subject: Assunto do email
        html_content: Conteúdo HTML do email
        from_email: Email do remetente (opcional)
    """
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY não configurada. Email não enviado.")
        return {"success": False, "error": "API key não configurada"}
    
    try:
        # Email padrão do remetente
        if not from_email:
            from_email = os.environ.get('FROM_EMAIL', 'noreply@ozoxx.com.br')
        
        # Enviar email
        params = {
            "from": from_email,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        
        email_result = resend.Emails.send(params)
        
        logger.info(f"Email enviado para {to_email}: {email_result}")
        
        return {
            "success": True,
            "email_id": email_result.get("id")
        }
        
    except Exception as e:
        logger.error(f"Erro ao enviar email para {to_email}: {e}")
        return {
            "success": False,
            "error": str(e)
        }
