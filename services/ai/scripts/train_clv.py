"""
CLV Model Training Script

Trains a Random Forest regression model for predicting Customer Lifetime Value.
Uses synthetic data generation when real training data is not available.

Usage:
    python -m scripts.train_clv
    python scripts/train_clv.py
"""

import json
import logging
import math
import os
import sys
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Feature columns (must match CLVPredictor.FEATURE_COLUMNS)
FEATURE_COLUMNS = [
    "total_bookings",
    "total_spent",
    "avg_booking_value",
    "days_since_first_visit",
    "days_since_last_visit",
    "booking_frequency",
    "no_show_rate",
    "service_diversity",
]


def load_training_data(api_url: str = "http://localhost:3000") -> pd.DataFrame:
    """
    Load training data from the ScheduleBox API or generate synthetic data.

    Attempts to fetch real data from the internal features API endpoint.
    Falls back to synthetic data generation if the API is unavailable.

    Args:
        api_url: Base URL of the ScheduleBox API.

    Returns:
        DataFrame with feature columns and 'future_clv' target.
    """
    # Try to fetch from API
    try:
        import httpx

        response = httpx.get(
            f"{api_url}/api/internal/features/training/clv",
            timeout=30.0,
        )
        if response.status_code == 200:
            data = response.json()
            df = pd.DataFrame(data)
            logger.info(f"Loaded {len(df)} rows from API")
            return df
    except Exception as e:
        logger.info(f"API unavailable ({e}), generating synthetic training data")

    # Generate synthetic training data
    logger.info("Generating 500 synthetic training samples")
    rng = np.random.RandomState(42)
    n_samples = 500

    # Feature distributions based on realistic customer patterns
    total_bookings = rng.poisson(lam=8, size=n_samples)
    total_bookings = np.maximum(total_bookings, 1)  # At least 1 booking

    total_spent = rng.gamma(shape=2.0, scale=2500.0, size=n_samples)  # mean ~5000
    total_spent = np.maximum(total_spent, 100.0)  # Minimum spending

    avg_booking_value = total_spent / total_bookings

    days_since_first_visit = rng.uniform(30, 730, size=n_samples).astype(int)
    days_since_last_visit = rng.exponential(scale=30.0, size=n_samples)
    days_since_last_visit = np.minimum(
        days_since_last_visit, days_since_first_visit
    )

    booking_frequency = (total_bookings / days_since_first_visit) * 30  # per month
    no_show_rate = rng.beta(a=2, b=18, size=n_samples)  # mean ~0.1
    service_diversity = rng.poisson(lam=2, size=n_samples)
    service_diversity = np.maximum(service_diversity, 1)

    # Target: future_clv = total_spent * (1 + log(booking_frequency + 1)) * (1 - no_show_rate) + noise
    future_clv = (
        total_spent
        * (1.0 + np.log(booking_frequency + 1.0))
        * (1.0 - no_show_rate)
        + rng.normal(0, 500, size=n_samples)
    )
    future_clv = np.maximum(future_clv, 0.0)

    df = pd.DataFrame(
        {
            "total_bookings": total_bookings,
            "total_spent": total_spent,
            "avg_booking_value": avg_booking_value,
            "days_since_first_visit": days_since_first_visit,
            "days_since_last_visit": days_since_last_visit,
            "booking_frequency": booking_frequency,
            "no_show_rate": no_show_rate,
            "service_diversity": service_diversity,
            "future_clv": future_clv,
        }
    )

    logger.info(
        f"Synthetic data: {len(df)} rows, "
        f"CLV range: {df['future_clv'].min():.0f} - {df['future_clv'].max():.0f} CZK, "
        f"mean: {df['future_clv'].mean():.0f} CZK"
    )
    return df


def engineer_features(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """
    Extract feature columns in the correct order for training.

    Args:
        df: Raw training DataFrame.

    Returns:
        Tuple of (X features DataFrame, y target Series).
    """
    X = df[FEATURE_COLUMNS].copy()
    y = df["future_clv"].copy()

    # Fill any missing values with defaults
    defaults = {
        "total_bookings": 1,
        "total_spent": 500.0,
        "avg_booking_value": 500.0,
        "days_since_first_visit": 30,
        "days_since_last_visit": 30,
        "booking_frequency": 0.5,
        "no_show_rate": 0.0,
        "service_diversity": 1,
    }
    X = X.fillna(defaults)

    return X, y


def train_model(output_dir: str = "models") -> None:
    """
    Train the CLV prediction model and save to disk.

    Uses Random Forest regression with train/test split evaluation.
    Saves the trained model as a joblib file and updates metadata.json.

    Args:
        output_dir: Directory to save the trained model.
    """
    logger.info("Starting CLV model training")

    # Load and prepare data
    df = load_training_data()
    X, y = engineer_features(df)

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    logger.info(
        f"Training set: {len(X_train)} samples, Test set: {len(X_test)} samples"
    )

    # Random Forest model
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = r2_score(y_test, y_pred)

    logger.info(
        f"Test metrics: MAE={mae:.2f} CZK, RMSE={rmse:.2f} CZK, R2={r2:.4f}"
    )

    # Feature importance
    importance = dict(zip(FEATURE_COLUMNS, model.feature_importances_))
    sorted_importance = sorted(importance.items(), key=lambda x: x[1], reverse=True)
    logger.info("Feature importance:")
    for feature, imp in sorted_importance:
        logger.info(f"  {feature}: {imp:.4f}")

    # Train final model on all data
    model.fit(X, y)

    # Save model
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, "clv_v1.0.0.joblib")
    joblib.dump(model, model_path)
    logger.info(f"Model saved to {model_path}")

    # Update metadata.json
    metadata_path = os.path.join(output_dir, "metadata.json")
    try:
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        metadata = {"models": {}, "version_format": "v{major}.{minor}.{patch}"}

    metadata["models"]["clv_predictor"] = {
        "model_name": "clv_predictor",
        "model_version": "v1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "features": FEATURE_COLUMNS,
        "metrics": {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "r2": round(r2, 4),
        },
        "status": "trained",
    }
    metadata["last_updated"] = datetime.now(timezone.utc).isoformat()

    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Metadata updated")
    logger.info("CLV model training complete")


if __name__ == "__main__":
    # Allow passing custom model output directory
    output = sys.argv[1] if len(sys.argv) > 1 else "models"
    train_model(output_dir=output)
