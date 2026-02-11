"""
Dummy Model Generator

Creates placeholder .joblib model files for development testing.
These models are trained on minimal synthetic data and produce
reasonable (but not accurate) predictions for end-to-end testing.

Usage:
    python -m scripts.generate_dummy_models
    python scripts/generate_dummy_models.py
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBClassifier

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Feature columns matching model class definitions
NO_SHOW_FEATURES = [
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
]

CLV_FEATURES = [
    "total_bookings",
    "total_spent",
    "avg_booking_value",
    "days_since_first_visit",
    "days_since_last_visit",
    "booking_frequency",
    "no_show_rate",
    "service_diversity",
]


def generate_dummy_models(output_dir: str = "models") -> None:
    """
    Generate placeholder ML model files for development testing.

    Creates minimal XGBoost classifier (no-show) and Random Forest regressor (CLV)
    trained on 100 synthetic samples each. These produce reasonable predictions
    for testing the full prediction pipeline.

    Args:
        output_dir: Directory to save model files and metadata.
    """
    os.makedirs(output_dir, exist_ok=True)
    rng = np.random.RandomState(42)

    # --- Generate dummy no-show model ---
    logger.info("Generating dummy no-show model (XGBoost classifier)")

    n_samples = 100
    n_no_show_features = len(NO_SHOW_FEATURES)

    X_no_show = rng.rand(n_samples, n_no_show_features)
    # Scale features to realistic ranges
    X_no_show[:, 0] *= 168  # booking_lead_time_hours (0-168)
    X_no_show[:, 1] *= 0.5  # customer_no_show_rate (0-0.5)
    X_no_show[:, 2] = (X_no_show[:, 2] * 20).astype(int)  # customer_total_bookings
    X_no_show[:, 3] = (X_no_show[:, 3] * 7).astype(int)  # day_of_week
    X_no_show[:, 4] = (X_no_show[:, 4] * 16 + 6).astype(int)  # hour_of_day (6-22)
    X_no_show[:, 5] = (X_no_show[:, 5] > 0.7).astype(int)  # is_weekend
    X_no_show[:, 6] = rng.choice(
        [30, 45, 60, 90, 120], size=n_samples
    )  # service_duration_minutes
    X_no_show[:, 7] = X_no_show[:, 7] * 2700 + 300  # service_price (300-3000)
    X_no_show[:, 8] = (X_no_show[:, 8] > 0.7).astype(int)  # is_first_visit
    X_no_show[:, 9] = (X_no_show[:, 9] > 0.4).astype(int)  # has_payment
    X_no_show[:, 10] *= 365  # days_since_last_visit

    # Simple target based on no_show_rate and payment
    y_no_show = (
        (X_no_show[:, 1] > 0.2) | ((X_no_show[:, 9] == 0) & (rng.rand(n_samples) > 0.6))
    ).astype(int)

    no_show_model = XGBClassifier(
        objective="binary:logistic",
        max_depth=3,
        n_estimators=50,
        learning_rate=0.1,
        random_state=42,
        use_label_encoder=False,
        eval_metric="logloss",
    )
    no_show_model.fit(X_no_show, y_no_show)

    no_show_path = os.path.join(output_dir, "no_show_v1.0.0.joblib")
    joblib.dump(no_show_model, no_show_path)
    logger.info(f"Dummy no-show model saved to {no_show_path}")

    # --- Generate dummy CLV model ---
    logger.info("Generating dummy CLV model (Random Forest regressor)")

    n_clv_features = len(CLV_FEATURES)

    X_clv = rng.rand(n_samples, n_clv_features)
    # Scale features to realistic ranges
    X_clv[:, 0] = (X_clv[:, 0] * 20).astype(int) + 1  # total_bookings (1-20)
    X_clv[:, 1] = X_clv[:, 1] * 50000 + 500  # total_spent (500-50500)
    X_clv[:, 2] = X_clv[:, 1] / X_clv[:, 0]  # avg_booking_value
    X_clv[:, 3] = (X_clv[:, 3] * 700 + 30).astype(int)  # days_since_first_visit
    X_clv[:, 4] = X_clv[:, 4] * 90  # days_since_last_visit
    X_clv[:, 5] = X_clv[:, 0] / X_clv[:, 3] * 30  # booking_frequency (per month)
    X_clv[:, 6] = X_clv[:, 6] * 0.3  # no_show_rate (0-0.3)
    X_clv[:, 7] = (X_clv[:, 7] * 5).astype(int) + 1  # service_diversity (1-5)

    # Simple target: CLV proportional to spending and frequency
    y_clv = (
        X_clv[:, 1] * (1 + np.log(X_clv[:, 5] + 1)) * (1 - X_clv[:, 6])
        + rng.normal(0, 500, size=n_samples)
    )
    y_clv = np.maximum(y_clv, 0)

    clv_model = RandomForestRegressor(
        n_estimators=50,
        max_depth=5,
        random_state=42,
        n_jobs=-1,
    )
    clv_model.fit(X_clv, y_clv)

    clv_path = os.path.join(output_dir, "clv_v1.0.0.joblib")
    joblib.dump(clv_model, clv_path)
    logger.info(f"Dummy CLV model saved to {clv_path}")

    # --- Create metadata.json ---
    logger.info("Creating metadata.json")

    now = datetime.now(timezone.utc).isoformat()
    metadata = {
        "models": {
            "no_show_predictor": {
                "model_name": "no_show_predictor",
                "model_version": "v1.0.0",
                "trained_at": now,
                "features": NO_SHOW_FEATURES,
                "metrics": None,
                "status": "dummy",
            },
            "clv_predictor": {
                "model_name": "clv_predictor",
                "model_version": "v1.0.0",
                "trained_at": now,
                "features": CLV_FEATURES,
                "metrics": None,
                "status": "dummy",
            },
            "health_score": {
                "model_name": "health_score",
                "model_version": "v1.0.0",
                "type": "rfm_calculator",
                "weights": {
                    "recency": 0.40,
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
            },
        },
        "version_format": "v{major}.{minor}.{patch}",
        "last_updated": now,
    }

    metadata_path = os.path.join(output_dir, "metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Metadata written to {metadata_path}")
    logger.info("Dummy model generation complete")
    logger.info(f"  - {no_show_path} (XGBoost classifier, {n_samples} samples)")
    logger.info(f"  - {clv_path} (Random Forest regressor, {n_samples} samples)")
    logger.info(f"  - {metadata_path}")


if __name__ == "__main__":
    output = sys.argv[1] if len(sys.argv) > 1 else "models"
    generate_dummy_models(output_dir=output)
