"""
Follow-up email prompt templates and token budget enforcement.

Provides 4 template types for personalized Czech email generation:
- post_visit: Warm follow-up after a customer visit
- re_engagement: Re-engage inactive customers
- upsell: Suggest complementary services
- birthday: Birthday congratulation with special offer

Token budget enforcement via tiktoken prevents cost explosion on large context.
"""

import logging
from collections import defaultdict
from typing import Optional

import tiktoken

logger = logging.getLogger(__name__)


# =============================================================================
# Prompt Templates
# =============================================================================

FOLLOW_UP_TEMPLATES: dict[str, dict[str, str]] = {
    "post_visit": {
        "system": (
            "You are a friendly marketing assistant for a Czech service business. "
            "Write a personalized follow-up email in Czech for a customer who recently visited. "
            "Keep the tone warm and personal. Include a subtle upsell if the customer data suggests it. "
            "Output JSON with 'subject' and 'body' fields. Body should be plain text with line breaks."
        ),
        "context_template": (
            "Customer name: {customer_name}\n"
            "Last visit: {last_visit_date}\n"
            "Service: {last_service}\n"
            "Total visits: {total_visits}\n"
            "Health score: {health_score}\n"
            "Preferred services: {preferred_services}\n"
            "Business name: {business_name}"
        ),
    },
    "re_engagement": {
        "system": (
            "You are a marketing assistant for a Czech service business. "
            "Write a re-engagement email in Czech for a customer who hasn't visited in a while. "
            "Be warm but not pushy. Mention what they're missing. "
            "Optionally include a time-limited offer. "
            "Output JSON with 'subject' and 'body' fields."
        ),
        "context_template": (
            "Customer name: {customer_name}\n"
            "Days inactive: {days_inactive}\n"
            "Preferred services: {preferred_services}\n"
            "Total visits: {total_visits}\n"
            "Total spent (CZK): {total_spent}\n"
            "Health score: {health_score} ({health_category})\n"
            "Business name: {business_name}"
        ),
    },
    "upsell": {
        "system": (
            "You are a marketing assistant for a Czech service business. "
            "Write an upsell email in Czech suggesting a complementary service. "
            "Reference the customer's history to make it personal. "
            "Output JSON with 'subject' and 'body' fields."
        ),
        "context_template": (
            "Customer name: {customer_name}\n"
            "Recent services: {preferred_services}\n"
            "Recommended service: {recommended_service}\n"
            "Recommendation reason: {recommendation_reason}\n"
            "Business name: {business_name}"
        ),
    },
    "birthday": {
        "system": (
            "You are a marketing assistant for a Czech service business. "
            "Write a birthday congratulation email in Czech with a special offer. "
            "Be celebratory and personal. Include a birthday discount or gift. "
            "Output JSON with 'subject' and 'body' fields."
        ),
        "context_template": (
            "Customer name: {customer_name}\n"
            "Total visits: {total_visits}\n"
            "Loyalty tier: {loyalty_tier}\n"
            "Preferred services: {preferred_services}\n"
            "Business name: {business_name}"
        ),
    },
}


def build_prompt(
    template_type: str,
    customer_context: dict,
) -> tuple[str, str]:
    """
    Build a (system_prompt, formatted_context) tuple from template and customer data.

    Uses format_map with a defaultdict so missing keys render as "N/A"
    instead of raising KeyError.

    Args:
        template_type: One of post_visit, re_engagement, upsell, birthday
        customer_context: Dict of customer data fields

    Returns:
        Tuple of (system_prompt, formatted_context_string)

    Raises:
        KeyError: If template_type is not in FOLLOW_UP_TEMPLATES
    """
    template = FOLLOW_UP_TEMPLATES[template_type]

    # Use defaultdict so missing context keys render as "N/A"
    safe_context: dict = defaultdict(lambda: "N/A")
    safe_context.update({k: str(v) if v is not None else "N/A" for k, v in customer_context.items()})

    formatted_context = template["context_template"].format_map(safe_context)

    return template["system"], formatted_context


def check_token_budget(
    system_prompt: str,
    context: str,
    model: str = "gpt-4o-mini",
    max_tokens: int = 2000,
) -> str:
    """
    Enforce token budget by truncating context if total prompt exceeds max_tokens.

    Uses tiktoken to count tokens accurately for the given model.
    Falls back to cl100k_base encoding if model-specific encoding not found.

    Args:
        system_prompt: The system prompt string
        context: The user context string (will be truncated if needed)
        model: OpenAI model name for accurate tokenization
        max_tokens: Maximum total prompt tokens allowed

    Returns:
        The (possibly truncated) context string
    """
    try:
        encoding = tiktoken.encoding_for_model(model)
    except KeyError:
        # Fallback to cl100k_base (used by GPT-4, GPT-4o-mini, etc.)
        encoding = tiktoken.get_encoding("cl100k_base")

    system_tokens = len(encoding.encode(system_prompt))
    context_tokens = len(encoding.encode(context))
    total = system_tokens + context_tokens

    if total <= max_tokens:
        return context

    # Calculate how many context tokens we can afford
    available_for_context = max_tokens - system_tokens
    if available_for_context <= 0:
        logger.warning(
            f"System prompt alone ({system_tokens} tokens) exceeds budget ({max_tokens}). "
            "Returning empty context."
        )
        return ""

    # Truncate context to fit within budget
    context_encoded = encoding.encode(context)
    truncated_encoded = context_encoded[:available_for_context]
    truncated_context = encoding.decode(truncated_encoded)

    logger.info(
        f"Token budget enforced: {total} -> {system_tokens + len(truncated_encoded)} tokens "
        f"(truncated {context_tokens - len(truncated_encoded)} context tokens)"
    )

    return truncated_context
