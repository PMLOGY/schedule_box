"""
No-Show Model Training Script

Trains an XGBoost binary classifier for predicting booking no-show probability.
Uses synthetic data generation when real training data is not available.

Usage:
    python -m scripts.train_no_show
    python scripts/train_no_show.py
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import TimeSeriesSplit
from xgboost import XGBClassifier

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Feature columns (must match NoShowPredictor.FEATURE_COLUMNS)
FEATURE_COLUMNS = [
    "booking_lead_time_hours",
    "customer_no_show_rate",
    "customer_total_bookings",
    "day_of_week",
    "hour_of_day",
    "is_weekend",
    "service_duration_minutes",
    "service_price",
    "is_first_visit",
    "has_payment",
    "days_since_last_visit",
]


def load_training_data(api_url: str = "http://localhost:3000") -> pd.DataFrame:
    """
    Load training data from the ScheduleBox API or generate synthetic data.

    Attempts to fetch real data from the internal features API endpoint.
    Falls back to synthetic data generation if the API is unavailable.

    Args:
        api_url: Base URL of the ScheduleBox API.

    Returns:
        DataFrame with feature columns and 'no_show' target.
    """
    # Try to fetch from API
    try:
        import httpx

        response = httpx.get(
            f"{api_url}/api/internal/features/training/no-show",
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

    # Feature distributions based on realistic booking patterns
    booking_lead_time_hours = rng.exponential(scale=48.0, size=n_samples)
    customer_no_show_rate = rng.beta(a=2, b=15, size=n_samples)  # mean ~0.12
    customer_total_bookings = rng.poisson(lam=5, size=n_samples)
    day_of_week = rng.randint(0, 7, size=n_samples)
    hour_of_day = np.clip(rng.normal(loc=14, scale=3, size=n_samples), 6, 22).astype(
        int
    )
    is_weekend = (day_of_week >= 5).astype(int)
    service_duration_minutes = rng.choice(
        [30, 45, 60, 90, 120], size=n_samples, p=[0.2, 0.25, 0.3, 0.15, 0.1]
    )
    service_price = rng.uniform(300, 3000, size=n_samples)
    is_first_visit = rng.binomial(1, 0.3, size=n_samples)
    has_payment = rng.binomial(1, 0.6, size=n_samples)
    days_since_last_visit = rng.exponential(scale=30.0, size=n_samples)

    # Target: no_show based on realistic probability model
    # P(no_show) = sigmoid(customer_no_show_rate * 3 + is_first_visit * 0.5
    #              - has_payment * 1.0 + noise)
    logit = (
        customer_no_show_rate * 3.0
        + is_first_visit * 0.5
        - has_payment * 1.0
        - 0.5  # bias term to center probability
        + rng.normal(0, 0.3, size=n_samples)
    )
    no_show_probability = 1.0 / (1.0 + np.exp(-logit))
    no_show = rng.binomial(1, no_show_probability)

    df = pd.DataFrame(
        {
            "booking_lead_time_hours": booking_lead_time_hours,
            "customer_no_show_rate": customer_no_show_rate,
            "customer_total_bookings": customer_total_bookings,
            "day_of_week": day_of_week,
            "hour_of_day": hour_of_day,
            "is_weekend": is_weekend,
            "service_duration_minutes": service_duration_minutes,
            "service_price": service_price,
            "is_first_visit": is_first_visit,
            "has_payment": has_payment,
            "days_since_last_visit": days_since_last_visit,
            "no_show": no_show,
        }
    )

    logger.info(
        f"Synthetic data: {len(df)} rows, "
        f"no-show rate: {df['no_show'].mean():.3f}"
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
    y = df["no_show"].copy()

    # Fill any missing values with defaults
    defaults = {
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
    X = X.fillna(defaults)

    return X, y


def train_model(output_dir: str = "models") -> None:
    """
    Train the no-show prediction model and save to disk.

    Uses XGBoost with TimeSeriesSplit cross-validation.
    Saves the trained model as a joblib file and updates metadata.json.

    Args:
        output_dir: Directory to save the trained model.
    """
    logger.info("Starting no-show model training")

    # Load and prepare data
    df = load_training_data()
    X, y = engineer_features(df)

    # Calculate class imbalance ratio
    n_positive = y.sum()
    n_negative = len(y) - n_positive
    scale_pos_weight = n_negative / max(n_positive, 1)

    logger.info(
        f"Class distribution: {n_positive} positive ({n_positive/len(y)*100:.1f}%), "
        f"{n_negative} negative ({n_negative/len(y)*100:.1f}%), "
        f"scale_pos_weight={scale_pos_weight:.2f}"
    )

    # XGBoost parameters
    model = XGBClassifier(
        objective="binary:logistic",
        eval_metric="auc",
        max_depth=6,
        learning_rate=0.1,
        n_estimators=100,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        use_label_encoder=False,
    )

    # Cross-validation with TimeSeriesSplit
    tscv = TimeSeriesSplit(n_splits=3)
    cv_metrics = {"auc": [], "precision": [], "recall": [], "f1": []}

    for fold_idx, (train_idx, val_idx) in enumerate(tscv.split(X)):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

        model.fit(X_train, y_train)

        y_pred_proba = model.predict_proba(X_val)[:, 1]
        y_pred = (y_pred_proba >= 0.5).astype(int)

        auc = roc_auc_score(y_val, y_pred_proba)
        precision = precision_score(y_val, y_pred, zero_division=0)
        recall = recall_score(y_val, y_pred, zero_division=0)
        f1 = f1_score(y_val, y_pred, zero_division=0)

        cv_metrics["auc"].append(auc)
        cv_metrics["precision"].append(precision)
        cv_metrics["recall"].append(recall)
        cv_metrics["f1"].append(f1)

        logger.info(
            f"Fold {fold_idx + 1}: AUC={auc:.4f}, "
            f"Precision={precision:.4f}, Recall={recall:.4f}, F1={f1:.4f}"
        )

    # Train final model on all data
    model.fit(X, y)

    # Calculate average metrics
    avg_metrics = {k: float(np.mean(v)) for k, v in cv_metrics.items()}
    logger.info(
        f"Average metrics: AUC={avg_metrics['auc']:.4f}, "
        f"Precision={avg_metrics['precision']:.4f}, "
        f"Recall={avg_metrics['recall']:.4f}, "
        f"F1={avg_metrics['f1']:.4f}"
    )

    # Save model
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, "no_show_v1.0.0.joblib")
    joblib.dump(model, model_path)
    logger.info(f"Model saved to {model_path}")

    # Update metadata.json
    metadata_path = os.path.join(output_dir, "metadata.json")
    try:
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        metadata = {"models": {}, "version_format": "v{major}.{minor}.{patch}"}

    metadata["models"]["no_show_predictor"] = {
        "model_name": "no_show_predictor",
        "model_version": "v1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "features": FEATURE_COLUMNS,
        "metrics": {
            "auc": round(avg_metrics["auc"], 4),
            "precision": round(avg_metrics["precision"], 4),
            "recall": round(avg_metrics["recall"], 4),
            "f1": round(avg_metrics["f1"], 4),
        },
        "status": "trained",
    }
    metadata["last_updated"] = datetime.now(timezone.utc).isoformat()

    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Metadata updated")
    logger.info("No-show model training complete")


if __name__ == "__main__":
    # Allow passing custom model output directory
    output = sys.argv[1] if len(sys.argv) > 1 else "models"
    train_model(output_dir=output)
