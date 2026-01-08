from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from models import Notification, NotificationCreate
from auth import get_current_user, require_role
import os
from datetime import datetime, timezone

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/my")
async def get_my_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user["sub"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    unread_count = sum(1 for n in notifications if not n.get("read", False))
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }

@router.put("/{notification_id}/read")
async def mark_as_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    notification = await db.notifications.find_one({"id": notification_id, "user_id": current_user["sub"]}, {"_id": 0})
    if not notification:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    
    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"read": True}}
    )
    
    return {"message": "Notificação marcada como lida"}

@router.put("/read-all")
async def mark_all_as_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["sub"], "read": False},
        {"$set": {"read": True}}
    )
    
    return {"message": "Todas as notificações marcadas como lidas"}

@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.notifications.delete_one({"id": notification_id, "user_id": current_user["sub"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    
    return {"message": "Notificação deletada"}

async def create_notification(user_id: str, title: str, message: str, notification_type: str, related_id: str = None):
    """Helper function to create notifications from other routes"""
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        related_id=related_id
    )
    
    await db.notifications.insert_one(notification.model_dump())
    return notification

async def notify_admins(title: str, message: str, notification_type: str, related_id: str = None):
    """Helper function to notify all admins"""
    admins = await db.users.find({"role": "admin"}, {"_id": 0, "id": 1}).to_list(100)
    
    for admin in admins:
        await create_notification(admin["id"], title, message, notification_type, related_id)
