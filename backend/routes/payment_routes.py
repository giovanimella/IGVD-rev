from fastapi import APIRouter, HTTPException, Depends, Request
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user
import os
import httpx
import hmac
import hashlib
from datetime import datetime, timezone

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/payments", tags=["payments"])

PAGSEGURO_API_URL = "https://sandbox.api.pagseguro.com"
PAGSEGURO_TOKEN = os.environ.get('PAGSEGURO_TOKEN', '')
FRANCHISE_FEE = 500.00

@router.post("/create-payment")
async def create_payment(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if user.get("current_stage") != "pagamento":
        raise HTTPException(status_code=400, detail="Você ainda não está na etapa de pagamento")
    
    if user.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Pagamento já realizado")
    
    reference_id = f"FRANCHISE_{user['id']}_{int(datetime.now(timezone.utc).timestamp())}"
    
    payment_data = {
        "reference_id": reference_id,
        "customer": {
            "name": user["full_name"],
            "email": user["email"],
            "tax_id": "12345678909",
            "phones": [
                {
                    "country": "55",
                    "area": user.get("phone", "11999999999")[:2],
                    "number": user.get("phone", "11999999999")[2:],
                    "type": "MOBILE"
                }
            ]
        },
        "items": [
            {
                "reference_id": "FRANCHISE_FEE",
                "name": "Taxa de Franquia Ozoxx",
                "quantity": 1,
                "unit_amount": int(FRANCHISE_FEE * 100)
            }
        ],
        "qr_codes": [
            {
                "amount": {
                    "value": int(FRANCHISE_FEE * 100)
                }
            }
        ],
        "notification_urls": [
            f"{os.environ.get('BACKEND_URL', 'http://localhost:8000')}/api/payments/webhook"
        ]
    }
    
    transaction_record = {
        "id": reference_id,
        "user_id": user["id"],
        "amount": FRANCHISE_FEE,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "payment_method": None,
        "transaction_code": None
    }
    
    await db.transactions.insert_one(transaction_record)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"payment_transaction_id": reference_id}}
    )
    
    return {
        "reference_id": reference_id,
        "amount": FRANCHISE_FEE,
        "status": "pending",
        "payment_url": f"https://sandbox.pagseguro.uol.com.br/checkout/payment/direct/{reference_id}",
        "message": "Em produção, aqui seria retornado o link real de pagamento do PagSeguro"
    }

@router.post("/webhook")
async def pagseguro_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature")
    
    webhook_secret = os.environ.get('PAGSEGURO_WEBHOOK_SECRET', '')
    
    if webhook_secret:
        expected_signature = hmac.new(
            webhook_secret.encode(),
            body,
            hashlib.sha256
        ).hexdigest()
        
        if signature and signature.split("=")[1] != expected_signature:
            raise HTTPException(status_code=401, detail="Assinatura inválida")
    
    data = await request.json()
    
    reference_id = data.get("reference_id")
    status = data.get("status", "").lower()
    
    if not reference_id:
        return {"message": "No reference_id"}
    
    transaction = await db.transactions.find_one({"id": reference_id}, {"_id": 0})
    if not transaction:
        return {"message": "Transaction not found"}
    
    status_mapping = {
        "paid": "paid",
        "authorized": "paid",
        "available": "paid",
        "pending": "pending",
        "cancelled": "cancelled",
        "declined": "declined"
    }
    
    new_status = status_mapping.get(status, "pending")
    
    await db.transactions.update_one(
        {"id": reference_id},
        {"$set": {
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "webhook_data": data
        }}
    )
    
    if new_status == "paid":
        user = await db.users.find_one({"id": transaction["user_id"]}, {"_id": 0})
        if user and user.get("current_stage") == "pagamento":
            await db.users.update_one(
                {"id": transaction["user_id"]},
                {"$set": {
                    "payment_status": "paid",
                    "current_stage": "acolhimento"
                }}
            )
    
    return {"message": "Webhook processed"}

@router.post("/simulate-payment/{transaction_id}")
async def simulate_payment(transaction_id: str, current_user: dict = Depends(get_current_user)):
    if os.environ.get('PAGSEGURO_ENVIRONMENT') != 'sandbox':
        raise HTTPException(status_code=403, detail="Simulação disponível apenas em sandbox")
    
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    if transaction["user_id"] != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {
            "status": "paid",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await db.users.update_one(
        {"id": current_user["sub"]},
        {"$set": {
            "payment_status": "paid",
            "current_stage": "acolhimento"
        }}
    )
    
    return {"message": "Pagamento simulado com sucesso", "status": "paid"}

@router.get("/status/{transaction_id}")
async def get_payment_status(transaction_id: str, current_user: dict = Depends(get_current_user)):
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    if transaction["user_id"] != current_user["sub"] and current_user.get("role") not in ["admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    return transaction
