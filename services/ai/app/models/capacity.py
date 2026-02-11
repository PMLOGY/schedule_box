"""
Capacity Forecaster

Prophet-based time series demand forecaster for booking capacity optimization.
Provides hourly demand predictions and schedule change suggestions.
Falls back to empty predictions when no trained model is available.
"""

import logging
from datetime import datetime
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


class CapacityForecaster:
    """
    Time series demand forecaster using Facebook Prophet.

    Predicts hourly booking demand for the next N days and suggests
    schedule changes based on predicted utilization levels.
    Falls back to empty results when no trained model is available.
    """

    def __init__(
        self,
        model=None,
        model_version: str = "v1.0.0",
    ):
        """
        Initialize the capacity forecaster.

        Args:
            model: Trained Prophet model instance, or None for fallback mode.
            model_version: Version string for the loaded model.
        """
        self.model = model
        self.model_version = model_version

    def forecast(self, days_ahead: int = 7) -> list[dict]:
        """
        Forecast booking demand for the next N days.

        Returns hourly predictions with utilization level classification.
        Returns empty list when no trained model is available.

        Args:
            days_ahead: Number of days to forecast (1-30).

        Returns:
            List of forecast entries with datetime, predicted_bookings,
            lower_bound, upper_bound, and utilization_level.
        """
        if self.model is None:
            return []

        try:
            # Lazy import to handle Prophet import errors gracefully
            import pandas as pd
        except ImportError:
            logger.warning("pandas not available for capacity forecasting")
            return []

        try:
            # Create future dataframe with hourly frequency
            future = self.model.make_future_dataframe(
                periods=days_ahead * 24,
                freq="h",
            )

            # Predict
            forecast_df = self.model.predict(future)

            # Get only future predictions
            now = datetime.now()
            future_mask = forecast_df["ds"] >= now
            future_forecast = forecast_df[future_mask]

            results = []
            for _, row in future_forecast.iterrows():
                predicted_demand = max(0, row["yhat"])
                lower = max(0, row["yhat_lower"])
                upper = max(0, row["yhat_upper"])

                results.append(
                    {
                        "datetime": row["ds"].isoformat(),
                        "predicted_bookings": round(predicted_demand, 1),
                        "lower_bound": round(lower, 1),
                        "upper_bound": round(upper, 1),
                        "utilization_level": self._classify_utilization(
                            predicted_demand
                        ),
                    }
                )

            return results
        except Exception as e:
            logger.error(f"Capacity forecast failed: {e}")
            return []

    def suggest_schedule_changes(
        self,
        forecast_data: list[dict],
        current_capacity: int,
    ) -> list[dict]:
        """
        Suggest schedule modifications based on forecast data.

        Analyzes predicted demand vs current capacity and recommends
        extending or reducing hours.

        Args:
            forecast_data: List of forecast entries from forecast().
            current_capacity: Maximum bookings per hour.

        Returns:
            List of suggestion dicts with datetime, type, reason, and priority.
        """
        suggestions = []
        for entry in forecast_data:
            demand = entry["predicted_bookings"]
            if demand > current_capacity * 0.9:
                suggestions.append(
                    {
                        "datetime": entry["datetime"],
                        "type": "extend_hours",
                        "reason": (
                            f"Predicted demand ({demand:.0f}) near capacity "
                            f"({current_capacity})"
                        ),
                        "priority": "high",
                    }
                )
            elif demand < current_capacity * 0.3:
                suggestions.append(
                    {
                        "datetime": entry["datetime"],
                        "type": "reduce_hours",
                        "reason": (
                            f"Low predicted demand ({demand:.0f}), "
                            f"consider shorter hours"
                        ),
                        "priority": "low",
                    }
                )
        return suggestions

    @classmethod
    def train(cls, booking_counts) -> "CapacityForecaster":
        """
        Train Prophet model from booking counts.

        Args:
            booking_counts: DataFrame with 'ds' (datetime) and 'y' (booking count) columns.

        Returns:
            CapacityForecaster instance with trained model.
        """
        try:
            from prophet import Prophet
        except ImportError:
            logger.error("Prophet not installed, cannot train capacity model")
            return cls(model=None)

        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=True,
            changepoint_prior_scale=0.05,
        )
        model.fit(booking_counts)
        return cls(model=model)

    @staticmethod
    def _classify_utilization(predicted: float) -> str:
        """Classify predicted demand into utilization levels."""
        if predicted >= 8:
            return "high"
        elif predicted >= 4:
            return "medium"
        return "low"
