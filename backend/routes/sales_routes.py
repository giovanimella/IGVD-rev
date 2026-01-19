"""
Sistema de Gerenciamento de Vendas em Campo
- Registro de vendas pelos licenciados
- Validação e pagamento pelo cliente
- Dashboard de relatórios para admin
- Sistema de comissões configuráveis
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user, require_role
import uuid
import os

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/sales", tags=["sales"])

# ==================== MODELOS ====================

class SaleCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: EmailStr
    customer_cpf: str
    device_serial: str
    device_source: str  # "leader_stock" ou "factory"
    sale_value: float
    sale_number: int  # 1-10

class SaleUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_cpf: Optional[str] = None
    device_serial: Optional[str] = None
    device_source: Optional[str] = None
    sale_value: Optional[float] = None

class CommissionTypeCreate(BaseModel):
    description: str
    percentage: float
    active: bool = True

class CommissionTypeUpdate(BaseModel):
    description: Optional[str] = None
    percentage: Optional[float] = None
    active: Optional[bool] = None

# ==================== ROTAS DE VENDAS (LICENCIADO) ====================

@router.get("/my-sales")
async def get_my_sales(current_user: dict = Depends(get_current_user)):
    """Obter todas as vendas do licenciado logado"""
    sales = await db.sales.find(
        {"licensee_id": current_user["sub"]},
        {"_id": 0}
    ).sort("sale_number", 1).to_list(10)
    
    # Contar vendas completadas (pagas)
    completed_count = sum(1 for s in sales if s.get("payment_status") == "paid")
    
    return {
        "sales": sales,
        "total_sales": len(sales),
        "completed_sales": completed_count,
        "remaining_sales": 10 - completed_count
    }

@router.post("/register")
async def register_sale(
    data: SaleCreate,
    current_user: dict = Depends(get_current_user)
):
    """Registrar uma nova venda"""
    # Verificar se usuário está na etapa correta
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if user.get("current_stage") != "vendas_campo":
        raise HTTPException(status_code=400, detail="Você não está na etapa de vendas em campo")
    
    # Verificar se já existe venda com esse número
    existing = await db.sales.find_one({
        "licensee_id": current_user["sub"],
        "sale_number": data.sale_number
    })
    
    if existing:
        raise HTTPException(status_code=400, detail=f"Já existe uma venda registrada com o número {data.sale_number}")
    
    # Verificar se número de venda é válido (1-10)
    if data.sale_number < 1 or data.sale_number > 10:
        raise HTTPException(status_code=400, detail="Número de venda deve ser entre 1 e 10")
    
    # Buscar dados do líder
    leader_id = user.get("leader_id")
    leader_name = user.get("leader_name")
    
    # Gerar link de pagamento placeholder (será substituído pelo gateway real)
    payment_link = f"PAYMENT_LINK_PLACEHOLDER_{uuid.uuid4().hex[:12].upper()}"
    
    # Criar venda
    sale = {
        "id": str(uuid.uuid4()),
        "licensee_id": current_user["sub"],
        "licensee_name": user.get("full_name"),
        "leader_id": leader_id,
        "leader_name": leader_name,
        "sale_number": data.sale_number,
        "customer_name": data.customer_name,
        "customer_phone": data.customer_phone,
        "customer_email": data.customer_email,
        "customer_cpf": data.customer_cpf,
        "device_serial": data.device_serial,
        "device_source": data.device_source,
        "sale_value": data.sale_value,
        "payment_status": "pending",  # pending, paid
        "payment_link": payment_link,
        "payment_transaction_id": None,
        "paid_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sales.insert_one(sale)
    sale.pop("_id", None)
    
    return {
        "message": "Venda registrada com sucesso",
        "sale": sale,
        "payment_link": payment_link
    }

@router.put("/{sale_id}")
async def update_sale(
    sale_id: str,
    data: SaleUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Atualizar dados de uma venda (apenas se ainda não foi paga)"""
    sale = await db.sales.find_one({
        "id": sale_id,
        "licensee_id": current_user["sub"]
    })
    
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    if sale.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Não é possível editar uma venda já paga")
    
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.sales.update_one(
        {"id": sale_id},
        {"$set": updates}
    )
    
    updated_sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    return updated_sale

