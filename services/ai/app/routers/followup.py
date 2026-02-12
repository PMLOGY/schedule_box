"""
Follow-up email generation router.

Generates personalized Czech follow-up emails using GPT-4o-mini.
Includes per-company daily rate limiting (50/day) and token budget enforcement.

Rate limiting uses in-memory state (single process). For production
multi-process deployment, replace with Redis-based rate limiting.
"""

import datetime
import json
import logging
from collections import defaultdict

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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/followup", tags=["followup"])


# =============================================================================
# In-memory rate limiter (per company, per day)
# For production multi-process deployment, use Redis-based rate limiting.
# =============================================================================

_rate_limits: dict[str, int] = defaultdict(int)
_rate_limit_day: str = ""


def _check_rate_limit(company_id: int) -> bool:
    """
    Check if company has exceeded daily follow-up limit.

    Resets counters at midnight (date change). Returns False if
    company has exceeded MAX_FOLLOWUP_PER_DAY (default: 50).
    """
    global _rate_limits, _rate_limit_day

    today = datetime.date.today().isoformat()
    if _rate_limit_day != today:
        _rate_limits.clear()
        _rate_limit_day = today

    key = str(company_id)
    if _rate_limits[key] >= settings.MAX_FOLLOWUP_PER_DAY:
        return False

    _rate_limits[key] += 1
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
    if not _check_rate_limit(request.company_id):
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
