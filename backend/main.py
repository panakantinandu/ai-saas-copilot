import os
from db.database import engine, Base
from models import repository, commit, activity, integration, ai_recommendation  # import all models
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from api.actions import router as actions_router
from api.github_auth import router as github_router
from api.analytics import router as analytics_router
from api.recommendations import router as recommendation_router
from api.health import router as health_router
from api.security import router as security_router
from api.ai import router as ai_router
Base.metadata.create_all(bind=engine)
app = FastAPI(title="SaaS Ops Copilot", version="2.0")

app.add_middleware(SessionMiddleware, secret_key=os.environ.get("SESSION_SECRET", "change-me"))

app.add_middleware(
    CORSMiddleware,
        allow_origins=[
            os.environ.get("FRONTEND_URL", "http://localhost:5173"),
            "https://ai-saas-copilot.vercel.app",
            "https://*.vercel.app",   # covers all preview deployments
        ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(github_router,      prefix="/auth",          tags=["GitHub Auth"])
app.include_router(analytics_router,   prefix="/analytics",     tags=["Analytics"])
app.include_router(recommendation_router, prefix="/recommendations", tags=["Recommendations"])
app.include_router(health_router,      prefix="/health",        tags=["Health"])
app.include_router(security_router,    prefix="/security",      tags=["Security"])
app.include_router(ai_router,          prefix="/ai",            tags=["AI"])
app.include_router(actions_router, prefix="/actions", tags=["Actions"])
