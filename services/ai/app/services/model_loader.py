"""
Model loading and caching service.

Loads ML models at startup and provides accessors for prediction endpoints.
Models are loaded from serialized joblib files. If model files are not found,
the service starts in degraded mode with heuristic-only predictions.
"""

import logging
import os

import joblib

from ..config import settings

logger = logging.getLogger(__name__)

# Module-level model registry
_models: dict = {
    "no_show": None,
    "clv": None,
    "health_score": None,
}
_models_loaded: bool = False


async def load_models() -> None:
    """
    Load all ML models from disk at startup.

    Models are loaded from {MODEL_DIR}/no_show_v1.0.0.joblib and
    {MODEL_DIR}/clv_v1.0.0.joblib. Health score calculator doesn't need
    a serialized model (pure RFM calculation).

    If model files are not found, the service starts in degraded mode.
    At minimum, health_score is always available.
    """
    global _models, _models_loaded

    model_dir = settings.MODEL_DIR

    # Import model classes (lazy import to avoid circular deps)
    from ..models.no_show import NoShowPredictor
    from ..models.clv import CLVPredictor
    from ..models.health_score import HealthScoreCalculator

    # Load no-show model
    no_show_path = os.path.join(model_dir, "no_show_v1.0.0.joblib")
    try:
        if os.path.exists(no_show_path):
            raw_model = joblib.load(no_show_path)
            _models["no_show"] = NoShowPredictor(model=raw_model)
            logger.info(f"No-show model loaded from {no_show_path}")
        else:
            _models["no_show"] = NoShowPredictor(model=None)
            logger.warning(
                f"No-show model file not found at {no_show_path} - using heuristic fallback"
            )
    except Exception as e:
        _models["no_show"] = NoShowPredictor(model=None)
        logger.warning(f"Failed to load no-show model: {e} - using heuristic fallback")

    # Load CLV model
    clv_path = os.path.join(model_dir, "clv_v1.0.0.joblib")
    try:
        if os.path.exists(clv_path):
            raw_model = joblib.load(clv_path)
            _models["clv"] = CLVPredictor(model=raw_model)
            logger.info(f"CLV model loaded from {clv_path}")
        else:
            _models["clv"] = CLVPredictor(model=None)
            logger.warning(
                f"CLV model file not found at {clv_path} - using heuristic fallback"
            )
    except Exception as e:
        _models["clv"] = CLVPredictor(model=None)
        logger.warning(f"Failed to load CLV model: {e} - using heuristic fallback")

    # Health score calculator - always available (no serialized model needed)
    _models["health_score"] = HealthScoreCalculator()
    logger.info("Health score calculator initialized (RFM-based, no model file needed)")

    # Service is ready if at least health_score is available
    _models_loaded = _models["health_score"] is not None
    logger.info(
        f"Model loading complete. Models loaded: "
        f"no_show={'trained' if _models['no_show'] and _models['no_show'].model else 'heuristic'}, "
        f"clv={'trained' if _models['clv'] and _models['clv'].model else 'heuristic'}, "
        f"health_score=ready"
    )


async def cleanup_models() -> None:
    """Cleanup model resources on shutdown."""
    global _models, _models_loaded
    _models = {"no_show": None, "clv": None, "health_score": None}
    _models_loaded = False
    logger.info("Models cleaned up")


def get_no_show_model():
    """Returns NoShowPredictor instance or None."""
    return _models.get("no_show")


def get_clv_model():
    """Returns CLVPredictor instance or None."""
    return _models.get("clv")


def get_health_score_model():
    """Returns HealthScoreCalculator instance (always available)."""
    return _models.get("health_score")


def is_models_loaded() -> bool:
    """Returns True if at least health_score model is ready."""
    return _models_loaded
