"""
Voice booking processor pipeline.

Implements 3-stage voice processing:
1. Audio validation (size, content type)
2. Whisper STT transcription
3. GPT-4 NLU intent extraction

Returns structured VoiceProcessResponse at every stage,
with graceful fallback on any error.
"""

import logging
from typing import Any

from fastapi import UploadFile

from ..config import settings
from .openai_client import transcribe_audio, extract_intent

logger = logging.getLogger(__name__)

# Audio upload constraints
MAX_AUDIO_SIZE = settings.MAX_AUDIO_SIZE_MB * 1024 * 1024  # Convert MB to bytes
ALLOWED_CONTENT_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/mp4",
    "audio/m4a",
    "audio/ogg",
}


class VoiceProcessor:
    """
    Voice booking intent extraction pipeline.

    Pipeline: Audio bytes -> Whisper STT -> GPT-4 NLU -> structured result.
    Does NOT create bookings -- returns extracted intent for Node.js to handle.
    """

    async def process(
        self, audio: UploadFile, language: str, company_id: int
    ) -> dict[str, Any]:
        """
        Process audio file through the full voice booking pipeline.

        Args:
            audio: Uploaded audio file (webm, wav, mp3, mp4, m4a, ogg)
            language: Language code for transcription (cs, sk, en)
            company_id: Company ID for context

        Returns:
            Dict matching VoiceProcessResponse schema with:
            - transcript, intent, entities, confidence,
              confirmation_needed, error, fallback
        """
        # ----------------------------------------------------------------
        # Step 1: Validate audio
        # ----------------------------------------------------------------
        try:
            content = await audio.read()
        except Exception as e:
            logger.error(f"Failed to read audio upload: {e}")
            return {
                "transcript": None,
                "intent": "unknown",
                "entities": None,
                "confidence": 0.0,
                "confirmation_needed": False,
                "error": "audio_read_failed",
                "fallback": True,
            }

        file_size = len(content)
        content_type = audio.content_type or "unknown"
        logger.info(
            f"Voice processing started: size={file_size} bytes, "
            f"content_type={content_type}, language={language}, "
            f"company_id={company_id}"
        )

        if file_size > MAX_AUDIO_SIZE:
            logger.warning(
                f"Audio too large: {file_size} bytes > {MAX_AUDIO_SIZE} bytes"
            )
            return {
                "transcript": None,
                "intent": "unknown",
                "entities": None,
                "confidence": 0.0,
                "confirmation_needed": False,
                "error": "audio_too_large",
                "fallback": True,
            }

        # ----------------------------------------------------------------
        # Step 2: Transcribe with Whisper
        # ----------------------------------------------------------------
        try:
            transcript = await transcribe_audio(
                audio_bytes=content,
                filename=audio.filename or "recording.webm",
                language=language,
            )
        except Exception as e:
            logger.error(f"Whisper transcription failed: {e}")
            return {
                "transcript": None,
                "intent": "unknown",
                "entities": None,
                "confidence": 0.0,
                "confirmation_needed": False,
                "error": "transcription_failed",
                "fallback": True,
            }

        # Check transcript quality
        if not transcript or len(transcript.strip()) < 3:
            logger.warning(
                f"Empty or too short transcription: '{transcript}'"
            )
            return {
                "transcript": transcript,
                "intent": "unknown",
                "entities": None,
                "confidence": 0.0,
                "confirmation_needed": False,
                "error": "empty_transcription",
                "fallback": True,
            }

        logger.info(f"Transcription successful: {len(transcript)} chars")

        # ----------------------------------------------------------------
        # Step 3: Extract intent with GPT-4
        # ----------------------------------------------------------------
        try:
            intent_result = await extract_intent(transcript)
        except Exception as e:
            logger.error(f"GPT-4 intent extraction failed: {e}")
            return {
                "transcript": transcript,
                "intent": "unknown",
                "entities": None,
                "confidence": 0.0,
                "confirmation_needed": False,
                "error": "intent_extraction_failed",
                "fallback": True,
            }

        # ----------------------------------------------------------------
        # Step 4: Return structured result
        # ----------------------------------------------------------------
        result = {
            "transcript": transcript,
            "intent": intent_result["intent"],
            "entities": intent_result["entities"],
            "confidence": intent_result["confidence"],
            "confirmation_needed": intent_result["intent"] == "create_booking",
            "error": None,
            "fallback": False,
        }

        logger.info(
            f"Voice processing complete: intent={result['intent']}, "
            f"confidence={result['confidence']}, "
            f"confirmation_needed={result['confirmation_needed']}"
        )
        return result
