"""
Customer Health Score Calculator

RFM-based health score calculation (0-100 scale) with 4 categories.
Does not require a trained ML model - pure algorithmic calculation.
"""

import logging

logger = logging.getLogger(__name__)


class HealthScoreCalculator:
    """
    Calculates customer health scores using RFM (Recency, Frequency, Monetary) analysis.

    Scores are on a 0-100 scale with weighted components:
    - Recency (40%): How recently the customer visited
    - Frequency (35%): How often the customer visits
    - Monetary (25%): How much the customer spends

    Categories:
    - excellent (>= 80): Highly engaged, loyal customer
    - good (>= 60): Active customer with regular visits
    - at_risk (>= 40): Declining engagement, needs attention
    - churning (< 40): Likely to leave, immediate intervention needed
    """

    WEIGHTS: dict[str, float] = {
        "recency": 0.40,
        "frequency": 0.35,
        "monetary": 0.25,
    }

    CATEGORIES: dict[int, str] = {
        80: "excellent",
        60: "good",
        40: "at_risk",
        0: "churning",
    }

    def __init__(self, model_version: str = "v1.0.0"):
        """
        Initialize the health score calculator.

        No ML model needed - pure RFM calculation.

        Args:
            model_version: Version string for tracking.
        """
        self.model_version = model_version

    def calculate(self, recency_days: float, frequency: int, monetary: float) -> dict:
        """
        Calculate customer health score from RFM components.

        Args:
            recency_days: Days since last visit. 0 = today, 365+ = very inactive.
            frequency: Number of visits/bookings.
            monetary: Total monetary value in CZK.

        Returns:
            Dictionary with health_score (0-100), category, rfm_details, and metadata.
        """
        # Calculate individual RFM scores (0-100 each)
        r_score = self._calculate_recency_score(recency_days)
        f_score = self._calculate_frequency_score(frequency)
        m_score = self._calculate_monetary_score(monetary)

        # Weighted sum (0-100 scale)
        health_score = (
            r_score * self.WEIGHTS["recency"]
            + f_score * self.WEIGHTS["frequency"]
            + m_score * self.WEIGHTS["monetary"]
        )
        health_score = round(health_score)
        health_score = max(0, min(100, health_score))

        # Categorize
        category = self._categorize(health_score)

        return {
            "health_score": health_score,
            "category": category,
            "rfm_details": {
                "r_score": round(r_score, 1),
                "f_score": round(f_score, 1),
                "m_score": round(m_score, 1),
            },
            "model_version": self.model_version,
            "fallback": False,
        }

    def calculate_batch(self, customers: list[dict]) -> list[dict]:
        """
        Calculate health scores for multiple customers.

        Args:
            customers: List of dicts with recency_days, frequency, monetary fields.

        Returns:
            List of health score result dicts.
        """
        results = []
        for customer in customers:
            result = self.calculate(
                recency_days=customer["recency_days"],
                frequency=customer["frequency"],
                monetary=customer["monetary"],
            )
            if "customer_id" in customer:
                result["customer_id"] = customer["customer_id"]
            results.append(result)
        return results

    @staticmethod
    def _calculate_recency_score(recency_days: float) -> float:
        """
        Recency score: inversely proportional to days since last visit.

        0 days = 100 (best), 365+ days = 0 (worst), linear interpolation.
        """
        if recency_days <= 0:
            return 100.0
        elif recency_days >= 365:
            return 0.0
        else:
            return 100.0 * (1.0 - recency_days / 365.0)

    @staticmethod
    def _calculate_frequency_score(frequency: int) -> float:
        """
        Frequency score: proportional to number of visits.

        0 visits = 0 (worst), 20+ visits = 100 (best), linear interpolation.
        """
        if frequency <= 0:
            return 0.0
        elif frequency >= 20:
            return 100.0
        else:
            return 100.0 * (frequency / 20.0)

    @staticmethod
    def _calculate_monetary_score(monetary: float) -> float:
        """
        Monetary score: proportional to total spending in CZK.

        0 CZK = 0 (worst), 100000+ CZK = 100 (best), linear interpolation.
        """
        if monetary <= 0:
            return 0.0
        elif monetary >= 100000:
            return 100.0
        else:
            return 100.0 * (monetary / 100000.0)

    def _categorize(self, health_score: int) -> str:
        """Categorize health score into one of 4 categories."""
        if health_score >= 80:
            return "excellent"
        elif health_score >= 60:
            return "good"
        elif health_score >= 40:
            return "at_risk"
        else:
            return "churning"
