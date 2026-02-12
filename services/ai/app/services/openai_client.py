"""
OpenAI client singleton for voice transcription and GPT-4 NLU.

Provides shared async OpenAI client with functions for:
- Audio transcription via Whisper
- Intent extraction via GPT-4 Structured Outputs
- Follow-up text generation via GPT-4o-mini

All functions raise on error (caller handles fallback).
"""

import io
import json
import logging
from typing import Optional

from openai import AsyncOpenAI

from ..config import settings

logger = logging.getLogger(__name__)

# Module-level singleton (lazy init)
_client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
    """
    Returns the shared async OpenAI client singleton.

    Raises ValueError if OPENAI_API_KEY is not configured.
    """
    global _client

    if _client is not None:
        return _client

    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not configured - OpenAI features will fail when called")
        raise ValueError(
            "OPENAI_API_KEY is not configured. Set the OPENAI_API_KEY environment variable "
            "to enable voice booking, follow-up generation, and intent extraction features."
        )

    _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    logger.info("OpenAI async client initialized")
    return _client


async def transcribe_audio(
    audio_bytes: bytes,
    filename: str,
    language: str = "cs",
    model: str = "whisper-1",
) -> str:
    """
    Transcribe audio bytes using OpenAI Whisper.

    Args:
        audio_bytes: Raw audio file bytes
        filename: Original filename (used for format detection)
        language: ISO language code (default: cs for Czech)
        model: Whisper model to use

    Returns:
        Transcription text string

    Raises:
        ValueError: If OPENAI_API_KEY is not configured
        openai.APIError: On API failure
    """
    client = get_openai_client()

    # Create file-like object for the API
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    transcription = await client.audio.transcriptions.create(
        model=model,
        file=audio_file,
        language=language,
        prompt="Dobry den, chtela bych si objednat termin.",  # Czech context hint
    )

    logger.info(f"Audio transcribed: {len(transcription.text)} chars, language={language}")
    return transcription.text


async def extract_intent(
    transcript: str,
    model: Optional[str] = None,
) -> dict:
    """
    Extract booking intent and entities from a transcript using GPT-4 Structured Outputs.

    Args:
        transcript: Transcribed text from voice input
        model: Override model (defaults to settings.OPENAI_MODEL)

    Returns:
        Dict with keys: intent, entities, confidence, raw_interpretation

    Raises:
        ValueError: If OPENAI_API_KEY is not configured
        openai.APIError: On API failure
    """
    client = get_openai_client()
    use_model = model or settings.OPENAI_MODEL

    system_prompt = (
        "You are a Czech/Slovak booking assistant. Extract the booking intent and entities "
        "from the following voice transcript. Interpret Czech date expressions like "
        "'pristi pondeli' (next Monday), 'zitra' (tomorrow), 'za tyden' (in a week). "
        "Respond in strict JSON format."
    )

    # JSON schema for structured output
    response_schema = {
        "type": "object",
        "properties": {
            "intent": {
                "type": "string",
                "enum": ["create_booking", "cancel_booking", "check_availability", "unknown"],
            },
            "entities": {
                "type": "object",
                "properties": {
                    "service_name": {"type": ["string", "null"]},
                    "date": {"type": ["string", "null"], "description": "ISO date format YYYY-MM-DD"},
                    "time": {"type": ["string", "null"], "description": "Time in HH:MM format"},
                    "employee_name": {"type": ["string", "null"]},
                    "customer_name": {"type": ["string", "null"]},
                    "customer_phone": {"type": ["string", "null"]},
                },
                "required": [
                    "service_name",
                    "date",
                    "time",
                    "employee_name",
                    "customer_name",
                    "customer_phone",
                ],
                "additionalProperties": False,
            },
            "confidence": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0,
            },
            "raw_interpretation": {
                "type": "string",
                "description": "Brief human-readable interpretation of the transcript",
            },
        },
        "required": ["intent", "entities", "confidence", "raw_interpretation"],
        "additionalProperties": False,
    }

    response = await client.chat.completions.create(
        model=use_model,
        temperature=0.1,  # Deterministic extraction
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": transcript},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "booking_intent",
                "strict": True,
                "schema": response_schema,
            },
        },
    )

    result = json.loads(response.choices[0].message.content)
    logger.info(
        f"Intent extracted: intent={result['intent']}, confidence={result['confidence']}"
    )
    return result


async def generate_followup_text(
    system_prompt: str,
    context: str,
    model: Optional[str] = None,
) -> dict:
    """
    Generate follow-up email/SMS text using GPT-4o-mini.

    Args:
        system_prompt: System instructions for tone, language, format
        context: Customer context and follow-up type details
        model: Override model (defaults to settings.OPENAI_FOLLOWUP_MODEL)

    Returns:
        Dict with keys: subject, body, tokens_used

    Raises:
        ValueError: If OPENAI_API_KEY is not configured
        openai.APIError: On API failure
    """
    client = get_openai_client()
    use_model = model or settings.OPENAI_FOLLOWUP_MODEL

    response = await client.chat.completions.create(
        model=use_model,
        temperature=0.7,
        max_tokens=500,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": context},
        ],
        response_format={"type": "json_object"},
    )

    result = json.loads(response.choices[0].message.content)
    tokens_used = response.usage.total_tokens if response.usage else 0

    logger.info(f"Follow-up generated: {tokens_used} tokens, model={use_model}")
    return {
        "subject": result.get("subject", ""),
        "body": result.get("body", ""),
        "tokens_used": tokens_used,
    }
