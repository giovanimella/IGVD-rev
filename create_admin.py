#!/usr/bin/env python3
"""
Create admin user script
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

async def create_admin():
    from motor.motor_asyncio import AsyncIOMotorClient
    from auth import get_password_hash
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017').strip('"')
    db_name = os.environ.get('DB_NAME', 'uniozoxx_prod').strip('"')
    
    print(f"Connecting to MongoDB: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if admin already exists
    existing_admin = await db.users.find_one({"email": "admin@ozoxx.com"})
    if existing_admin:
        print("Admin user already exists!")
        return
    
    # Create admin user
    admin_user = {
        "id": str(uuid.uuid4()),
        "email": "admin@ozoxx.com",
        "full_name": "Admin User",
        "role": "admin",
        "phone": None,
        "supervisor_id": None,
        "password_hash": get_password_hash("admin123"),
        "points": 0,
        "level_title": "Admin",
        "current_stage": "completo",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_user)
    print(f"✅ Admin user created successfully!")
    print(f"   Email: admin@ozoxx.com")
    print(f"   Password: admin123")
    
    client.close()

if __name__ == "__main__":
    # Load environment variables
    env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
    
    asyncio.run(create_admin())