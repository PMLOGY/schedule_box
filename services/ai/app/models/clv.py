"""
Customer Lifetime Value (CLV) Predictor

Random Forest-based regression model for predicting customer lifetime value.
Falls back to heuristic prediction when no trained model is available.
"""

import logging
import math
from typing import Any, Optional

import joblib
import numpy as np

logger = logging.getLogger(__name__)


class CLVPredictor:
    """
    Predicts Customer Lifetime Value (CLV) in CZK.

    Uses Random Forest regression when a trained model is available,
    otherwise falls back to a heuristic based on spending patterns
    and engagement metrics.
    """

    FEATURE_COLUMNS: list[str] = [
        "total_bookings",
        "total_spent",
        "avg_booking_value",
        "days_since_first_visit",
        "days_since_last_visit",
        "booking_frequency",
        "no_show_rate",
        "service_diversity",
    ]

    # Default values for missing features
    FEATURE_DEFAULTS: dict[str, float] = {
        "total_bookings": 1,
        "total_spent": 500.0,
        "avg_booking_value": 500.0,
        "days_since_first_visit": 30,
        "days_since_last_visit": 30,
        "booking_frequency": 0.5,
        "no_show_rate": 0.0,
        "service_diversity": 1,
    }

    def __init__(self, model: Any = None, model_version: str = "v1.0.0"):
        """
        Initialize the CLV predictor.

        Args:
            model: Trained Random Forest model instance, or None for heuristic-only mode.
            model_version: Version string for the loaded model.
        """
        self.model = model
        self.model_version = model_version

    def predict(self, features: dict) -> dict:
        """
        Predict Customer Lifetime Value.

        Args:
            features: Dictionary of feature values. Missing features are filled
                     with defaults.

        Returns:
            Dictionary with clv_predicted (CZK), confidence, segment, and
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
        """Make prediction using trained Random Forest model."""
        try:
            X = np.array([feature_values])
            clv_predicted = float(self.model.predict(X)[0])
            clv_predicted = max(0.0, clv_predicted)

            segment = self._get_segment(clv_predicted)

            return {
                "clv_predicted": round(clv_predicted, 2),
                "confidence": 0.75,
                "segment": segment,
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
        Heuristic CLV prediction based on spending patterns.

        Formula: CLV = total_spent * 2.5 * (1 - no_show_rate) * frequency_factor
        where frequency_factor uses log scale of booking frequency.
        """
        total_spent = raw_features.get(
            "total_spent", self.FEATURE_DEFAULTS["total_spent"]
        )
        no_show_rate = raw_features.get(
            "no_show_rate", self.FEATURE_DEFAULTS["no_show_rate"]
        )
        booking_frequency = raw_features.get(
            "booking_frequency", self.FEATURE_DEFAULTS["booking_frequency"]
        )

        # Frequency factor using log scale (higher frequency = higher CLV, diminishing returns)
        frequency_factor = max(0.5, min(2.0, math.log(max(booking_frequency, 0.1) + 1, 2)))

        # CLV heuristic
        clv_predicted = total_spent * 2.5 * (1 - no_show_rate) * frequency_factor
        clv_predicted = max(0.0, clv_predicted)

        segment = self._get_segment(clv_predicted)

        return {
            "clv_predicted": round(clv_predicted, 2),
            "confidence": 0.3,
            "segment": segment,
            "model_version": "heuristic",
            "fallback": True,
        }

    @staticmethod
    def _get_segment(clv_predicted: float) -> str:
        """Determine customer segment from CLV value (in CZK)."""
        if clv_predicted >= 50000:
            return "premium"
        elif clv_predicted >= 20000:
            return "high"
        elif clv_predicted >= 5000:
            return "medium"
        else:
            return "low"

    @classmethod
    def from_file(cls, path: str) -> "CLVPredictor":
        """
        Load a trained model from a joblib file.

        Args:
            path: Path to the serialized model file.

        Returns:
            CLVPredictor instance with the loaded model.
        """
        model = joblib.load(path)
        return cls(model=model)
