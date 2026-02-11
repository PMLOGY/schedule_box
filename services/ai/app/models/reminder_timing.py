"""
Reminder Timing Optimizer

Bayesian optimization for optimal reminder send time per customer cluster.
Maximizes notification open rate by finding the best minutes-before-booking
to send reminders. Falls back to 24-hour default when no data is available.
"""

import json
import logging
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


class ReminderTimingOptimizer:
    """
    Optimizes reminder notification timing using Bayesian optimization.

    Finds the optimal number of minutes before a booking to send a reminder
    that maximizes the notification open rate. Uses per-customer or
    per-channel defaults with graceful fallback.
    """

    # Search space: 30 minutes to 2880 minutes (2 days)
    MIN_MINUTES = 30
    MAX_MINUTES = 2880
    DEFAULT_MINUTES = 1440  # 24 hours (fallback)

    def __init__(
        self,
        optimal_timings: Optional[dict] = None,
        model_version: str = "v1.0.0",
    ):
        """
        Initialize the reminder timing optimizer.

        Args:
            optimal_timings: Pre-computed optimal timing per customer cluster.
                Format: {"cluster_key": {"minutes": int, "open_rate": float, "confidence": float}}.
                None for fallback-only mode.
            model_version: Version string for the loaded model.
        """
        self.optimal_timings = optimal_timings or {}
        self.model_version = model_version

    def get_optimal_timing(
        self,
        customer_id: int,
        notification_channel: str = "email",
    ) -> dict:
        """
        Get optimal reminder timing for a customer.

        Lookup hierarchy:
        1. Customer-specific timing (customer_id:channel)
        2. Channel-level default (default:channel)
        3. Global fallback (24 hours)

        Args:
            customer_id: Customer to optimize for.
            notification_channel: Channel type (email, sms, push).

        Returns:
            Dict with minutes_before, expected_open_rate, confidence, and fallback flag.
        """
        # Try customer-specific timing
        cluster_key = self._cluster_key(customer_id, notification_channel)
        if cluster_key in self.optimal_timings:
            timing = self.optimal_timings[cluster_key]
            return {
                "minutes_before": timing["minutes"],
                "expected_open_rate": timing.get("open_rate", 0.0),
                "confidence": timing.get("confidence", 0.5),
                "fallback": False,
            }

        # Fallback to channel default
        channel_key = f"default:{notification_channel}"
        if channel_key in self.optimal_timings:
            timing = self.optimal_timings[channel_key]
            return {
                "minutes_before": timing["minutes"],
                "expected_open_rate": timing.get("open_rate", 0.0),
                "confidence": 0.3,
                "fallback": True,
            }

        # Ultimate fallback: 24 hours with no confidence
        return {
            "minutes_before": self.DEFAULT_MINUTES,
            "expected_open_rate": 0.0,
            "confidence": 0.0,
            "fallback": True,
        }

    def _cluster_key(self, customer_id: int, channel: str) -> str:
        """Build cluster key for timing lookup."""
        return f"{customer_id}:{channel}"

    @classmethod
    def optimize_from_data(
        cls, notification_data: list[dict]
    ) -> "ReminderTimingOptimizer":
        """
        Run Bayesian optimization on historical notification data.

        Groups data by customer cluster and runs GP optimization for
        clusters with sufficient observations (>= 5 records).

        Args:
            notification_data: List of dicts with customer_id, channel,
                minutes_before, and was_opened keys.

        Returns:
            ReminderTimingOptimizer with optimized timings per cluster.
        """
        try:
            from bayes_opt import BayesianOptimization
        except ImportError:
            logger.error("bayesian-optimization not installed, returning empty timings")
            return cls(optimal_timings={})

        # Group by customer cluster
        clusters: dict[str, list[dict]] = {}
        for n in notification_data:
            key = f"{n['customer_id']}:{n['channel']}"
            if key not in clusters:
                clusters[key] = []
            clusters[key].append(n)

        optimal: dict = {}
        for cluster_key, records in clusters.items():
            if len(records) < 5:
                continue  # Need minimum observations

            # Build objective function using kernel smoothing
            def _make_objective(recs):
                def objective(minutes):
                    bandwidth = 120  # 2-hour kernel bandwidth
                    weights = [
                        np.exp(
                            -0.5 * ((r["minutes_before"] - minutes) / bandwidth) ** 2
                        )
                        for r in recs
                    ]
                    total_w = sum(weights)
                    if total_w == 0:
                        return 0
                    return (
                        sum(
                            w * (1 if r["was_opened"] else 0)
                            for w, r in zip(weights, recs)
                        )
                        / total_w
                    )

                return objective

            try:
                optimizer = BayesianOptimization(
                    f=_make_objective(records),
                    pbounds={"minutes": (cls.MIN_MINUTES, cls.MAX_MINUTES)},
                    verbose=0,
                    random_state=42,
                )
                optimizer.maximize(init_points=5, n_iter=15)

                best = optimizer.max
                optimal[cluster_key] = {
                    "minutes": int(round(best["params"]["minutes"])),
                    "open_rate": round(best["target"], 3),
                    "confidence": min(len(records) / 20, 1.0),
                }
            except Exception as e:
                logger.warning(
                    f"Bayesian optimization failed for cluster {cluster_key}: {e}"
                )
                continue

        return cls(optimal_timings=optimal)

    def save(self, path: str) -> None:
        """Save optimal timings to JSON file."""
        with open(path, "w") as f:
            json.dump(self.optimal_timings, f)

    @classmethod
    def load(cls, path: str) -> "ReminderTimingOptimizer":
        """Load optimal timings from JSON file."""
        with open(path, "r") as f:
            timings = json.load(f)
        return cls(optimal_timings=timings)
