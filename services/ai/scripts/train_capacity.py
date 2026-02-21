"""
Capacity Forecaster Training Script

Trains a Prophet time series model for booking capacity forecasting.
Generates hourly demand predictions based on historical booking patterns.
Uses synthetic data generation when real training data is not available.

Usage:
    python -m scripts.train_capacity
    python scripts/train_capacity.py
"""

import json
import logging
import os
import sys
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd

# Add parent directory to sys.path for model class imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def generate_synthetic_booking_counts(weeks: int = 26) -> pd.DataFrame:
    """
    Generate hourly booking counts for the past N weeks.

    Includes realistic patterns:
    - Weekly seasonality: weekdays busier than weekends
    - Daily seasonality: peak hours 10am-2pm
    - Gradual upward trend (business growth)
    - Noise and occasional spikes (holiday effects)

    Args:
        weeks: Number of weeks of historical data to generate.

    Returns:
        DataFrame with 'ds' (datetime) and 'y' (booking count) columns,
        compatible with Prophet.
    """
    rng = np.random.RandomState(42)

    # Generate hourly timestamps
    end_date = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    start_date = end_date - timedelta(weeks=weeks)
    hours = int((end_date - start_date).total_seconds() / 3600)

    timestamps = [start_date + timedelta(hours=h) for h in range(hours)]
    booking_counts = []

    for ts in timestamps:
        hour = ts.hour
        day_of_week = ts.weekday()  # 0=Monday, 6=Sunday
        week_num = (ts - start_date).days // 7

        # Base demand
        base = 3.0

        # Daily seasonality (peak 10am-2pm)
        if 10 <= hour <= 14:
            daily_factor = 2.5
        elif 8 <= hour <= 9 or 15 <= hour <= 18:
            daily_factor = 1.5
        elif 7 <= hour <= 19:
            daily_factor = 1.0
        else:
            daily_factor = 0.1  # Very low demand at night

        # Weekly seasonality (weekdays busier)
        if day_of_week <= 4:  # Monday-Friday
            weekly_factor = 1.2 if day_of_week in (1, 2, 3) else 1.0  # Tue-Thu busiest
        else:
            weekly_factor = 0.7  # Weekends

        # Gradual upward trend (business growth ~2% per week)
        trend = 1.0 + (week_num / weeks) * 0.3

        # Holiday spikes (random 3-5 days with 2x demand)
        is_holiday_spike = rng.random() < 0.02  # ~2% of days
        holiday_factor = 2.0 if is_holiday_spike else 1.0

        # Calculate demand
        demand = base * daily_factor * weekly_factor * trend * holiday_factor

        # Add noise (Poisson for count data)
        noisy_demand = max(0, rng.poisson(lam=max(0.1, demand)))

        booking_counts.append(float(noisy_demand))

    df = pd.DataFrame({
        "ds": timestamps,
        "y": booking_counts,
    })

    # Remove timezone info for Prophet compatibility
    df["ds"] = df["ds"].dt.tz_localize(None)

    logger.info(
        f"Generated {len(df)} hourly booking counts "
        f"from {df['ds'].min()} to {df['ds'].max()}"
    )
    logger.info(
        f"Average bookings/hour: {df['y'].mean():.2f}, "
        f"max: {df['y'].max():.0f}"
    )
    return df


def write_meta_sidecar(model_path: str, model_name: str, training_points: int, date_range: str) -> None:
    """Write .meta.json version sidecar alongside the model file."""
    import prophet as prophet_lib

    meta = {
        "model_name": model_name,
        "model_version": "v1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "prophet_version": prophet_lib.__version__,
        "training_points": training_points,
        "date_range": date_range,
        "serialization": "prophet.serialize.model_to_json",
    }
    meta_path = model_path.replace(".json", ".meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    logger.info(f"Version sidecar written to {meta_path}")


def load_training_data(api_url: str | None = None) -> pd.DataFrame:
    """
    Load training data from the ScheduleBox API or generate synthetic data.

    Args:
        api_url: Base URL of the ScheduleBox API. If None, uses synthetic data.

    Returns:
        DataFrame with 'ds' and 'y' columns for Prophet.
    """
    if api_url is None:
        api_url = os.environ.get("SCHEDULEBOX_API_URL")

    if api_url is not None:
        try:
            import httpx

            api_key = os.environ.get("AI_SERVICE_API_KEY", "")
            headers = {"x-ai-service-key": api_key} if api_key else {}
            response = httpx.get(
                f"{api_url}/api/internal/features/training/capacity",
                headers=headers,
                timeout=30.0,
            )
            if response.status_code == 200:
                data = response.json()
                df = pd.DataFrame(data)
                df["ds"] = pd.to_datetime(df["ds"])
                logger.info(f"Loaded {len(df)} hourly aggregates from API")
                return df
        except Exception as e:
            logger.info(f"API unavailable ({e}), falling back to synthetic data")

    return generate_synthetic_booking_counts()


def train_model(output_dir: str = "models") -> None:
    """
    Train the Prophet capacity model and save to disk.

    Uses CapacityForecaster.train() to fit a Prophet model on booking counts.
    Saves the trained model via joblib and updates metadata.json.

    Args:
        output_dir: Directory to save the trained model.
    """
    logger.info("Starting capacity model training")

    # Load training data
    df = load_training_data()

    if df.empty:
        logger.error("No training data available, aborting")
        return

    # Import model class
    from app.models.capacity import CapacityForecaster

    # Train Prophet model
    logger.info(f"Training Prophet model on {len(df)} data points")
    forecaster = CapacityForecaster.train(df)

    if forecaster.model is None:
        logger.error(
            "Failed to train capacity model "
            "(Prophet may not be installed)"
        )
        return

    # Save model using Prophet JSON serialization (NOT joblib)
    from prophet.serialize import model_to_json

    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, "capacity_v1.0.0.json")
    with open(model_path, "w") as f:
        json.dump(model_to_json(forecaster.model), f)
    logger.info(f"Capacity model saved to {model_path} (Prophet JSON)")

    # Write version sidecar
    date_range = f"{df['ds'].min()} to {df['ds'].max()}"
    n_points = len(df)
    write_meta_sidecar(model_path, "capacity_forecaster", n_points, date_range)

    # Print training summary
    logger.info(f"Training summary:")
    logger.info(f"  Date range: {date_range}")
    logger.info(f"  Total data points: {n_points}")
    logger.info(f"  Seasonality components: yearly, weekly, daily")
    logger.info(f"  Average demand: {df['y'].mean():.2f} bookings/hour")
    logger.info(f"  Peak demand: {df['y'].max():.0f} bookings/hour")

    # Update metadata.json
    metadata_path = os.path.join(output_dir, "metadata.json")
    try:
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        metadata = {"models": {}, "version_format": "v{major}.{minor}.{patch}"}

    now = datetime.now(timezone.utc).isoformat()
    metadata["models"]["capacity_forecaster"] = {
        "model_name": "capacity_forecaster",
        "model_version": "v1.0.0",
        "trained_at": now,
        "algorithm": "Prophet (time series forecasting)",
        "training_points": n_points,
        "date_range": date_range,
        "min_data": "12 weeks booking history",
        "retraining": "weekly",
        "status": "trained",
    }
    metadata["last_updated"] = now

    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Metadata updated")
    logger.info("Capacity model training complete")


if __name__ == "__main__":
    output = sys.argv[1] if len(sys.argv) > 1 else "models"
    train_model(output_dir=output)
