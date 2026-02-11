"""
No-Show Predictor

XGBoost-based binary classifier for predicting booking no-show probability.
Falls back to heuristic prediction when no trained model is available.
"""

import logging
from typing import Any, Optional

import joblib
import numpy as np

logger = logging.getLogger(__name__)


class NoShowPredictor:
    """
    Predicts the probability that a customer will not show up for a booking.

    Uses XGBoost binary classification when a trained model is available,
    otherwise falls back to a weighted heuristic based on customer history
    and booking characteristics.
    """

    FEATURE_COLUMNS: list[str] = [
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

    # Default values for missing features (population averages)
    FEATURE_DEFAULTS: dict[str, float] = {
        "booking_lead_time_hours": 24.0,
        "customer_no_show_rate": 0.15,
        "customer_total_bookings": 1,
        "day_of_week": 1,
        "hour_of_day": 10,
        "is_weekend": 0,
        "service_duration_minutes": 60,
        "service_price": 500.0,
        "is_first_visit": 1,
        "has_payment": 0,
        "days_since_last_visit": 999.0,
    }

    def __init__(self, model: Any = None, model_version: str = "v1.0.0"):
        """
        Initialize the no-show predictor.

        Args:
            model: Trained XGBoost model instance, or None for heuristic-only mode.
            model_version: Version string for the loaded model.
        """
        self.model = model
        self.model_version = model_version

    def predict(self, features: dict) -> dict:
        """
        Predict no-show probability for a booking.

        Args:
            features: Dictionary of feature values. Missing features are filled
                     with population-average defaults.

        Returns:
            Dictionary with no_show_probability, confidence, risk_level, and
            whether the prediction is a fallback (heuristic).
        """
        # Extract features in correct order, filling missing with defaults
        feature_values = [
            features.get(col, self.FEATURE_DEFAULTS[col])
            for col in self.FEATURE_COLUMNS
        ]

        if self.model is not None:
            return self._predict_with_model(feature_values, features)
        else:
            return self._predict_heuristic(feature_values, features)

    def _predict_with_model(self, feature_values: list, raw_features: dict) -> dict:
        """Make prediction using trained XGBoost model."""
        try:
            X = np.array([feature_values])
            probability = float(self.model.predict_proba(X)[0][1])
            probability = max(0.0, min(1.0, probability))

            risk_level = self._get_risk_level(probability)

            return {
                "no_show_probability": round(probability, 4),
                "confidence": 0.82,
                "risk_level": risk_level,
                "model_version": self.model_version,
                "fallback": False,
            }
        except Exception as e:
            logger.warning(
                f"Model prediction failed, falling back to heuristic: {e}"
            )
            return self._predict_heuristic(feature_values, raw_features)

    def _predict_heuristic(self, feature_values: list, raw_features: dict) -> dict:
        """
        Heuristic prediction based on weighted combination of key factors.

        Factors:
        - customer_no_show_rate (weight 0.6): Primary signal
        - first_visit_factor (+0.05 if first visit): New customers are riskier
        - lead_time_factor: Very short or very long lead times increase risk
        - no_payment_factor (+0.1 if no payment): Unpaid bookings are riskier
        """
        customer_no_show_rate = raw_features.get(
            "customer_no_show_rate", self.FEATURE_DEFAULTS["customer_no_show_rate"]
        )
        is_first_visit = raw_features.get(
            "is_first_visit", self.FEATURE_DEFAULTS["is_first_visit"]
        )
        booking_lead_time_hours = raw_features.get(
            "booking_lead_time_hours", self.FEATURE_DEFAULTS["booking_lead_time_hours"]
        )
        has_payment = raw_features.get(
            "has_payment", self.FEATURE_DEFAULTS["has_payment"]
        )

        # Base: weighted no-show rate
        probability = customer_no_show_rate * 0.6

        # First visit factor
        if is_first_visit:
            probability += 0.05

        # Lead time factor: very short (<2h) or very long (>168h/1 week) lead times
        if booking_lead_time_hours < 2:
            probability += 0.08
        elif booking_lead_time_hours > 168:
            probability += 0.05

        # No payment factor
        if not has_payment:
            probability += 0.1

        # Clamp to [0, 1]
        probability = max(0.0, min(1.0, probability))

        risk_level = self._get_risk_level(probability)

        return {
            "no_show_probability": round(probability, 4),
            "confidence": 0.4,
            "risk_level": risk_level,
            "model_version": "heuristic",
            "fallback": True,
        }

    @staticmethod
    def _get_risk_level(probability: float) -> str:
        """Determine risk level from probability threshold."""
        if probability >= 0.5:
            return "high"
        elif probability >= 0.3:
            return "medium"
        else:
            return "low"

    @classmethod
    def from_file(cls, path: str) -> "NoShowPredictor":
        """
        Load a trained model from a joblib file.

        Args:
            path: Path to the serialized model file.

        Returns:
            NoShowPredictor instance with the loaded model.
        """
        model = joblib.load(path)
        return cls(model=model)
