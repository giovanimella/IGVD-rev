from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from models import Certificate
from auth import get_current_user, require_role
import os
from datetime import datetime
from pathlib import Path
import uuid
import shutil

# PDF manipulation - usando pypdf (mais recente) ao invés de PyPDF2
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import Color
from reportlab.lib.utils import ImageReader
from io import BytesIO
from pdf2image import convert_from_path
from PIL import Image

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/certificates", tags=["certificates"])

# Diretórios - usar variável de ambiente ou padrão
BASE_UPLOAD_DIR = os.environ.get('UPLOAD_DIR', '/app/uploads')
UPLOAD_DIR = Path(BASE_UPLOAD_DIR)
CERTIFICATES_DIR = UPLOAD_DIR / "certificates"
TEMPLATES_DIR = UPLOAD_DIR / "certificate_templates"
GENERATED_DIR = CERTIFICATES_DIR / "generated"

# Criar diretórios se não existirem
CERTIFICATES_DIR.mkdir(parents=True, exist_ok=True)
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_DIR.mkdir(parents=True, exist_ok=True)

# ==================== ADMIN: TEMPLATE ====================

@router.post("/template/upload")
async def upload_certificate_template(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["admin"]))
):
    """Upload do template de certificado (PDF A4 horizontal)"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são aceitos")
    
    # Salvar o template
    template_path = TEMPLATES_DIR / "certificate_template.pdf"
    
    with open(template_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Atualizar configuração do sistema
    await db.system_config.update_one(
        {"id": "system_config"},
        {"$set": {
            "certificate_template_path": str(template_path),
            "updated_at": datetime.now().isoformat()
        }},
        upsert=True
    )
    
    return {
        "message": "Template de certificado enviado com sucesso",
        "path": str(template_path)
    }

@router.get("/template/preview")
async def preview_certificate_template(current_user: dict = Depends(require_role(["admin"]))):
    """Visualizar o template atual"""
    config = await db.system_config.find_one({"id": "system_config"})
    template_path = config.get("certificate_template_path") if config else None
    
    if not template_path or not Path(template_path).exists():
        raise HTTPException(status_code=404, detail="Nenhum template configurado")
    
    return FileResponse(
        template_path,
        media_type="application/pdf",
        filename="certificate_template.pdf"
    )

@router.put("/template/config")
async def update_certificate_config(
    config: dict,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Atualizar configurações de posição do nome/módulo/data no certificado"""
    updates = {
        "updated_at": datetime.now().isoformat()
    }
    
    if "certificate_name_y_position" in config:
        updates["certificate_name_y_position"] = config["certificate_name_y_position"]
    if "certificate_module_y_position" in config:
        updates["certificate_module_y_position"] = config["certificate_module_y_position"]
    if "certificate_date_y_position" in config:
        updates["certificate_date_y_position"] = config["certificate_date_y_position"]
    
    await db.system_config.update_one(
        {"id": "system_config"},
        {"$set": updates},
        upsert=True
    )
    
    return {"message": "Configurações atualizadas com sucesso"}

@router.post("/template/test")
async def test_certificate_generation(
    current_user: dict = Depends(require_role(["admin"]))
):
    """Gerar certificado de teste para visualização"""
    config = await db.system_config.find_one({"id": "system_config"})
    template_path = config.get("certificate_template_path") if config else None
    
    if not template_path or not Path(template_path).exists():
        raise HTTPException(status_code=404, detail="Nenhum template configurado. Faça upload primeiro.")
    
    # Gerar certificado de teste
    test_path = generate_certificate_pdf(
        template_path=template_path,
        user_name="Nome do Licenciado Teste",
        module_name="Módulo de Exemplo",
        completion_date="12 de Janeiro de 2026",
        name_y=config.get("certificate_name_y_position", 400),
        module_y=config.get("certificate_module_y_position", 360),
        date_y=config.get("certificate_date_y_position", 320),
        output_filename="test_certificate.pdf"
    )
    
    return FileResponse(
        test_path,
        media_type="application/pdf",
        filename="certificado_teste.pdf"
    )

# ==================== GERAÇÃO DE CERTIFICADO ====================

