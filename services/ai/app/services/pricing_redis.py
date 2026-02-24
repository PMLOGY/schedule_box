"""
Redis-backed persistence for pricing optimizer MAB state.

Stores Thompson Sampling alpha/beta parameters per context key in Redis
so state survives Railway container restarts. Uses the same Redis connection
pattern as feature_store.py.
"""

import json
import logging

import redis.asyncio as aioredis

from ..config import settings

logger = logging.getLogger(__name__)
PRICING_STATE_KEY = "ai:pricing:mab_state"


async def load_pricing_state() -> dict:
    """Load MAB state from Redis. Returns empty dict on miss."""
    try:
        client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
        try:
            raw = await client.get(PRICING_STATE_KEY)
            if raw:
                state = json.loads(raw)
                logger.info(f"Loaded pricing MAB state from Redis ({len(state)} contexts)")
                return state
        finally:
            await client.aclose()
    except Exception as e:
        logger.warning(f"Failed to load pricing state from Redis: {e}")
    return {}


async def save_pricing_state(state: dict) -> None:
    """Persist MAB state to Redis (no TTL — permanent)."""
    try:
        client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
        try:
            await client.set(PRICING_STATE_KEY, json.dumps(state))
            logger.debug(f"Saved pricing MAB state to Redis ({len(state)} contexts)")
        finally:
            await client.aclose()
    except Exception as e:
        logger.warning(f"Failed to save pricing state to Redis: {e}")
