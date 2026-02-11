"""
Feature engineering utilities for ML predictions.

Provides consistent feature computation from raw booking and customer data.
These functions ensure training/serving feature parity.
"""

from datetime import datetime, timezone
from typing import Any


def compute_no_show_features(
    booking_data: dict[str, Any], customer_data: dict[str, Any]
) -> dict[str, Any]:
    """
    Compute the 11 features needed for no-show prediction from raw data.

    Args:
        booking_data: Raw booking data with fields like start_time, created_at,
                     service_duration_minutes, service_price, has_payment.
        customer_data: Raw customer data with fields like no_show_count,
                      total_bookings, last_visit_at.

    Returns:
        Dictionary with all 11 no-show prediction features.
    """
    now = datetime.now(timezone.utc)

    # Time-based features
    start_time = booking_data.get("start_time")
    created_at = booking_data.get("created_at", now)

    if isinstance(start_time, str):
        start_time = datetime.fromisoformat(start_time)
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)

    booking_lead_time_hours = 24.0
    if start_time and created_at:
        delta = (start_time - created_at).total_seconds() / 3600
        booking_lead_time_hours = max(0.0, delta)

    day_of_week = start_time.weekday() if start_time else 1  # 0=Monday
    hour_of_day = start_time.hour if start_time else 10
    is_weekend = 1 if day_of_week >= 5 else 0

    # Customer history features
    total_bookings = customer_data.get("total_bookings", 1)
    no_show_count = customer_data.get("no_show_count", 0)
    customer_no_show_rate = (
        no_show_count / max(total_bookings, 1) if total_bookings > 0 else 0.15
    )

    # Days since last visit
    last_visit_at = customer_data.get("last_visit_at")
    if last_visit_at:
        if isinstance(last_visit_at, str):
            last_visit_at = datetime.fromisoformat(last_visit_at)
        days_since_last_visit = (now - last_visit_at).total_seconds() / 86400
    else:
        days_since_last_visit = 999.0

    return {
        "booking_lead_time_hours": round(booking_lead_time_hours, 2),
        "customer_no_show_rate": round(customer_no_show_rate, 4),
        "customer_total_bookings": total_bookings,
        "day_of_week": day_of_week,
        "hour_of_day": hour_of_day,
        "is_weekend": is_weekend,
        "service_duration_minutes": booking_data.get("service_duration_minutes", 60),
        "service_price": float(booking_data.get("service_price", 500)),
        "is_first_visit": 1 if total_bookings <= 1 else 0,
        "has_payment": 1 if booking_data.get("has_payment") else 0,
        "days_since_last_visit": round(days_since_last_visit, 1),
    }


def compute_clv_features(customer_data: dict[str, Any]) -> dict[str, Any]:
    """
    Compute the 8 features needed for CLV prediction from raw customer data.

    Args:
        customer_data: Raw customer data with fields like total_bookings,
                      total_spent, created_at, last_visit_at, no_show_count,
                      services_used.

    Returns:
        Dictionary with all 8 CLV prediction features.
    """
    now = datetime.now(timezone.utc)

    total_bookings = customer_data.get("total_bookings", 1)
    total_spent = float(customer_data.get("total_spent", 0))

    # Average booking value
    avg_booking_value = total_spent / max(total_bookings, 1)

    # Days since first visit
    created_at = customer_data.get("created_at")
    if created_at:
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        days_since_first_visit = max(1, int((now - created_at).total_seconds() / 86400))
    else:
        days_since_first_visit = 30

    # Days since last visit
    last_visit_at = customer_data.get("last_visit_at")
    if last_visit_at:
        if isinstance(last_visit_at, str):
            last_visit_at = datetime.fromisoformat(last_visit_at)
        days_since_last_visit = max(0, int((now - last_visit_at).total_seconds() / 86400))
    else:
        days_since_last_visit = 30

    # Booking frequency (bookings per 30-day period)
    booking_frequency = (
        total_bookings / max(days_since_first_visit / 30, 1)
        if days_since_first_visit > 0
        else 0.5
    )

    # No-show rate
    no_show_count = customer_data.get("no_show_count", 0)
    no_show_rate = no_show_count / max(total_bookings, 1)

    # Service diversity (number of unique services used)
    service_diversity = customer_data.get("service_diversity", 1)
    if isinstance(service_diversity, list):
        service_diversity = len(service_diversity)

    return {
        "total_bookings": total_bookings,
        "total_spent": round(total_spent, 2),
        "avg_booking_value": round(avg_booking_value, 2),
        "days_since_first_visit": days_since_first_visit,
        "days_since_last_visit": days_since_last_visit,
        "booking_frequency": round(booking_frequency, 4),
        "no_show_rate": round(no_show_rate, 4),
        "service_diversity": service_diversity,
    }


def compute_rfm(customer_data: dict[str, Any]) -> tuple[float, int, float]:
    """
    Extract RFM (Recency, Frequency, Monetary) values from customer data.

    Args:
        customer_data: Raw customer data with last_visit_at, total_bookings,
                      total_spent fields.

    Returns:
        Tuple of (recency_days, frequency, monetary).
    """
    now = datetime.now(timezone.utc)

    # Recency: days since last visit
    last_visit_at = customer_data.get("last_visit_at")
    if last_visit_at:
        if isinstance(last_visit_at, str):
            last_visit_at = datetime.fromisoformat(last_visit_at)
        recency_days = max(0.0, (now - last_visit_at).total_seconds() / 86400)
    else:
        recency_days = 999.0

    # Frequency: total bookings
    frequency = int(customer_data.get("total_bookings", 0))

    # Monetary: total spent
    monetary = float(customer_data.get("total_spent", 0))

    return (round(recency_days, 1), frequency, round(monetary, 2))
