"""
Pricing MAB State Initialization Script

Initializes Thompson Sampling multi-armed bandit state with informative priors
for dynamic service pricing. Generates synthetic pricing observations reflecting
realistic booking patterns across different time contexts.

Usage:
    python -m scripts.train_pricing
    python scripts/train_pricing.py
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

# Number of price arms matching PricingOptimizer.N_ARMS
N_ARMS = 5


def generate_synthetic_pricing_data(n_services: int = 15) -> dict:
    """
    Generate synthetic pricing observations across time contexts.

    Creates MAB state dict with alpha/beta priors reflecting realistic patterns:
    - Popular hours (10am-2pm): higher base success rate (mid-to-high prices work)
    - Low-demand times (early morning, late evening): lower prices perform better
    - Weekend vs weekday differences
    - Utilization-dependent pricing sensitivity

    Instead of flat priors (alpha=1, beta=1), uses informative priors reflecting
    domain knowledge about Czech/Slovak SMB booking patterns.

    Args:
        n_services: Number of services to generate state for.

    Returns:
        Dict with context keys mapping to alpha/beta prior arrays.
    """
    rng = np.random.RandomState(42)
    state = {}

    for service_id in range(1, n_services + 1):
        for day in range(7):  # 0=Monday, 6=Sunday
            is_weekend = day >= 5

            for hour_block in range(6):  # 0-5, each covers 4 hours
                # Map hour_block to actual hours:
                # 0: 0-3 (night), 1: 4-7 (early morning),
                # 2: 8-11 (morning), 3: 12-15 (afternoon),
                # 4: 16-19 (evening), 5: 20-23 (late evening)

                for util_bucket in ["low", "mid", "high"]:
                    context_key = (
                        f"{service_id}:{day}:{hour_block}:{util_bucket}"
                    )

                    # Base prior strength (observations)
                    # Informative priors, not flat
                    alpha = [2.0] * N_ARMS  # success counts
                    beta = [2.0] * N_ARMS   # failure counts

                    # --- Time-of-day effects ---

                    # Peak hours (blocks 2-3: 8am-3pm): mid-to-high prices
                    if hour_block in (2, 3):
                        # Higher prices work during peak hours
                        # Arms: 0=lowest, 4=highest
                        alpha = [2.0, 3.0, 5.0, 4.0, 3.0]
                        beta = [4.0, 3.0, 2.0, 3.0, 4.0]

                    # Low demand (blocks 0,1,5: night/early/late)
                    elif hour_block in (0, 1, 5):
                        # Lower prices perform better during off-peak
                        alpha = [5.0, 4.0, 3.0, 2.0, 1.0]
                        beta = [2.0, 3.0, 4.0, 5.0, 6.0]

                    # Moderate hours (block 4: 4pm-7pm)
                    else:
                        # Balanced pricing works
                        alpha = [3.0, 4.0, 4.0, 3.0, 2.0]
                        beta = [3.0, 3.0, 3.0, 3.0, 4.0]

                    # --- Weekend adjustment ---
                    if is_weekend:
                        # Weekends: slightly higher prices accepted
                        # Shift success mass toward higher arms
                        alpha = [
                            max(1.0, a - 0.5) if i < 2 else a + 0.5
                            for i, a in enumerate(alpha)
                        ]

                    # --- Utilization effects ---
                    if util_bucket == "high":
                        # High utilization: premium pricing accepted
                        alpha = [
                            max(1.0, a - 1.0) if i < 2 else a + 1.0
                            for i, a in enumerate(alpha)
                        ]
                    elif util_bucket == "low":
                        # Low utilization: discount pricing works
                        alpha = [
                            a + 1.0 if i < 2 else max(1.0, a - 0.5)
                            for i, a in enumerate(alpha)
                        ]

                    # Add small random noise for variety
                    alpha = [
                        round(max(1.0, a + rng.normal(0, 0.3)), 1)
                        for a in alpha
                    ]
                    beta = [
                        round(max(1.0, b + rng.normal(0, 0.3)), 1)
                        for b in beta
                    ]

                    state[context_key] = {
                        "alpha": alpha,
                        "beta": beta,
                    }

    n_contexts = len(state)
    total_obs = sum(
        sum(v["alpha"]) + sum(v["beta"]) - 2 * N_ARMS
        for v in state.values()
    )
    logger.info(
        f"Generated pricing state for {n_services} services: "
        f"{n_contexts} contexts, ~{total_obs:.0f} total prior observations"
    )
    return state


def load_training_data(api_url: str | None = None) -> dict:
    """
    Load pricing data from the ScheduleBox API or generate synthetic state.

    Args:
        api_url: Base URL of the ScheduleBox API. If None, uses synthetic data.

    Returns:
        Dict with context keys mapping to alpha/beta prior arrays.
    """
    if api_url is not None:
        try:
            import httpx

            response = httpx.get(
                f"{api_url}/api/internal/features/training/pricing",
                timeout=30.0,
            )
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Loaded pricing state with {len(data)} contexts from API")
                return data
        except Exception as e:
            logger.info(f"API unavailable ({e}), falling back to synthetic data")

    return generate_synthetic_pricing_data()


def train_model(output_dir: str = "models") -> None:
    """
    Initialize the pricing MAB state and save to disk.

    Generates informative priors for Thompson Sampling based on realistic
    booking patterns and saves the state as a JSON file.

    Args:
        output_dir: Directory to save the pricing state.
    """
    logger.info("Starting pricing model initialization")

    # Load or generate state
    api_url = os.environ.get("SCHEDULEBOX_API_URL")
    state = load_training_data(api_url=api_url)

    if not state:
        logger.error("No pricing state generated, aborting")
        return

    # Save state
    os.makedirs(output_dir, exist_ok=True)
    state_path = os.path.join(output_dir, "pricing_state.json")
    with open(state_path, "w") as f:
        json.dump(state, f, indent=2)
    logger.info(f"Pricing state saved to {state_path}")

    # Print summary
    n_contexts = len(state)
    total_alpha = sum(sum(v["alpha"]) for v in state.values())
    total_beta = sum(sum(v["beta"]) for v in state.values())
    total_observations = total_alpha + total_beta - 2 * N_ARMS * n_contexts

    logger.info(f"Summary:")
    logger.info(f"  Number of contexts: {n_contexts}")
    logger.info(f"  Total alpha (successes): {total_alpha:.0f}")
    logger.info(f"  Total beta (failures): {total_beta:.0f}")
    logger.info(f"  Total prior observations: {total_observations:.0f}")
    logger.info(f"  Arms per context: {N_ARMS}")

    # Show sample contexts
    sample_keys = list(state.keys())[:5]
    logger.info("Sample contexts:")
    for key in sample_keys:
        ctx = state[key]
        logger.info(f"  {key}: alpha={ctx['alpha']}, beta={ctx['beta']}")

    # Update metadata.json
    metadata_path = os.path.join(output_dir, "metadata.json")
    try:
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        metadata = {"models": {}, "version_format": "v{major}.{minor}.{patch}"}

    now = datetime.now(timezone.utc).isoformat()
    metadata["models"]["pricing_optimizer"] = {
        "model_name": "pricing_optimizer",
        "model_version": "v1.0.0",
        "trained_at": now,
        "algorithm": "Thompson Sampling (Multi-Armed Bandit)",
        "n_contexts": n_contexts,
        "n_arms": N_ARMS,
        "constraints": "30% daily price change limit",
        "retraining": "continuous (reward updates)",
        "status": "trained",
    }
    metadata["last_updated"] = now

    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Metadata updated")
    logger.info("Pricing model initialization complete")


if __name__ == "__main__":
    output = sys.argv[1] if len(sys.argv) > 1 else "models"
    train_model(output_dir=output)