@router.delete("/{sale_id}")
async def delete_sale(
    sale_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Excluir uma venda (apenas se ainda não foi paga)"""
    sale = await db.sales.find_one({
        "id": sale_id,
        "licensee_id": current_user["sub"]
    })
    
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    if sale.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Não é possível excluir uma venda já paga")
    
    await db.sales.delete_one({"id": sale_id})
    return {"message": "Venda excluída com sucesso"}

@router.post("/{sale_id}/simulate-payment")
async def simulate_sale_payment(
    sale_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Simular pagamento de uma venda (modo teste)"""
    sale = await db.sales.find_one({
        "id": sale_id,
        "licensee_id": current_user["sub"]
    })
    
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    if sale.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Venda já foi paga")
    
    transaction_id = f"SALE_{uuid.uuid4().hex[:12].upper()}"
    
    await db.sales.update_one(
        {"id": sale_id},
        {"$set": {
            "payment_status": "paid",
            "payment_transaction_id": transaction_id,
            "paid_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Verificar se completou as 10 vendas
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    paid_sales = await db.sales.count_documents({
        "licensee_id": current_user["sub"],
        "payment_status": "paid"
    })
    
    # Se completou 10 vendas, avançar para próxima etapa
    if paid_sales >= 10 and user.get("current_stage") == "vendas_campo":
        await db.users.update_one(
            {"id": current_user["sub"]},
            {"$set": {
                "current_stage": "documentos_pj",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "message": "Parabéns! Você completou as 10 vendas e avançou para a próxima etapa!",
            "transaction_id": transaction_id,
            "status": "paid",
            "advanced_to_next_stage": True
        }
    
    return {
        "message": "Pagamento simulado com sucesso",
        "transaction_id": transaction_id,
        "status": "paid",
        "completed_sales": paid_sales,
        "remaining_sales": 10 - paid_sales
    }

# ==================== TIPOS DE COMISSÃO (ADMIN) ====================

@router.get("/commission-types")
async def get_commission_types(current_user: dict = Depends(require_role(["admin"]))):
    """Listar tipos de comissão cadastrados"""
    types = await db.commission_types.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return types

@router.post("/commission-types")
async def create_commission_type(
    data: CommissionTypeCreate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Criar novo tipo de comissão"""
    commission_type = {
        "id": str(uuid.uuid4()),
        "description": data.description,
        "percentage": data.percentage,
        "active": data.active,
        "created_by": current_user["sub"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.commission_types.insert_one(commission_type)
    commission_type.pop("_id", None)
    
    return commission_type

@router.put("/commission-types/{type_id}")
async def update_commission_type(
    type_id: str,
    data: CommissionTypeUpdate,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Atualizar tipo de comissão"""
    existing = await db.commission_types.find_one({"id": type_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Tipo de comissão não encontrado")
    
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.commission_types.update_one(
        {"id": type_id},
        {"$set": updates}
    )
    
    updated = await db.commission_types.find_one({"id": type_id}, {"_id": 0})
    return updated

@router.delete("/commission-types/{type_id}")
async def delete_commission_type(
    type_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    """Excluir tipo de comissão"""
    result = await db.commission_types.delete_one({"id": type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tipo de comissão não encontrado")
    
    return {"message": "Tipo de comissão excluído com sucesso"}

# ==================== RELATÓRIOS E DASHBOARD (ADMIN) ====================

@router.get("/report/summary")
async def get_sales_summary(
    current_user: dict = Depends(require_role(["admin"]))
):
    """Obter resumo geral das vendas"""
    # Total de vendas
    total_sales = await db.sales.count_documents({})
    paid_sales = await db.sales.count_documents({"payment_status": "paid"})
    pending_sales = await db.sales.count_documents({"payment_status": "pending"})
    
    # Valor total
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$sale_value"}}}
    ]
    result = await db.sales.aggregate(pipeline).to_list(1)
    total_value = result[0]["total"] if result else 0
    
    # Vendas por origem do aparelho
    pipeline_source = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": "$device_source", "count": {"$sum": 1}, "value": {"$sum": "$sale_value"}}}
    ]
    by_source = await db.sales.aggregate(pipeline_source).to_list(10)
    
    # Buscar tipos de comissão ativos
    commission_types = await db.commission_types.find({"active": True}, {"_id": 0}).to_list(100)
    
    # Calcular comissões
    commissions = []
    for ct in commission_types:
        commission_value = total_value * (ct["percentage"] / 100)
        commissions.append({
            "id": ct["id"],
            "description": ct["description"],
            "percentage": ct["percentage"],
            "calculated_value": round(commission_value, 2)
        })
    
    return {
        "total_sales": total_sales,
        "paid_sales": paid_sales,
        "pending_sales": pending_sales,
        "total_value": round(total_value, 2),
        "by_device_source": {item["_id"]: {"count": item["count"], "value": round(item["value"], 2)} for item in by_source},
        "commissions": commissions
    }

@router.get("/report/all")
async def get_all_sales(
    status: Optional[str] = None,
    licensee_id: Optional[str] = None,
    current_user: dict = Depends(require_role(["admin", "supervisor"]))
):
    """Listar todas as vendas com filtros"""
    query = {}
    
    if status:
        query["payment_status"] = status
    
    if licensee_id:
        query["licensee_id"] = licensee_id
    
    # Se for supervisor, filtrar apenas seus licenciados
    if current_user["role"] == "supervisor":
        # Buscar IDs dos licenciados do supervisor
        licensees = await db.users.find(
            {"leader_id": current_user["sub"], "role": "licenciado"},
            {"id": 1}
        ).to_list(1000)
        licensee_ids = [l["id"] for l in licensees]
        query["licensee_id"] = {"$in": licensee_ids}
    
    sales = await db.sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Agrupar por licenciado para estatísticas
    licensee_stats = {}
    for sale in sales:
        lid = sale["licensee_id"]
        if lid not in licensee_stats:
            licensee_stats[lid] = {
                "licensee_id": lid,
                "licensee_name": sale.get("licensee_name"),
                "leader_name": sale.get("leader_name"),
                "total_sales": 0,
                "paid_sales": 0,
                "total_value": 0
            }
        licensee_stats[lid]["total_sales"] += 1
        if sale.get("payment_status") == "paid":
            licensee_stats[lid]["paid_sales"] += 1
            licensee_stats[lid]["total_value"] += sale.get("sale_value", 0)
    
    return {
        "sales": sales,
        "licensee_stats": list(licensee_stats.values())
    }

@router.get("/report/licensee/{licensee_id}")
async def get_licensee_sales(
    licensee_id: str,
    current_user: dict = Depends(require_role(["admin", "supervisor"]))
):
    """Obter vendas de um licenciado específico"""
    # Se for supervisor, verificar se é seu licenciado
    if current_user["role"] == "supervisor":
        licensee = await db.users.find_one({
            "id": licensee_id,
            "leader_id": current_user["sub"]
        })
        if not licensee:
            raise HTTPException(status_code=403, detail="Acesso negado")
    
    sales = await db.sales.find(
        {"licensee_id": licensee_id},
        {"_id": 0}
    ).sort("sale_number", 1).to_list(10)
    
    # Buscar dados do licenciado
    licensee = await db.users.find_one({"id": licensee_id}, {"_id": 0, "full_name": 1, "leader_name": 1})
    
    # Estatísticas
    paid_sales = [s for s in sales if s.get("payment_status") == "paid"]
    total_value = sum(s.get("sale_value", 0) for s in paid_sales)
    
    return {
        "licensee": licensee,
        "sales": sales,
        "total_sales": len(sales),
        "paid_sales": len(paid_sales),
        "pending_sales": len(sales) - len(paid_sales),
        "total_value": round(total_value, 2)
    }
