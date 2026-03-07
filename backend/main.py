from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from database import engine, Base
import models  # noqa: F401 — ensures models are registered

from routers import (
    auth_router,
    destinations_router,
    explore_router,
    comments_router,
    likes_router,
    profile_router,
)

load_dotenv()

# ─── Create tables ────────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Travel Bucket List API",
    description="Backend for the Travel Bucket List web application",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://*.vercel.app",
        "*",  # Remove this in production and list exact origins
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(destinations_router.router)
app.include_router(explore_router.router)
app.include_router(comments_router.router)
app.include_router(likes_router.router)
app.include_router(profile_router.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "🌍 Travel Bucket List API is running",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
