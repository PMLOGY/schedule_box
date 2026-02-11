"""
Optimization Model Dummy Generator

Creates placeholder optimization model files for development testing.
Generates minimal model artifacts that the model_loader can load at startup,
allowing the AI service to run in non-degraded mode during development.

Does NOT generate a Prophet capacity model (too heavyweight for dummy generation).
The model_loader handles None gracefully for the capacity model.

Usage:
    python -m scripts.generate_optimization_models
    python scripts/generate_optimization_models.py
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone

import joblib
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def generate_optimization_models(output_dir: str = "models") -> None:
    """
    Generate placeholder optimization model files for development testing.

    Creates:
    - upselling_v1.0.0.joblib: Small 10x10 similarity matrix
    - pricing_state.json: Dummy MAB state with 5 context keys
    - reminder_timing.json: Dummy optimal timings for 5 clusters + 2 defaults
    - Skips capacity model (Prophet too heavyweight for dummy generation)

    Updates metadata.json with all 7 model entries (3 prediction + 4 optimization).

    Args:
        output_dir: Directory to save placeholder model files.
    """
    os.makedirs(output_dir, exist_ok=True)
    rng = np.random.RandomState(42)
    now = datetime.now(timezone.utc).isoformat()

    # --- Upselling: Small 10x10 similarity matrix ---
    logger.info("Generating dummy upselling model (10x10 similarity matrix)")

    n_dummy_services = 10
    service_ids = list(range(1, n_dummy_services + 1))

    # Create random customer-service interaction matrix
    interaction_matrix = rng.rand(20, n_dummy_services)  # 20 fake customers
    interaction_matrix[interaction_matrix < 0.5] = 0  # Sparsify

    # Compute cosine similarity
    similarity_matrix = cosine_similarity(interaction_matrix.T)

    # Popularity fallback (first 5 services by "popularity")
    popularity_fallback = [1, 2, 3, 4, 5]

    upselling_data = {
        "similarity_matrix": similarity_matrix,
        "service_ids": service_ids,
        "popularity_fallback": popularity_fallback,
    }

    upselling_path = os.path.join(output_dir, "upselling_v1.0.0.joblib")
    joblib.dump(upselling_data, upselling_path)
    logger.info(f"Dummy upselling model saved to {upselling_path}")

    # --- Pricing: Dummy MAB state with 5 context keys ---
    logger.info("Generating dummy pricing state (5 contexts, flat priors)")

    pricing_state = {}
    for service_id in [1, 2, 3]:
        for day in [1, 5]:  # Weekday, weekend
            for util in ["low", "mid"]:
                context_key = f"{service_id}:{day}:2:{util}"
                pricing_state[context_key] = {
                    "alpha": [2.0, 2.0, 2.0, 2.0, 2.0],
                    "beta": [2.0, 2.0, 2.0, 2.0, 2.0],
                }

    # Keep only 5 contexts for dummy
    pricing_state = dict(list(pricing_state.items())[:5])

    pricing_path = os.path.join(output_dir, "pricing_state.json")
    with open(pricing_path, "w") as f:
        json.dump(pricing_state, f, indent=2)
    logger.info(f"Dummy pricing state saved to {pricing_path}")

    # --- Capacity: Skip (Prophet too heavyweight) ---
    logger.info(
        "Skipping dummy capacity model (Prophet too heavyweight). "
        "Model loader will handle None gracefully."
    )

    # --- Reminder Timing: Dummy optimal timings ---
    logger.info("Generating dummy reminder timing (5 clusters + 2 channel defaults)")

    reminder_timings = {}

    # 5 customer cluster timings
    for customer_id in [1, 2, 3, 4, 5]:
        for channel in ["email", "sms"]:
            cluster_key = f"{customer_id}:{channel}"
            if channel == "sms":
                minutes = 120  # SMS: 2 hours before
                open_rate = 0.75
            else:
                minutes = 240  # Email: 4 hours before
                open_rate = 0.45

            reminder_timings[cluster_key] = {
                "minutes": minutes,
                "open_rate": open_rate,
                "confidence": 0.5,
            }

    # Channel-level defaults
    reminder_timings["default:email"] = {
        "minutes": 240,
        "open_rate": 0.40,
        "confidence": 0.3,
    }
    reminder_timings["default:sms"] = {
        "minutes": 120,
        "open_rate": 0.70,
        "confidence": 0.3,
    }

    reminder_path = os.path.join(output_dir, "reminder_timing.json")
    with open(reminder_path, "w") as f:
        json.dump(reminder_timings, f, indent=2)
    logger.info(f"Dummy reminder timing saved to {reminder_path}")

    # --- Update metadata.json with all 7 model entries ---
    logger.info("Updating metadata.json with all 7 model entries")

    metadata_path = os.path.join(output_dir, "metadata.json")
    try:
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        metadata = {"models": {}, "version_format": "v{major}.{minor}.{patch}"}

    # Preserve existing prediction models, update optimization models
    # 3 prediction models (keep existing or set placeholder)
    if "no_show_predictor" not in metadata.get("models", {}):
        metadata.setdefault("models", {})["no_show_predictor"] = {
            "model_name": "no_show_predictor",
            "model_version": "v1.0.0",
            "trained_at": None,
            "features": [
                "booking_lead_time_hours",
                "customer_no_show_rate",
                "customer_total_bookings",
                "day_of_week",
                "hour_of_day",
                "is_weekend",
                "service_duration_minutes",
                "service_price",
                "is_first_visit",
                "has_payment",
                "days_since_last_visit",
            ],
            "metrics": None,
            "status": "placeholder",
        }

    if "clv_predictor" not in metadata.get("models", {}):
        metadata.setdefault("models", {})["clv_predictor"] = {
            "model_name": "clv_predictor",
            "model_version": "v1.0.0",
            "trained_at": None,
            "features": [
                "total_bookings",
                "total_spent",
                "avg_booking_value",
                "days_since_first_visit",
                "days_since_last_visit",
                "booking_frequency",
                "no_show_rate",
                "service_diversity",
            ],
            "metrics": None,
            "status": "placeholder",
        }

    if "health_score" not in metadata.get("models", {}):
        metadata.setdefault("models", {})["health_score"] = {
            "model_name": "health_score",
            "model_version": "v1.0.0",
            "type": "rfm_calculator",
            "weights": {
                "recency": 0.4,
                "frequency": 0.35,
                "monetary": 0.25,
            },
            "categories": {
                "excellent": ">=80",
                "good": ">=60",
                "at_risk": ">=40",
                "churning": "<40",
            },
            "status": "active",
        }

    # 4 optimization models (set to placeholder status)
    metadata["models"]["upselling_recommender"] = {
        "model_name": "upselling_recommender",
        "model_version": "v1.0.0",
        "trained_at": now,
        "algorithm": "item-based collaborative filtering (cosine similarity)",
        "min_data": "100 customers, 10 services",
        "retraining": "weekly",
        "status": "placeholder",
    }

    metadata["models"]["pricing_optimizer"] = {
        "model_name": "pricing_optimizer",
        "model_version": "v1.0.0",
        "trained_at": now,
        "algorithm": "Thompson Sampling (Multi-Armed Bandit)",
        "constraints": "30% daily price change limit",
        "retraining": "continuous (reward updates)",
        "status": "placeholder",
    }

    metadata["models"]["capacity_forecaster"] = {
        "model_name": "capacity_forecaster",
        "model_version": "v1.0.0",
        "trained_at": None,
        "algorithm": "Prophet (time series forecasting)",
        "min_data": "12 weeks booking history",
        "retraining": "weekly",
        "status": "placeholder",
    }

    metadata["models"]["reminder_timing"] = {
        "model_name": "reminder_timing",
        "model_version": "v1.0.0",
        "trained_at": now,
        "algorithm": "Bayesian Optimization (Gaussian Process)",
        "min_data": "50 completed bookings with notification tracking",
        "retraining": "weekly",
        "fallback": "1440 minutes (24 hours)",
        "status": "placeholder",
    }

    metadata["last_updated"] = now

    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Metadata updated at {metadata_path}")

    # Print confirmation
    logger.info("Optimization model generation complete:")
    logger.info(f"  - {upselling_path} (10x10 similarity matrix)")
    logger.info(f"  - {pricing_path} ({len(pricing_state)} MAB contexts)")
    logger.info(f"  - Capacity model: SKIPPED (Prophet too heavyweight)")
    logger.info(f"  - {reminder_path} ({len(reminder_timings)} timing entries)")
    logger.info(
        f"  - {metadata_path} "
        f"({len(metadata['models'])} total model entries)"
    )


if __name__ == "__main__":
    output = sys.argv[1] if len(sys.argv) > 1 else "models"
    generate_optimization_models(output_dir=output)
