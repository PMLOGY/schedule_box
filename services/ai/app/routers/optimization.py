"""
Optimization endpoints for upselling, pricing, capacity, and reminder timing.

All endpoints return typed fallback responses on error (never crash).
Uses model_loader for ML models with graceful degradation.
"""

import logging

from fastapi import APIRouter

from ..schemas.requests import (
    CapacityForecastRequest,
    DynamicPricingRequest,
    ReminderTimingRequest,
    UpsellRequest,
)
from ..schemas.responses import (
    CapacityForecastResponse,
    DynamicPricingResponse,
    ReminderTimingResponse,
    UpsellResponse,
)
from ..services import model_loader

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/optimization", tags=["optimization"])


@router.post("/upselling", response_model=UpsellResponse)
async def get_upselling_recommendations(
    request: UpsellRequest,
) -> UpsellResponse:
    """
    Get smart upselling recommendations for a service.

    Returns service recommendations based on collaborative filtering,
    or empty recommendations when no trained model is available.
    """
    try:
        upselling_model = model_loader.get_upselling_model()

        if upselling_model is None:
            return UpsellResponse(
                recommendations=[],
                model_version="fallback",
                fallback=True,
            )

        results = upselling_model.recommend(
            current_service_id=request.current_service_id,
            customer_history=request.customer_history or [],
            n_recommendations=3,
        )

        # Determine if response is based on trained model or popularity fallback
        is_fallback = (
            upselling_model.similarity_matrix is None
            or not results
            or all(r.get("reason") == "popular_service" for r in results)
        )

        return UpsellResponse(
            recommendations=results,
            model_version=upselling_model.model_version,
            fallback=is_fallback,
        )
    except Exception as e:
        logger.error(
            f"Upselling recommendation failed for service "
            f"{request.current_service_id}: {e}"
        )
        return UpsellResponse(
            recommendations=[],
            model_version="fallback",
            fallback=True,
        )


@router.post("/pricing", response_model=DynamicPricingResponse)
async def get_dynamic_pricing(
    request: DynamicPricingRequest,
) -> DynamicPricingResponse:
    """
    Get optimal dynamic price for a service.

    Uses Thompson Sampling multi-armed bandit to select the best price
    within the allowed range. Enforces 30% daily price change constraint
    when base_price is provided. Falls back to midpoint pricing.
    """
    try:
        pricing_model = model_loader.get_pricing_model()

        if pricing_model is None:
            midpoint = round((request.price_min + request.price_max) / 2, 2)
            return DynamicPricingResponse(
                service_id=request.service_id,
                optimal_price=midpoint,
                confidence=0.0,
                constrained=False,
                model_version="fallback",
                fallback=True,
            )

        result = pricing_model.get_optimal_price(
            service_id=request.service_id,
            price_min=request.price_min,
            price_max=request.price_max,
            hour_of_day=request.hour_of_day,
            day_of_week=request.day_of_week,
            utilization=request.utilization,
            base_price=request.base_price,
        )

        return DynamicPricingResponse(
            service_id=request.service_id,
            optimal_price=result["optimal_price"],
            confidence=result["confidence"],
            constrained=result.get("constrained", False),
            model_version=pricing_model.model_version,
            fallback=False,
        )
    except Exception as e:
        logger.error(
            f"Dynamic pricing failed for service {request.service_id}: {e}"
        )
        midpoint = round((request.price_min + request.price_max) / 2, 2)
        return DynamicPricingResponse(
            service_id=request.service_id,
            optimal_price=midpoint,
            confidence=0.0,
            constrained=False,
            model_version="fallback",
            fallback=True,
        )


@router.post("/capacity", response_model=CapacityForecastResponse)
async def get_capacity_forecast(
    request: CapacityForecastRequest,
) -> CapacityForecastResponse:
    """
    Get capacity demand forecast for a company.

    Returns hourly booking demand predictions for the next N days
    with schedule change suggestions. Falls back to empty results
    when no trained model is available.
    """
    try:
        capacity_model = model_loader.get_capacity_model()

        if capacity_model is None:
            return CapacityForecastResponse(
                forecast=[],
                suggestions=[],
                model_version="fallback",
                fallback=True,
            )

        forecast_data = capacity_model.forecast(days_ahead=request.days_ahead)
        suggestions = capacity_model.suggest_schedule_changes(
            forecast_data=forecast_data,
            current_capacity=request.current_capacity,
        )

        return CapacityForecastResponse(
            forecast=forecast_data,
            suggestions=suggestions,
            model_version=capacity_model.model_version,
            fallback=len(forecast_data) == 0,
        )
    except Exception as e:
        logger.error(
            f"Capacity forecast failed for company {request.company_id}: {e}"
        )
        return CapacityForecastResponse(
            forecast=[],
            suggestions=[],
            model_version="fallback",
            fallback=True,
        )


@router.post("/reminder-timing", response_model=ReminderTimingResponse)
async def get_reminder_timing(
    request: ReminderTimingRequest,
) -> ReminderTimingResponse:
    """
    Get optimal reminder timing for a customer.

    Returns the optimal number of minutes before a booking to send
    a reminder notification, optimized per customer and channel.
    Falls back to 24 hours (1440 minutes) when no data is available.
    """
    try:
        timing_model = model_loader.get_reminder_timing_model()

        if timing_model is None:
            return ReminderTimingResponse(
                customer_id=request.customer_id,
                minutes_before=1440,
                expected_open_rate=0.0,
                confidence=0.0,
                model_version="fallback",
                fallback=True,
            )

        result = timing_model.get_optimal_timing(
            customer_id=request.customer_id,
            notification_channel=request.notification_channel,
        )

        return ReminderTimingResponse(
            customer_id=request.customer_id,
            minutes_before=result["minutes_before"],
            expected_open_rate=result["expected_open_rate"],
            confidence=result["confidence"],
            model_version=timing_model.model_version,
            fallback=result["fallback"],
        )
    except Exception as e:
        logger.error(
            f"Reminder timing failed for customer {request.customer_id}: {e}"
        )
        return ReminderTimingResponse(
            customer_id=request.customer_id,
            minutes_before=1440,
            expected_open_rate=0.0,
            confidence=0.0,
            model_version="fallback",
            fallback=True,
        )
