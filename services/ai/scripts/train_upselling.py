"""
Upselling Similarity Matrix Training Script

Trains an item-based collaborative filtering model for service upselling recommendations.
Builds a cosine similarity matrix from customer-service booking interactions.
Uses synthetic data generation when real training data is not available.

Usage:
    python -m scripts.train_upselling
    python scripts/train_upselling.py
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone

import joblib
import numpy as np

# Add parent directory to sys.path for model class imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def generate_synthetic_bookings(
    n_customers: int = 200, n_services: int = 15
) -> list[dict]:
    """
    Generate realistic synthetic booking data with customer-service frequency patterns.

    Creates "affinity groups" of 3-4 services that are frequently booked together
    by the same customers (e.g., haircut + coloring, massage + facial).

    Args:
        n_customers: Number of unique customers to simulate.
        n_services: Number of unique services to simulate.

    Returns:
        List of dicts with customer_id, service_id, and count keys.
    """
    rng = np.random.RandomState(42)

    # Define affinity groups (services that are commonly booked together)
    # Each group has 3-4 related services
    affinity_groups = [
        [1, 2, 3],        # e.g., haircut, coloring, styling
        [4, 5, 6, 7],     # e.g., facial, massage, body wrap, scrub
        [8, 9, 10],       # e.g., manicure, pedicure, nail art
        [11, 12, 13, 14], # e.g., waxing, eyebrow shaping, lash tint, eyelash ext
    ]

    # Ensure all service IDs up to n_services are covered
    remaining_services = [
        s for s in range(1, n_services + 1)
        if not any(s in g for g in affinity_groups)
    ]
    if remaining_services:
        affinity_groups.append(remaining_services)

    bookings = []

    for customer_id in range(1, n_customers + 1):
        # Each customer has a primary affinity group (70% of their bookings)
        primary_group_idx = rng.randint(0, len(affinity_groups))
        primary_group = affinity_groups[primary_group_idx]

        # Number of distinct services this customer books (2-8)
        n_booked_services = rng.randint(2, min(9, n_services + 1))

        # 70% from primary affinity group, 30% random
        n_primary = max(1, int(n_booked_services * 0.7))
        n_random = n_booked_services - n_primary

        # Select services from primary group
        primary_services = rng.choice(
            primary_group,
            size=min(n_primary, len(primary_group)),
            replace=False,
        ).tolist()

        # Select random services from other groups
        other_services = [
            s for s in range(1, n_services + 1) if s not in primary_group
        ]
        if other_services and n_random > 0:
            random_services = rng.choice(
                other_services,
                size=min(n_random, len(other_services)),
                replace=False,
            ).tolist()
        else:
            random_services = []

        # Generate booking counts per service
        selected_services = primary_services + random_services
        for service_id in selected_services:
            # Primary group services are booked more frequently
            if service_id in primary_group:
                count = int(rng.poisson(lam=5) + 1)  # Mean ~5 bookings
            else:
                count = int(rng.poisson(lam=2) + 1)  # Mean ~2 bookings

            bookings.append({
                "customer_id": customer_id,
                "service_id": int(service_id),
                "count": count,
            })

    logger.info(
        f"Generated {len(bookings)} booking records "
        f"for {n_customers} customers and {n_services} services"
    )
    return bookings


def load_training_data(api_url: str | None = None) -> list[dict]:
    """
    Load training data from the ScheduleBox API or generate synthetic data.

    Args:
        api_url: Base URL of the ScheduleBox API. If None, uses synthetic data.

    Returns:
        List of dicts with customer_id, service_id, and count keys.
    """
    if api_url is not None:
        try:
            import httpx

            response = httpx.get(
                f"{api_url}/api/internal/features/training/upselling",
                timeout=30.0,
            )
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Loaded {len(data)} booking records from API")
                return data
        except Exception as e:
            logger.info(f"API unavailable ({e}), falling back to synthetic data")

    return generate_synthetic_bookings()


def train_model(output_dir: str = "models") -> None:
    """
    Train the upselling similarity matrix model and save to disk.

    Builds a cosine similarity matrix from customer-service booking interactions
    using UpsellRecommender.build_from_bookings(). Saves the model as a joblib
    file and updates metadata.json.

    Args:
        output_dir: Directory to save the trained model.
    """
    logger.info("Starting upselling model training")

    # Load training data
    api_url = os.environ.get("SCHEDULEBOX_API_URL")
    data = load_training_data(api_url=api_url)

    if not data:
        logger.error("No training data available, aborting")
        return

    # Import model class
    from app.models.upselling import UpsellRecommender

    # Build similarity matrix from booking data
    logger.info(f"Building similarity matrix from {len(data)} booking records")
    recommender = UpsellRecommender.build_from_bookings(data)

    if recommender.similarity_matrix is None:
        logger.error("Failed to build similarity matrix")
        return

    # Prepare model artifact
    model_data = {
        "similarity_matrix": recommender.similarity_matrix,
        "service_ids": recommender.service_ids,
        "popularity_fallback": recommender.popularity_fallback,
    }

    # Save model
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, "upselling_v1.0.0.joblib")
    joblib.dump(model_data, model_path)
    logger.info(f"Upselling model saved to {model_path}")

    # Print model dimensions
    n_services = len(recommender.service_ids)
    logger.info(f"Model dimensions: {n_services}x{n_services} similarity matrix")
    logger.info(f"Service IDs: {recommender.service_ids}")
    logger.info(f"Popularity fallback (top 10): {recommender.popularity_fallback}")

    # Print top service pairs by similarity
    sim = recommender.similarity_matrix
    pairs = []
    for i in range(n_services):
        for j in range(i + 1, n_services):
            pairs.append((
                recommender.service_ids[i],
                recommender.service_ids[j],
                float(sim[i, j]),
            ))
    pairs.sort(key=lambda x: x[2], reverse=True)

    logger.info("Top 10 most similar service pairs:")
    for s1, s2, score in pairs[:10]:
        logger.info(f"  Service {s1} <-> Service {s2}: {score:.4f}")

    # Update metadata.json
    metadata_path = os.path.join(output_dir, "metadata.json")
    try:
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        metadata = {"models": {}, "version_format": "v{major}.{minor}.{patch}"}

    now = datetime.now(timezone.utc).isoformat()
    metadata["models"]["upselling_recommender"] = {
        "model_name": "upselling_recommender",
        "model_version": "v1.0.0",
        "trained_at": now,
        "algorithm": "item-based collaborative filtering (cosine similarity)",
        "dimensions": f"{n_services}x{n_services}",
        "training_records": len(data),
        "min_data": "100 customers, 10 services",
        "retraining": "weekly",
        "status": "trained",
    }
    metadata["last_updated"] = now

    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Metadata updated")
    logger.info("Upselling model training complete")


if __name__ == "__main__":
    output = sys.argv[1] if len(sys.argv) > 1 else "models"
    train_model(output_dir=output)
