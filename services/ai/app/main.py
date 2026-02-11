"""
ScheduleBox AI Service

FastAPI application entry point with startup model loading,
CORS middleware, and health/prediction routers.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import health, predictions
from .services.model_loader import load_models, cleanup_models
from .services import feature_store

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ScheduleBox AI Service",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router, tags=["health"])
app.include_router(predictions.router, prefix="/api/v1", tags=["predictions"])


@app.on_event("startup")
async def startup_event():
    """Load ML models on startup. Service starts in degraded mode if loading fails."""
    try:
        await load_models()
        logger.info("AI service started successfully with models loaded")
    except Exception as e:
        logger.warning(
            f"AI service started in degraded mode - model loading failed: {e}"
        )


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on shutdown."""
    try:
        await feature_store.close()
        await cleanup_models()
        logger.info("AI service shutdown complete")
    except Exception as e:
        logger.warning(f"Error during shutdown cleanup: {e}")
