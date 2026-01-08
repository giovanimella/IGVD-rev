from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from routes import auth_routes, user_routes, module_routes, chapter_routes
from routes import progress_routes, reward_routes, file_routes, upload_routes, stats_routes
from routes import assessment_routes, onboarding_routes, payment_routes, notification_routes, chat_routes
from socket_handler import sio

app = FastAPI(title="Ozoxx LMS API")

# Integrar Socket.IO diretamente no FastAPI
sio_asgi_app = sio

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

if UPLOAD_DIR.exists():
    app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api")
app.include_router(user_routes.router, prefix="/api")
app.include_router(module_routes.router, prefix="/api")
app.include_router(chapter_routes.router, prefix="/api")
app.include_router(progress_routes.router, prefix="/api")
app.include_router(reward_routes.router, prefix="/api")
app.include_router(file_routes.router, prefix="/api")
app.include_router(upload_routes.router, prefix="/api")
app.include_router(stats_routes.router, prefix="/api")
app.include_router(assessment_routes.router, prefix="/api")
app.include_router(onboarding_routes.router, prefix="/api")
app.include_router(payment_routes.router, prefix="/api")
app.include_router(notification_routes.router, prefix="/api")
app.include_router(chat_routes.router, prefix="/api")

# Montar o Socket.IO em /socket.io
app.mount("/socket.io", socket_app)

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "Ozoxx LMS API"}

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
