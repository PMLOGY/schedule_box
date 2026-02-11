"""
Health check endpoints for the AI service.

Provides liveness and readiness probes for Docker/Kubernetes.
"""

from fastapi import APIRouter, Response

from ..services.model_loader import (
    is_models_loaded,
    get_no_show_model,
    get_clv_model,
    get_health_score_model,
)

router = APIRouter()


@router.get("/health")
async def health_check(response: Response):
    """
    Liveness probe. Returns model loading status.

    Returns 200 if models are loaded, 503 if not.
    """
    models_loaded = is_models_loaded()

    if not models_loaded:
        response.status_code = 503

    return {
        "status": "healthy" if models_loaded else "degraded",
        "models_loaded": models_loaded,
        "version": "1.0.0",
    }


@router.get("/ready")
async def readiness_check():
    """
    Readiness probe. Returns per-model loading status.

    Shows which individual models are available for predictions.
    """
    no_show_ready = get_no_show_model() is not None
    clv_ready = get_clv_model() is not None
    health_score_ready = get_health_score_model() is not None

    ready = health_score_ready  # Health score is always available (pure RFM)

    return {
        "ready": ready,
        "models": {
            "no_show": no_show_ready,
            "clv": clv_ready,
            "health_score": health_score_ready,
        },
    }
