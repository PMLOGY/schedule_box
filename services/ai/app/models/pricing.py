"""
Dynamic Pricing Optimizer

Thompson Sampling multi-armed bandit for dynamic service pricing.
Enforces the 30% daily price change constraint from documentation.
Falls back to midpoint pricing when no trained state is available.
"""

import json
import logging
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


class PricingOptimizer:
    """
    Multi-armed bandit for dynamic pricing using Thompson Sampling.

    Discretizes the price range into N_ARMS levels and learns the optimal
    price for each context (service, day, time block, utilization).
    Enforces a maximum 30% daily price change constraint when a base_price
    is provided.
    """

    # Discretize price range into 5 levels
    N_ARMS = 5

    def __init__(
        self,
        state: Optional[dict] = None,
        model_version: str = "v1.0.0",
    ):
        """
        Initialize the pricing optimizer.

        Args:
            state: Arm parameters per context key. Format:
                {"context_key": {"alpha": [1.0]*5, "beta": [1.0]*5}}.
                None for cold-start mode.
            model_version: Version string for the loaded model.
        """
        self.state = state or {}
        self.model_version = model_version

    def get_optimal_price(
        self,
        service_id: int,
        price_min: float,
        price_max: float,
        hour_of_day: int,
        day_of_week: int,
        utilization: float,
        base_price: Optional[float] = None,
    ) -> dict:
        """
        Select optimal price using Thompson Sampling.

        Args:
            service_id: Service being priced.
            price_min: Minimum allowed price.
            price_max: Maximum allowed price.
            hour_of_day: Hour of day (0-23).
            day_of_week: Day of week (0=Monday, 6=Sunday).
            utilization: Current utilization ratio (0.0-1.0).
            base_price: Current static/base price for 30% constraint enforcement.

        Returns:
            Dict with optimal_price, arm_selected, confidence, context_key, constrained.
        """
        # Discretize context
        context_key = self._context_key(service_id, hour_of_day, day_of_week, utilization)

        # Get or initialize arm parameters for this context
        if context_key not in self.state:
            self.state[context_key] = {
                "alpha": [1.0] * self.N_ARMS,
                "beta": [1.0] * self.N_ARMS,
            }

        arms = self.state[context_key]

        # Thompson Sampling: sample from Beta distribution for each arm
        samples = [
            np.random.beta(arms["alpha"][i], arms["beta"][i])
            for i in range(self.N_ARMS)
        ]

        # Select arm with highest sample
        best_arm = int(np.argmax(samples))

        # Map arm to price
        prices = np.linspace(price_min, price_max, self.N_ARMS)
        optimal_price = float(prices[best_arm])

        # CRITICAL: 30% daily price change constraint
        constrained = False
        if base_price is not None and base_price > 0:
            lower_bound = base_price * 0.7
            upper_bound = base_price * 1.3
            clamped_price = max(lower_bound, min(optimal_price, upper_bound))
            if abs(clamped_price - optimal_price) > 0.01:
                constrained = True
                optimal_price = clamped_price

        # Calculate confidence from total observations on selected arm
        total_obs = arms["alpha"][best_arm] + arms["beta"][best_arm] - 2
        confidence = min(total_obs / 100, 1.0)

        # Reduce confidence if constraint was applied (less reliable signal)
        if constrained:
            confidence = confidence * 0.7

        return {
            "optimal_price": round(optimal_price, 2),
            "arm_selected": best_arm,
            "confidence": round(confidence, 3),
            "context_key": context_key,
            "constrained": constrained,
        }

    def update_reward(self, context_key: str, arm: int, reward: bool) -> None:
        """
        Update arm parameters based on observed reward.

        Args:
            context_key: Context key identifying the arm parameters.
            arm: Index of the arm that was played.
            reward: True if booking happened at this price (success),
                False if no booking (failure).
        """
        if context_key in self.state:
            if reward:
                self.state[context_key]["alpha"][arm] += 1
            else:
                self.state[context_key]["beta"][arm] += 1

    def _context_key(
        self,
        service_id: int,
        hour: int,
        day: int,
        utilization: float,
    ) -> str:
        """
        Build context key for arm lookup.

        Format: "{service_id}:{day}:{hour_block}:{util_bucket}"
        Hour is bucketed into 6 blocks (4 hours each).
        Utilization is bucketed into low/mid/high.
        """
        util_bucket = (
            "low" if utilization < 0.3 else "mid" if utilization < 0.7 else "high"
        )
        return f"{service_id}:{day}:{hour // 4}:{util_bucket}"

    def save_state(self, path: str) -> None:
        """Save arm parameters to JSON file."""
        with open(path, "w") as f:
            json.dump(self.state, f)

    @classmethod
    def load_state(cls, path: str) -> "PricingOptimizer":
        """Load arm parameters from JSON file."""
        with open(path, "r") as f:
            state = json.load(f)
        return cls(state=state)
