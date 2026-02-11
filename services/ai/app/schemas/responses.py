"""
Pydantic response models for all prediction endpoints.

All responses include a `fallback` flag indicating whether the prediction
came from a trained ML model (False) or a heuristic fallback (True).
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional


class NoShowPredictionResponse(BaseModel):
    """Response for no-show probability prediction."""

    booking_id: int
    no_show_probability: float
    confidence: float
    risk_level: Literal["low", "medium", "high"]
    model_version: str
    fallback: bool


class CLVPredictionResponse(BaseModel):
    """Response for Customer Lifetime Value prediction."""

    customer_id: int
    clv_predicted: float
    confidence: float
    segment: Literal["low", "medium", "high", "premium"]
    model_version: str
    fallback: bool


class RFMDetails(BaseModel):
    """RFM component scores for health score response."""

    r_score: float
    f_score: float
    m_score: float


class HealthScoreResponse(BaseModel):
    """Response for customer health score calculation."""

    customer_id: int
    health_score: int = Field(..., ge=0, le=100)
    category: Literal["excellent", "good", "at_risk", "churning"]
    rfm_details: Optional[RFMDetails] = None
    model_version: str
    fallback: bool


class BatchHealthScoreResponse(BaseModel):
    """Response for batch health score calculation."""

    predictions: list[HealthScoreResponse]


class ModelInfoResponse(BaseModel):
    """Response for model information endpoint."""

    model_name: str
    model_version: str
    trained_at: Optional[str] = None
    features: list[str]
    metrics: Optional[dict] = None
