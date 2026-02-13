"""
Follow-up email generation router.

Generates personalized Czech follow-up emails using GPT-4o-mini.
Includes per-company daily rate limiting (50/day) and token budget enforcement.

Rate limiting uses Redis INCR + EXPIRE for atomic multi-process safety.
"""

import logging

from fastapi import APIRouter

from ..config import settings
from ..schemas.requests import FollowUpRequest
from ..schemas.responses import FollowUpResponse
from ..services.followup_prompts import (
    FOLLOW_UP_TEMPLATES,
    build_prompt,
    check_token_budget,
)
from ..services.openai_client import generate_followup_text
from ..services.feature_store import get_redis_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/followup", tags=["followup"])

# In-memory fallback counters when Redis is unavailable
# Format: {company_id: count}
_fallback_counts: dict[int, int] = {}


async def _check_rate_limit(company_id: int) -> bool:
    """
    Check if company has exceeded daily follow-up limit using Redis.

    Uses atomic INCR + EXPIRE to safely handle concurrent requests
    across multiple Uvicorn workers. Falls back to allowing requests
    if Redis is unavailable (fail-open for availability).
    """
    try:
        client = await get_redis_client()
        if client is None:
            # Redis unavailable — use in-memory fallback (degraded but not open)
            logger.warning("Redis unavailable for rate limiting, using in-memory fallback")
            _fallback_counts[company_id] = _fallback_counts.get(company_id, 0) + 1
            if _fallback_counts[company_id] > settings.MAX_FOLLOWUP_PER_DAY:
                return False
            return True

        key = f"ratelimit:followup:{company_id}"
        count = await client.incr(key)

        # Set expiry on first increment (start of new window)
        if count == 1:
            await client.expire(key, 86400)  # 24 hours

        if count > settings.MAX_FOLLOWUP_PER_DAY:
            return False

        return True
    except Exception as e:
        # Redis error — use in-memory fallback (degraded but not open)
        logger.warning(f"Rate limit check failed: {e}, using in-memory fallback")
        _fallback_counts[company_id] = _fallback_counts.get(company_id, 0) + 1
        if _fallback_counts[company_id] > settings.MAX_FOLLOWUP_PER_DAY:
            return False
        return True


@router.post("/generate", response_model=FollowUpResponse)
async def generate_followup(request: FollowUpRequest) -> FollowUpResponse:
    """
    Generate personalized follow-up email content using AI.

    Uses gpt-4o-mini for cost-effective email generation.
    Enforces token budget (2000 tokens max prompt) and daily rate limit per company.
    Returns subject + body in Czech.

    Four template types:
    - post_visit: Warm follow-up after customer visit
    - re_engagement: Re-engage inactive customers
    - upsell: Suggest complementary services
    - birthday: Birthday congratulation with special offer
    """
    # Rate limit check
    if not await _check_rate_limit(request.company_id):
        logger.warning(
            f"Rate limit exceeded for company {request.company_id} "
            f"({settings.MAX_FOLLOWUP_PER_DAY}/day)"
        )
        return FollowUpResponse(
            subject="",
            body="",
            error="rate_limit_exceeded",
            fallback=True,
        )

    # Validate template type
    if request.type not in FOLLOW_UP_TEMPLATES:
        logger.warning(f"Invalid template type: {request.type}")
        return FollowUpResponse(
            subject="",
            body="",
            error="invalid_template_type",
            fallback=True,
        )

    try:
        # Build prompt from template + customer context
        system_prompt, context = build_prompt(
            request.type,
            request.customer_context.model_dump(),
        )

        # Enforce token budget
        context = check_token_budget(
            system_prompt,
            context,
            model=settings.OPENAI_FOLLOWUP_MODEL,
        )

        # Generate with GPT-4o-mini
        result = await generate_followup_text(
            system_prompt=system_prompt,
            context=context,
        )

        logger.info(
            f"Follow-up generated for company {request.company_id}, "
            f"type={request.type}, tokens={result.get('tokens_used', 0)}"
        )

        return FollowUpResponse(
            subject=result["subject"],
            body=result["body"],
            model=result.get("model", settings.OPENAI_FOLLOWUP_MODEL),
            tokens_used=result.get("tokens_used", 0),
            fallback=False,
        )
    except Exception as e:
        logger.error(f"Follow-up generation failed: {e}")
        return FollowUpResponse(
            subject="",
            body="",
            error="generation_failed",
            fallback=True,
        )
