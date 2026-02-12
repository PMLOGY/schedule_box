"""
Pydantic request models for all prediction endpoints.

Validates incoming prediction requests with proper types and optional feature dicts.
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional


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


# --- Optimization request models (Phase 11) ---


class UpsellRequest(BaseModel):
    """Request for smart upselling recommendations."""

    customer_id: int
    current_service_id: int
    customer_history: Optional[list[int]] = None  # Previously booked service IDs


class DynamicPricingRequest(BaseModel):
    """Request for dynamic pricing optimization."""

    service_id: int
    price_min: float = Field(..., gt=0, description="Minimum allowed price")
    price_max: float = Field(..., gt=0, description="Maximum allowed price")
    base_price: Optional[float] = Field(
        None, gt=0, description="Current static price for 30% constraint"
    )
    hour_of_day: int = Field(..., ge=0, le=23)
    day_of_week: int = Field(..., ge=0, le=6)
    utilization: float = Field(
        ..., ge=0.0, le=1.0, description="Current utilization 0.0-1.0"
    )


class CapacityForecastRequest(BaseModel):
    """Request for capacity demand forecasting."""

    company_id: int
    days_ahead: int = Field(default=7, ge=1, le=30)
    current_capacity: int = Field(
        default=8, ge=1, description="Max bookings per hour for suggestions"
    )


class ReminderTimingRequest(BaseModel):
    """Request for smart reminder timing optimization."""

    customer_id: int
    notification_channel: Literal["email", "sms", "push"] = "email"


# --- Voice booking request models (Phase 14) ---


class VoiceProcessRequest(BaseModel):
    """Metadata for voice processing (audio comes via UploadFile)."""

    language: str = Field(default="cs", pattern="^(cs|sk|en)$")
    company_id: int = Field(..., gt=0)


# --- Follow-up request models (Phase 14) ---


class FollowUpCustomerContext(BaseModel):
    """Customer context for follow-up generation."""

    customer_name: str
    business_name: str
    last_visit_date: Optional[str] = None
    last_service: Optional[str] = None
    total_visits: Optional[int] = None
    total_spent: Optional[float] = None
    health_score: Optional[int] = None
    health_category: Optional[str] = None
    preferred_services: Optional[str] = None
    days_inactive: Optional[int] = None
    recommended_service: Optional[str] = None
    recommendation_reason: Optional[str] = None
    loyalty_tier: Optional[str] = None


class FollowUpRequest(BaseModel):
    """Request for AI follow-up text generation."""

    customer_id: int = Field(..., gt=0)
    company_id: int = Field(..., gt=0)
    type: Literal["post_visit", "re_engagement", "upsell", "birthday"]
    customer_context: FollowUpCustomerContext


# --- Competitor intelligence request models (Phase 14) ---


class CompetitorScrapeRequest(BaseModel):
    """Request to trigger competitor scraping."""

    company_id: int = Field(..., gt=0)
    competitor_name: str = Field(..., min_length=1, max_length=255)
    competitor_url: str = Field(..., min_length=1, max_length=500)
    data_types: list[Literal["pricing", "services", "reviews"]] = Field(
        default=["pricing", "services"]
    )


class CompetitorDataRequest(BaseModel):
    """Request for stored competitor data."""

    company_id: int = Field(..., gt=0)
    competitor_name: Optional[str] = None
    data_type: Optional[Literal["pricing", "services", "reviews", "availability"]] = None