def generate_certificate_pdf(
    template_path: str,
    user_name: str,
    module_name: str,
    completion_date: str,
    name_y: int = 350,
    module_y: int = 310,
    date_y: int = 270,
    output_filename: str = None
) -> str:
    """Gera o certificado convertendo template para imagem e adicionando texto por cima"""
    
    if not output_filename:
        output_filename = f"cert_{uuid.uuid4().hex[:8]}.pdf"
    
    output_path = GENERATED_DIR / output_filename
    
    print(f"[Certificate] Starting generation for {user_name}")
    print(f"[Certificate] Template: {template_path}")
    
    # Detectar o caminho do poppler automaticamente
    poppler_path = None
    possible_paths = ['/usr/bin', '/usr/local/bin', '/opt/homebrew/bin']
    for path in possible_paths:
        if os.path.exists(os.path.join(path, 'pdfinfo')):
            poppler_path = path
            print(f"[Certificate] Found poppler at: {poppler_path}")
            break
    
    # Converter o template PDF para imagem (alta resolução)
    try:
        images = convert_from_path(template_path, dpi=150, poppler_path=poppler_path)
    except Exception as e:
        print(f"[Certificate] Error converting PDF: {e}")
        # Tentar sem especificar o path
        images = convert_from_path(template_path, dpi=150)
    
    if not images:
        raise Exception("Não foi possível converter o template")
    
    template_img = images[0]
    img_width, img_height = template_img.size
    
    print(f"[Certificate] Image size: {img_width}x{img_height}")
    
    # Calcular fator de escala (DPI 150 = 150/72 = 2.083)
    scale_factor = 150 / 72  # Converter coordenadas PDF para pixels
    
    # Ajustar posições Y (inverter porque imagem tem Y invertido)
    pdf_height = img_height / scale_factor
    name_y_img = int((pdf_height - name_y) * scale_factor)
    module_y_img = int((pdf_height - module_y) * scale_factor)
    date_y_img = int((pdf_height - date_y) * scale_factor)
    
    print(f"[Certificate] PDF height: {pdf_height}, Y positions (img): name={name_y_img}, module={module_y_img}, date={date_y_img}")
    
    # Criar novo PDF com ReportLab
    packet = BytesIO()
    
    # Usar tamanho em pontos (72 DPI)
    page_width = img_width / scale_factor
    page_height = img_height / scale_factor
    
    can = canvas.Canvas(packet, pagesize=(page_width, page_height))
    
    # Converter imagem PIL para buffer
    img_buffer = BytesIO()
    template_img.save(img_buffer, format='PNG')
    img_buffer.seek(0)
    
    # Desenhar imagem de fundo (template)
    can.drawImage(ImageReader(img_buffer), 0, 0, width=page_width, height=page_height)
    
    # ===== NOME DO LICENCIADO =====
    can.setFillColorRGB(0, 0, 0)  # Preto
    can.setFont("Helvetica-Bold", 32)
    can.drawCentredString(page_width / 2, name_y, user_name)
    print(f"[Certificate] Drawing name '{user_name}' at y={name_y}")
    
    # ===== NOME DO MÓDULO =====
    can.setFont("Helvetica", 20)
    can.setFillColorRGB(0.2, 0.2, 0.2)
    can.drawCentredString(page_width / 2, module_y, module_name)
    print(f"[Certificate] Drawing module '{module_name}' at y={module_y}")
    
    # ===== DATA DE CONCLUSÃO =====
    can.setFont("Helvetica", 16)
    can.setFillColorRGB(0.3, 0.3, 0.3)
    date_text = f"Concluído em {completion_date}"
    can.drawCentredString(page_width / 2, date_y, date_text)
    print(f"[Certificate] Drawing date '{date_text}' at y={date_y}")
    
    can.save()
    
    # Salvar o PDF
    packet.seek(0)
    with open(output_path, "wb") as output_file:
        output_file.write(packet.getvalue())
    
    print(f"[Certificate] Saved to {output_path}")
    
    return str(output_path)

# ==================== LICENCIADO: CERTIFICADOS ====================

@router.get("/my")
async def get_my_certificates(current_user: dict = Depends(get_current_user)):
    """Lista certificados do usuário"""
    user_id = current_user["sub"]
    certificates = await db.certificates.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return certificates

