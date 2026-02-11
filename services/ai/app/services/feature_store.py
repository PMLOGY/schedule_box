"""
Redis-backed feature store for caching computed features.

Provides async caching for booking and customer features with configurable TTL.
Handles Redis unavailability gracefully (returns None, logs warning).
"""

import json
import logging
from typing import Optional

import redis.asyncio as redis

from ..config import settings

logger = logging.getLogger(__name__)

# Module-level Redis client (lazy-initialized)
_redis_client: Optional[redis.Redis] = None


async def get_redis_client() -> Optional[redis.Redis]:
    """
    Lazy-initialize and return the async Redis client.

    Returns None if connection fails (service runs without cache).
    """
    global _redis_client

    if _redis_client is not None:
        return _redis_client

    try:
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
        # Test connection
        await _redis_client.ping()
        logger.info(f"Redis feature store connected to {settings.REDIS_URL}")
        return _redis_client
    except Exception as e:
        logger.warning(f"Redis feature store connection failed: {e} - caching disabled")
        _redis_client = None
        return None


async def get_booking_features(booking_id: int) -> Optional[dict]:
    """
    Get cached booking features from Redis.

    Args:
        booking_id: Internal booking ID.

    Returns:
        Cached feature dict, or None if not cached or Redis unavailable.
    """
    try:
        client = await get_redis_client()
        if client is None:
            return None

        cached = await client.get(f"features:booking:{booking_id}")
        if cached is not None:
            logger.debug(f"Cache hit for booking features: {booking_id}")
            return json.loads(cached)

        logger.debug(f"Cache miss for booking features: {booking_id}")
        return None
    except Exception as e:
        logger.warning(f"Error reading booking features from Redis: {e}")
        return None


async def cache_booking_features(
    booking_id: int, features: dict, ttl: int = 3600
) -> None:
    """
    Cache booking features in Redis with TTL.

    Args:
        booking_id: Internal booking ID.
        features: Feature dictionary to cache.
        ttl: Time-to-live in seconds (default: 1 hour).
    """
    try:
        client = await get_redis_client()
        if client is None:
            return

        await client.set(
            f"features:booking:{booking_id}",
            json.dumps(features),
            ex=ttl,
        )
        logger.debug(f"Cached booking features for {booking_id} (TTL={ttl}s)")
    except Exception as e:
        logger.warning(f"Error caching booking features in Redis: {e}")


async def get_customer_features(customer_id: int) -> Optional[dict]:
    """
    Get cached customer features from Redis.

    Args:
        customer_id: Internal customer ID.

    Returns:
        Cached feature dict, or None if not cached or Redis unavailable.
    """
    try:
        client = await get_redis_client()
        if client is None:
            return None

        cached = await client.get(f"features:customer:{customer_id}")
        if cached is not None:
            logger.debug(f"Cache hit for customer features: {customer_id}")
            return json.loads(cached)

        logger.debug(f"Cache miss for customer features: {customer_id}")
        return None
    except Exception as e:
        logger.warning(f"Error reading customer features from Redis: {e}")
        return None


async def cache_customer_features(
    customer_id: int, features: dict, ttl: int = 3600
) -> None:
    """
    Cache customer features in Redis with TTL.

    Args:
        customer_id: Internal customer ID.
        features: Feature dictionary to cache.
        ttl: Time-to-live in seconds (default: 1 hour).
    """
    try:
        client = await get_redis_client()
        if client is None:
            return

        await client.set(
            f"features:customer:{customer_id}",
            json.dumps(features),
            ex=ttl,
        )
        logger.debug(f"Cached customer features for {customer_id} (TTL={ttl}s)")
    except Exception as e:
        logger.warning(f"Error caching customer features in Redis: {e}")


async def close() -> None:
    """Close Redis connection if open."""
    global _redis_client

    if _redis_client is not None:
        try:
            await _redis_client.aclose()
            logger.info("Redis feature store connection closed")
        except Exception as e:
            logger.warning(f"Error closing Redis connection: {e}")
        finally:
            _redis_client = None
