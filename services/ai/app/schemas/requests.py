"""
Pydantic request models for all prediction endpoints.

Validates incoming prediction requests with proper types and optional feature dicts.
"""

from pydantic import BaseModel, Field
from typing import Optional


class NoShowFeatures(BaseModel):
    """Features for no-show prediction."""

    booking_lead_time_hours: Optional[float] = None
    customer_no_show_rate: Optional[float] = None
    customer_total_bookings: Optional[int] = None
    day_of_week: Optional[int] = None
    hour_of_day: Optional[int] = None
    is_weekend: Optional[int] = None
    service_duration_minutes: Optional[int] = None
    service_price: Optional[float] = None
    is_first_visit: Optional[int] = None
    has_payment: Optional[int] = None
    days_since_last_visit: Optional[float] = None


class NoShowPredictionRequest(BaseModel):
    """Request for no-show probability prediction."""

    booking_id: int
    features: Optional[NoShowFeatures] = None


class CLVFeatures(BaseModel):
    """Features for CLV prediction."""

    total_bookings: Optional[int] = None
    total_spent: Optional[float] = None
    avg_booking_value: Optional[float] = None
    days_since_first_visit: Optional[int] = None
    days_since_last_visit: Optional[int] = None
    booking_frequency: Optional[float] = None
    no_show_rate: Optional[float] = None
    service_diversity: Optional[int] = None


class CLVPredictionRequest(BaseModel):
    """Request for Customer Lifetime Value prediction."""

    customer_id: int
    features: Optional[CLVFeatures] = None


class HealthScorePredictionRequest(BaseModel):
    """Request for customer health score calculation."""

    customer_id: int
    recency_days: float = Field(..., description="Days since last visit")
    frequency: int = Field(..., description="Number of visits")
    monetary: float = Field(..., description="Total monetary value in CZK")


class BatchHealthScoreRequest(BaseModel):
    """Request for batch health score calculation."""

    customers: list[HealthScorePredictionRequest]
