import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.generate import router as generate_router
from routers.gallery import router as gallery_router
from routers.user import router as user_router
from routers.browse import router as browse_router
from routers.subscriptions import router as subscriptions_router
from routers.submissions import router as submissions_router
from routers.admin import router as admin_router
from routers.skins import router as skins_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Minecraft Mod Creator", version="0.3.0")

# CORS: production URL from env, localhost only in dev
cors_origins = []
if os.environ.get("ENVIRONMENT") != "production":
    cors_origins.extend([
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ])
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url:
    cors_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate_router)
app.include_router(gallery_router)
app.include_router(user_router)
app.include_router(browse_router)
app.include_router(subscriptions_router)
app.include_router(submissions_router)
app.include_router(admin_router)
app.include_router(skins_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
