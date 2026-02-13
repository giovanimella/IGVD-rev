from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware import Middleware
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import socketio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from routes import auth_routes, user_routes, module_routes, chapter_routes
from routes import progress_routes, reward_routes, file_routes, upload_routes, stats_routes
from routes import assessment_routes, onboarding_routes, payment_routes, notification_routes, chat_routes
from routes import banner_routes, post_routes, gamification_routes, system_routes, certificate_routes, presentation_routes, category_routes
from routes import analytics_routes, profile_routes, favorites_routes, webhook_routes, appointment_routes
from routes import level_routes, training_routes, sales_routes, ozoxx_cast_routes, translate_routes
from routes import live_class_routes, timeline_routes, terms_routes, whatsapp_routes, landing_routes

app = FastAPI(title="UniOzoxx LMS API")

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

if UPLOAD_DIR.exists():
    app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

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
app.include_router(banner_routes.router, prefix="/api")
app.include_router(post_routes.router, prefix="/api")
app.include_router(gamification_routes.router, prefix="/api")
app.include_router(system_routes.router, prefix="/api")
app.include_router(certificate_routes.router, prefix="/api")
app.include_router(analytics_routes.router, prefix="/api")
app.include_router(profile_routes.router, prefix="/api")
app.include_router(favorites_routes.router, prefix="/api")
app.include_router(webhook_routes.router, prefix="/api")
app.include_router(appointment_routes.router, prefix="/api")
app.include_router(level_routes.router, prefix="/api")
app.include_router(training_routes.router, prefix="/api")
app.include_router(sales_routes.router, prefix="/api")
app.include_router(ozoxx_cast_routes.router, prefix="/api")
app.include_router(translate_routes.router, prefix="/api")
app.include_router(live_class_routes.router, prefix="/api")
app.include_router(timeline_routes.router, prefix="/api")
app.include_router(terms_routes.router, prefix="/api")
app.include_router(whatsapp_routes.router, prefix="/api")
app.include_router(landing_routes.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "UniOzoxx LMS API"}

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Importar e configurar Socket.IO DEPOIS de definir todas as rotas
from socket_handler import sio
# Criar aplicação combinada FastAPI + Socket.IO
# Esta é a aplicação que o uvicorn vai usar
fastapi_app = app
app = socketio.ASGIApp(socketio_server=sio, other_asgi_app=fastapi_app, socketio_path='api/socket.io')
