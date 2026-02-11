"""
ML model classes for ScheduleBox AI predictions and optimization.

Exports:
    NoShowPredictor: XGBoost-based no-show probability predictor
    CLVPredictor: Random Forest-based Customer Lifetime Value predictor
    HealthScoreCalculator: RFM-based customer health score calculator
    UpsellRecommender: Item-based collaborative filtering for upselling
    PricingOptimizer: Thompson Sampling MAB for dynamic pricing
    CapacityForecaster: Prophet-based demand forecaster
    ReminderTimingOptimizer: Bayesian optimization for reminder timing
"""

from .no_show import NoShowPredictor
from .clv import CLVPredictor
from .health_score import HealthScoreCalculator
from .upselling import UpsellRecommender
from .pricing import PricingOptimizer
from .capacity import CapacityForecaster
from .reminder_timing import ReminderTimingOptimizer

__all__ = [
    "NoShowPredictor",
    "CLVPredictor",
    "HealthScoreCalculator",
    "UpsellRecommender",
    "PricingOptimizer",
    "CapacityForecaster",
    "ReminderTimingOptimizer",
]