@router.get("/check/{module_id}")
async def check_certificate_eligibility(module_id: str, current_user: dict = Depends(get_current_user)):
    """Verifica se o usuário pode receber certificado do módulo"""
    user_id = current_user["sub"]
    
    # Verificar se módulo existe e tem certificado
    module = await db.modules.find_one({"id": module_id}, {"_id": 0})
    if not module:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    
    if not module.get("has_certificate"):
        return {"eligible": False, "reason": "Este módulo não possui certificado"}
    
    # Verificar se já tem certificado
    existing = await db.certificates.find_one({
        "user_id": user_id,
        "module_id": module_id
    })
    if existing:
        return {
            "eligible": False, 
            "reason": "Certificado já emitido",
            "certificate_id": existing["id"]
        }
    
    # Verificar se tem avaliação e passou
    if module.get("has_assessment"):
        assessment = await db.assessments.find_one({"module_id": module_id})
        if assessment:
            result = await db.user_assessments.find_one({
                "user_id": user_id,
                "assessment_id": assessment["id"],
                "passed": True
            })
            if not result:
                return {"eligible": False, "reason": "Você precisa passar na avaliação primeiro"}
    
    # Verificar se completou todos os capítulos
    total_chapters = await db.chapters.count_documents({"module_id": module_id})
    completed_chapters = await db.user_progress.count_documents({
        "user_id": user_id,
        "module_id": module_id,
        "completed": True
    })
    
    if total_chapters > 0 and completed_chapters < total_chapters:
        return {
            "eligible": False,
            "reason": f"Complete todos os capítulos ({completed_chapters}/{total_chapters})"
        }
    
    return {"eligible": True, "reason": "Você pode gerar seu certificado!"}

@router.post("/generate/{module_id}")
async def generate_certificate(module_id: str, current_user: dict = Depends(get_current_user)):
    """Gera o certificado para o usuário"""
    user_id = current_user["sub"]
    
    # Verificar elegibilidade
    eligibility = await check_certificate_eligibility(module_id, current_user)
    if not eligibility.get("eligible"):
        raise HTTPException(status_code=400, detail=eligibility.get("reason"))
    
    # Buscar dados necessários
    user = await db.users.find_one({"id": user_id})
    module = await db.modules.find_one({"id": module_id})
    config = await db.system_config.find_one({"id": "system_config"})
    
    template_path = config.get("certificate_template_path") if config else None
    if not template_path or not Path(template_path).exists():
        raise HTTPException(status_code=400, detail="Template de certificado não configurado")
    
    # Gerar certificado
    completion_date = datetime.now()
    
    # Formatar data em português
    meses = {
        1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
        5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
        9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro"
    }
    date_formatted = f"{completion_date.day} de {meses[completion_date.month]} de {completion_date.year}"
    
    output_filename = f"cert_{user_id[:8]}_{module_id[:8]}_{uuid.uuid4().hex[:6]}.pdf"
    
    certificate_path = generate_certificate_pdf(
        template_path=template_path,
        user_name=user["full_name"],
        module_name=module["title"],
        completion_date=date_formatted,
        name_y=config.get("certificate_name_y_position", 400),
        module_y=config.get("certificate_module_y_position", 360),
        date_y=config.get("certificate_date_y_position", 320),
        output_filename=output_filename
    )
    
    # Salvar no banco
    certificate = Certificate(
        user_id=user_id,
        module_id=module_id,
        user_name=user["full_name"],
        module_title=module["title"],
        completion_date=completion_date.isoformat(),
        certificate_path=certificate_path
    )
    
    await db.certificates.insert_one(certificate.model_dump())
    
    # Verificar badges
    from routes.gamification_routes import check_and_award_badges
    await check_and_award_badges(user_id)
    
    return {
        "message": "Certificado gerado com sucesso!",
        "certificate": certificate.model_dump()
    }

@router.get("/download/{certificate_id}")
async def download_certificate(certificate_id: str, current_user: dict = Depends(get_current_user)):
    """Baixar certificado"""
    user_id = current_user["sub"]
    
    # Buscar certificado (permitir admin baixar qualquer um)
    query = {"id": certificate_id}
    if current_user.get("role") != "admin":
        query["user_id"] = user_id
    
    certificate = await db.certificates.find_one(query)
    if not certificate:
        raise HTTPException(status_code=404, detail="Certificado não encontrado")
    
    cert_path = certificate["certificate_path"]
    if not Path(cert_path).exists():
        raise HTTPException(status_code=404, detail="Arquivo do certificado não encontrado")
    
    return FileResponse(
        cert_path,
        media_type="application/pdf",
        filename=f"certificado_{certificate['module_title'].replace(' ', '_')}.pdf"
    )

# ==================== ADMIN: LISTAR TODOS ====================

@router.get("/all")
async def get_all_certificates(current_user: dict = Depends(require_role(["admin"]))):
    """Lista todos os certificados emitidos (admin)"""
    certificates = await db.certificates.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return certificates

@router.get("/stats")
async def get_certificate_stats(current_user: dict = Depends(require_role(["admin"]))):
    """Estatísticas de certificados (admin)"""
    total = await db.certificates.count_documents({})
    
    # Por módulo
    pipeline = [
        {"$group": {"_id": "$module_title", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_module = await db.certificates.aggregate(pipeline).to_list(100)
    
    return {
        "total_certificates": total,
        "by_module": [{"module": item["_id"], "count": item["count"]} for item in by_module]
    }
