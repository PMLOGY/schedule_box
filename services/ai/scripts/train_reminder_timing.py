"""
Reminder Timing Optimization Training Script

Runs Bayesian optimization to find optimal reminder send times per customer cluster.
Generates synthetic notification data reflecting realistic open rate patterns.
Uses synthetic data generation when real notification history is not available.

Usage:
    python -m scripts.train_reminder_timing
    python scripts/train_reminder_timing.py
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone

import numpy as np

# Add parent directory to sys.path for model class imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def generate_synthetic_notification_data(n_customers: int = 100) -> list[dict]:
    """
    Generate synthetic notification engagement data.

    Models realistic patterns:
    - Most customers open notifications sent 2-4 hours before appointment
    - SMS has higher open rate (~85%) than email (~45%)
    - Some customers prefer morning notifications (reminder day before)
    - Open rates decay for very early or very late reminders

    Args:
        n_customers: Number of customers to simulate.

    Returns:
        List of dicts with customer_id, channel, minutes_before, and was_opened keys.
    """
    rng = np.random.RandomState(42)
    records = []

    for customer_id in range(1, n_customers + 1):
        # Each customer has 5-20 notification records
        n_notifications = rng.randint(5, 21)

        # Customer preferences (latent):
        # - preferred_minutes: their ideal notification time
        # - channel_sensitivity: how much channel matters to them
        preferred_minutes = rng.choice([
            120,   # 2 hours before (quick reminder people)
            240,   # 4 hours before (most common)
            480,   # 8 hours before (day-of planners)
            1440,  # 24 hours before (advance planners)
        ], p=[0.25, 0.35, 0.25, 0.15])

        for _ in range(n_notifications):
            # Channel selection
            channel = rng.choice(["email", "sms"], p=[0.6, 0.4])

            # Minutes before was varied by the system
            minutes_before = int(rng.choice([
                30, 60, 120, 180, 240, 360, 480, 720, 1440, 2880,
            ]))

            # Calculate open probability based on:
            # 1. Distance from preferred time
            distance = abs(minutes_before - preferred_minutes) / preferred_minutes
            time_factor = np.exp(-distance * 1.5)  # Gaussian-like decay

            # 2. Channel effect
            if channel == "sms":
                channel_factor = 0.85  # SMS has high open rate
            else:
                channel_factor = 0.45  # Email has lower open rate

            # 3. Base open rate combines factors
            open_probability = time_factor * channel_factor

            # Add noise and clamp
            open_probability = np.clip(
                open_probability + rng.normal(0, 0.05), 0.05, 0.95
            )

            was_opened = bool(rng.random() < open_probability)

            records.append({
                "customer_id": customer_id,
                "channel": channel,
                "minutes_before": minutes_before,
                "was_opened": was_opened,
            })

    logger.info(
        f"Generated {len(records)} notification records "
        f"for {n_customers} customers"
    )

    # Log open rates by channel
    email_records = [r for r in records if r["channel"] == "email"]
    sms_records = [r for r in records if r["channel"] == "sms"]
    email_open_rate = (
        sum(1 for r in email_records if r["was_opened"]) / len(email_records)
        if email_records else 0
    )
    sms_open_rate = (
        sum(1 for r in sms_records if r["was_opened"]) / len(sms_records)
        if sms_records else 0
    )
    logger.info(
        f"Open rates: email={email_open_rate:.2%}, sms={sms_open_rate:.2%}"
    )

    return records


def load_training_data(api_url: str | None = None) -> list[dict]:
    """
    Load notification data from the ScheduleBox API or generate synthetic data.

    Args:
        api_url: Base URL of the ScheduleBox API. If None, uses synthetic data.

    Returns:
        List of notification dicts with customer_id, channel, minutes_before,
        and was_opened keys.
    """
    if api_url is not None:
        try:
            import httpx

            response = httpx.get(
                f"{api_url}/api/internal/features/training/reminder-timing",
                timeout=30.0,
            )
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Loaded {len(data)} notification records from API")
                return data
        except Exception as e:
            logger.info(f"API unavailable ({e}), falling back to synthetic data")

    return generate_synthetic_notification_data()


def train_model(output_dir: str = "models") -> None:
    """
    Run Bayesian optimization on notification data and save optimal timings.

    Uses ReminderTimingOptimizer.optimize_from_data() to find optimal
    reminder timing per customer cluster. Saves results as JSON.

    Args:
        output_dir: Directory to save the optimized timings.
    """
    logger.info("Starting reminder timing optimization")

    # Load training data
    api_url = os.environ.get("SCHEDULEBOX_API_URL")
    data = load_training_data(api_url=api_url)

    if not data:
        logger.error("No notification data available, aborting")
        return

    # Import model class
    from app.models.reminder_timing import ReminderTimingOptimizer

    # Run Bayesian optimization
    logger.info(f"Running optimization on {len(data)} notification records")
    optimizer = ReminderTimingOptimizer.optimize_from_data(data)

    # Save optimized timings
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "reminder_timing.json")
    optimizer.save(output_path)
    logger.info(f"Reminder timing saved to {output_path}")

    # Print summary
    n_clusters = len(optimizer.optimal_timings)
    if n_clusters > 0:
        avg_minutes = np.mean([
            t["minutes"] for t in optimizer.optimal_timings.values()
        ])
        avg_open_rate = np.mean([
            t.get("open_rate", 0) for t in optimizer.optimal_timings.values()
        ])
    else:
        avg_minutes = ReminderTimingOptimizer.DEFAULT_MINUTES
        avg_open_rate = 0.0

    logger.info(f"Summary:")
    logger.info(f"  Customer clusters optimized: {n_clusters}")
    logger.info(f"  Average optimal timing: {avg_minutes:.0f} minutes before")
    logger.info(f"  Average expected open rate: {avg_open_rate:.2%}")

    # Show sample timings
    sample_keys = list(optimizer.optimal_timings.keys())[:10]
    if sample_keys:
        logger.info("Sample optimized timings:")
        for key in sample_keys:
            timing = optimizer.optimal_timings[key]
            logger.info(
                f"  {key}: {timing['minutes']} min, "
                f"open_rate={timing.get('open_rate', 0):.3f}, "
                f"confidence={timing.get('confidence', 0):.3f}"
            )

    # Update metadata.json
    metadata_path = os.path.join(output_dir, "metadata.json")
    try:
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        metadata = {"models": {}, "version_format": "v{major}.{minor}.{patch}"}

    now = datetime.now(timezone.utc).isoformat()
    metadata["models"]["reminder_timing"] = {
        "model_name": "reminder_timing",
        "model_version": "v1.0.0",
        "trained_at": now,
        "algorithm": "Bayesian Optimization (Gaussian Process)",
        "n_clusters_optimized": n_clusters,
        "avg_optimal_minutes": round(avg_minutes, 0),
        "min_data": "50 completed bookings with notification tracking",
        "retraining": "weekly",
        "fallback": "1440 minutes (24 hours)",
        "status": "trained",
    }
    metadata["last_updated"] = now

    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Metadata updated")
    logger.info("Reminder timing optimization complete")


if __name__ == "__main__":
    output = sys.argv[1] if len(sys.argv) > 1 else "models"
    train_model(output_dir=output)
