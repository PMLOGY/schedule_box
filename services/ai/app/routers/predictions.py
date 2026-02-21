"""
Prediction endpoints for no-show, CLV, and health score.

All endpoints return fallback responses on error (never crash).
Uses model_loader for ML models and feature_store for Redis caching.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter

from ..schemas.requests import (
    BatchHealthScoreRequest,
    CLVPredictionRequest,
    HealthScorePredictionRequest,
    NoShowPredictionRequest,
)
from ..schemas.responses import (
    BatchHealthScoreResponse,
    CLVPredictionResponse,
    HealthScoreResponse,
    NoShowPredictionResponse,
)
from ..services import model_loader
from ..services import feature_store

logger = logging.getLogger(__name__)

_thread_pool = ThreadPoolExecutor(max_workers=4)

router = APIRouter(prefix="/predictions", tags=["predictions"])


# Default features for cold-start (population averages)
_DEFAULT_NO_SHOW_FEATURES: dict = {
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

_DEFAULT_CLV_FEATURES: dict = {
    "total_bookings": 1,
    "total_spent": 500.0,
    "avg_booking_value": 500.0,
    "days_since_first_visit": 30,
    "days_since_last_visit": 30,
    "booking_frequency": 0.5,
    "no_show_rate": 0.0,
    "service_diversity": 1,
}


@router.post("/no-show", response_model=NoShowPredictionResponse)
async def predict_no_show(request: NoShowPredictionRequest) -> NoShowPredictionResponse:
    """
    Predict no-show probability for a booking.

    Returns fallback response (probability=0.15, confidence=0.0) if model
    is unavailable and no features are provided, or on any error.
    """
    try:
        no_show_model = model_loader.get_no_show_model()

        # Try to get cached features from Redis
        features = await feature_store.get_booking_features(request.booking_id)

        # If no cached features, use request-provided features
        if features is None and request.features is not None:
            features = request.features.model_dump(exclude_none=True)

        # If still no features, use defaults
        if features is None:
            features = _DEFAULT_NO_SHOW_FEATURES.copy()

        # If no model at all, return fallback
        if no_show_model is None:
            return NoShowPredictionResponse(
                booking_id=request.booking_id,
                no_show_probability=0.15,
                confidence=0.0,
                risk_level="low",
                model_version="fallback",
                fallback=True,
            )

        # Make prediction (offload to thread pool to avoid blocking event loop)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(_thread_pool, no_show_model.predict, features)

        # Cache features for future requests
        await feature_store.cache_booking_features(request.booking_id, features)

        return NoShowPredictionResponse(
            booking_id=request.booking_id,
            no_show_probability=result["no_show_probability"],
            confidence=result["confidence"],
            risk_level=result["risk_level"],
            model_version=result["model_version"],
            fallback=result["fallback"],
        )
    except Exception as e:
        logger.error(f"No-show prediction failed for booking {request.booking_id}: {e}")
        return NoShowPredictionResponse(
            booking_id=request.booking_id,
            no_show_probability=0.15,
            confidence=0.0,
            risk_level="low",
            model_version="fallback",
            fallback=True,
        )


@router.post("/clv", response_model=CLVPredictionResponse)
async def predict_clv(request: CLVPredictionRequest) -> CLVPredictionResponse:
    """
    Predict Customer Lifetime Value (CLV) in CZK.

    Returns fallback response (clv=0, confidence=0.0, segment=low) if model
    is unavailable and no features are provided, or on any error.
    """
    try:
        clv_model = model_loader.get_clv_model()

        # Try to get cached features from Redis
        features = await feature_store.get_customer_features(request.customer_id)

        # If no cached features, use request-provided features
        if features is None and request.features is not None:
            features = request.features.model_dump(exclude_none=True)

        # If still no features, use defaults
        if features is None:
            features = _DEFAULT_CLV_FEATURES.copy()

        # If no model at all, return fallback
        if clv_model is None:
            return CLVPredictionResponse(
                customer_id=request.customer_id,
                clv_predicted=0.0,
                confidence=0.0,
                segment="low",
                model_version="fallback",
                fallback=True,
            )

        # Make prediction (offload to thread pool to avoid blocking event loop)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(_thread_pool, clv_model.predict, features)

        # Cache features for future requests
        await feature_store.cache_customer_features(request.customer_id, features)

        return CLVPredictionResponse(
            customer_id=request.customer_id,
            clv_predicted=result["clv_predicted"],
            confidence=result["confidence"],
            segment=result["segment"],
            model_version=result["model_version"],
            fallback=result["fallback"],
        )
    except Exception as e:
        logger.error(f"CLV prediction failed for customer {request.customer_id}: {e}")
        return CLVPredictionResponse(
            customer_id=request.customer_id,
            clv_predicted=0.0,
            confidence=0.0,
            segment="low",
            model_version="fallback",
            fallback=True,
        )


@router.post("/health-score", response_model=HealthScoreResponse)
async def predict_health_score(
    request: HealthScorePredictionRequest,
) -> HealthScoreResponse:
    """
    Calculate customer health score using RFM analysis.

    Health score is always available (pure calculation, no ML model needed).
    Returns fallback (score=50, category=good) only on unexpected errors.
    """
    try:
        calculator = model_loader.get_health_score_model()

        if calculator is None:
            return HealthScoreResponse(
                customer_id=request.customer_id,
                health_score=50,
                category="good",
                rfm_details=None,
                model_version="fallback",
                fallback=True,
            )

        result = calculator.calculate(
            recency_days=request.recency_days,
            frequency=request.frequency,
            monetary=request.monetary,
        )

        return HealthScoreResponse(
            customer_id=request.customer_id,
            health_score=result["health_score"],
            category=result["category"],
            rfm_details=result.get("rfm_details"),
            model_version=result["model_version"],
            fallback=result["fallback"],
        )
    except Exception as e:
        logger.error(
            f"Health score calculation failed for customer {request.customer_id}: {e}"
        )
        return HealthScoreResponse(
            customer_id=request.customer_id,
            health_score=50,
            category="good",
            rfm_details=None,
            model_version="fallback",
            fallback=True,
        )


@router.post("/health-score/batch", response_model=BatchHealthScoreResponse)
async def predict_health_score_batch(
    request: BatchHealthScoreRequest,
) -> BatchHealthScoreResponse:
    """
    Calculate health scores for multiple customers in a single request.

    Each customer is processed independently. Failed individual calculations
    return fallback values (the batch does not fail entirely).
    """
    try:
        calculator = model_loader.get_health_score_model()

        if calculator is None:
            # Return fallback for all customers
            predictions = [
                HealthScoreResponse(
                    customer_id=customer.customer_id,
                    health_score=50,
                    category="good",
                    rfm_details=None,
                    model_version="fallback",
                    fallback=True,
                )
                for customer in request.customers
            ]
            return BatchHealthScoreResponse(predictions=predictions)

        # Prepare batch input
        batch_input = [
            {
                "customer_id": customer.customer_id,
                "recency_days": customer.recency_days,
                "frequency": customer.frequency,
                "monetary": customer.monetary,
            }
            for customer in request.customers
        ]

        results = calculator.calculate_batch(batch_input)

        predictions = [
            HealthScoreResponse(
                customer_id=result["customer_id"],
                health_score=result["health_score"],
                category=result["category"],
                rfm_details=result.get("rfm_details"),
                model_version=result["model_version"],
                fallback=result["fallback"],
            )
            for result in results
        ]

        return BatchHealthScoreResponse(predictions=predictions)
    except Exception as e:
        logger.error(f"Batch health score calculation failed: {e}")
        predictions = [
            HealthScoreResponse(
                customer_id=customer.customer_id,
                health_score=50,
                category="good",
                rfm_details=None,
                model_version="fallback",
                fallback=True,
            )
            for customer in request.customers
        ]
        return BatchHealthScoreResponse(predictions=predictions)
