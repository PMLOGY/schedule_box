"""
Model loading and caching service.

Loads ML models at startup and provides accessors for prediction and
optimization endpoints. Models are loaded from serialized joblib/JSON files.
If model files are not found, the service starts in degraded mode with
heuristic-only predictions and fallback optimization responses.
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
    "upselling": None,
    "pricing": None,
    "capacity": None,
    "reminder_timing": None,
}
_models_loaded: bool = False


async def load_models() -> None:
    """
    Load all ML models from disk at startup.

    Prediction models are loaded from {MODEL_DIR}/*.joblib files.
    Optimization models are loaded from {MODEL_DIR}/*.joblib or *.json files.
    Health score calculator doesn't need a serialized model (pure RFM calculation).

    If model files are not found, the service starts in degraded mode.
    At minimum, health_score is always available.
    """
    global _models, _models_loaded

    model_dir = settings.MODEL_DIR

    # Import prediction model classes (lazy import to avoid circular deps)
    from ..models.no_show import NoShowPredictor
    from ..models.clv import CLVPredictor
    from ..models.health_score import HealthScoreCalculator

    # Import optimization model classes
    from ..models.upselling import UpsellRecommender
    from ..models.pricing import PricingOptimizer
    from ..models.capacity import CapacityForecaster
    from ..models.reminder_timing import ReminderTimingOptimizer

    # --- Prediction models ---

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

    # --- Optimization models ---

    # Load upselling model (similarity matrix)
    upselling_path = os.path.join(model_dir, "upselling_v1.0.0.joblib")
    try:
        if os.path.exists(upselling_path):
            upselling_data = joblib.load(upselling_path)
            _models["upselling"] = UpsellRecommender(
                similarity_matrix=upselling_data.get("similarity_matrix"),
                service_ids=upselling_data.get("service_ids"),
                popularity_fallback=upselling_data.get("popularity_fallback"),
            )
            logger.info(f"Upselling model loaded from {upselling_path}")
        else:
            _models["upselling"] = UpsellRecommender(similarity_matrix=None)
            logger.warning(
                f"Upselling model file not found at {upselling_path} - using popularity fallback"
            )
    except Exception as e:
        _models["upselling"] = UpsellRecommender(similarity_matrix=None)
        logger.warning(f"Failed to load upselling model: {e} - using popularity fallback")

    # Load pricing model (MAB state from JSON)
    pricing_path = os.path.join(model_dir, "pricing_state.json")
    try:
        if os.path.exists(pricing_path):
            _models["pricing"] = PricingOptimizer.load_state(pricing_path)
            logger.info(f"Pricing model loaded from {pricing_path}")
        else:
            _models["pricing"] = PricingOptimizer(state={})
            logger.warning(
                f"Pricing state file not found at {pricing_path} - using cold-start MAB"
            )
    except Exception as e:
        _models["pricing"] = PricingOptimizer(state={})
        logger.warning(f"Failed to load pricing model: {e} - using cold-start MAB")

    # Load capacity model (Prophet model from joblib)
    capacity_path = os.path.join(model_dir, "capacity_v1.0.0.joblib")
    try:
        if os.path.exists(capacity_path):
            raw_model = joblib.load(capacity_path)
            _models["capacity"] = CapacityForecaster(model=raw_model)
            logger.info(f"Capacity model loaded from {capacity_path}")
        else:
            _models["capacity"] = CapacityForecaster(model=None)
            logger.warning(
                f"Capacity model file not found at {capacity_path} - using empty forecast fallback"
            )
    except Exception as e:
        _models["capacity"] = CapacityForecaster(model=None)
        logger.warning(f"Failed to load capacity model: {e} - using empty forecast fallback")

    # Load reminder timing model (optimal timings from JSON)
    reminder_path = os.path.join(model_dir, "reminder_timing.json")
    try:
        if os.path.exists(reminder_path):
            _models["reminder_timing"] = ReminderTimingOptimizer.load(reminder_path)
            logger.info(f"Reminder timing model loaded from {reminder_path}")
        else:
            _models["reminder_timing"] = ReminderTimingOptimizer(optimal_timings={})
            logger.warning(
                f"Reminder timing file not found at {reminder_path} - using 24h default fallback"
            )
    except Exception as e:
        _models["reminder_timing"] = ReminderTimingOptimizer(optimal_timings={})
        logger.warning(
            f"Failed to load reminder timing model: {e} - using 24h default fallback"
        )

    # Service is ready if at least health_score is available
    _models_loaded = _models["health_score"] is not None
    logger.info(
        f"Model loading complete. Predictions: "
        f"no_show={'trained' if _models['no_show'] and _models['no_show'].model else 'heuristic'}, "
        f"clv={'trained' if _models['clv'] and _models['clv'].model else 'heuristic'}, "
        f"health_score=ready. "
        f"Optimization: "
        f"upselling={'trained' if _models['upselling'] and _models['upselling'].similarity_matrix is not None else 'fallback'}, "
        f"pricing={'loaded' if _models['pricing'] and _models['pricing'].state else 'cold-start'}, "
        f"capacity={'trained' if _models['capacity'] and _models['capacity'].model else 'fallback'}, "
        f"reminder_timing={'loaded' if _models['reminder_timing'] and _models['reminder_timing'].optimal_timings else 'fallback'}"
    )


async def cleanup_models() -> None:
    """Cleanup model resources on shutdown."""
    global _models, _models_loaded
    _models = {
        "no_show": None,
        "clv": None,
        "health_score": None,
        "upselling": None,
        "pricing": None,
        "capacity": None,
        "reminder_timing": None,
    }
    _models_loaded = False
    logger.info("Models cleaned up")


# --- Prediction model accessors ---


def get_no_show_model():
    """Returns NoShowPredictor instance or None."""
    return _models.get("no_show")


def get_clv_model():
    """Returns CLVPredictor instance or None."""
    return _models.get("clv")


def get_health_score_model():
    """Returns HealthScoreCalculator instance (always available)."""
    return _models.get("health_score")


# --- Optimization model accessors ---


def get_upselling_model():
    """Returns UpsellRecommender instance or None."""
    return _models.get("upselling")


def get_pricing_model():
    """Returns PricingOptimizer instance or None."""
    return _models.get("pricing")


def get_capacity_model():
    """Returns CapacityForecaster instance or None."""
    return _models.get("capacity")


def get_reminder_timing_model():
    """Returns ReminderTimingOptimizer instance or None."""
    return _models.get("reminder_timing")


def is_models_loaded() -> bool:
    """Returns True if at least health_score model is ready."""
    return _models_loaded
