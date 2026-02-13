"""
Voice processing router for booking intent extraction.

Accepts multipart/form-data with audio file and metadata,
processes through Whisper STT + GPT-4 NLU pipeline,
returns structured booking intent response.

Does NOT create bookings -- returns intent for Node.js to handle
via existing booking flow.

Requires X-API-Key header matching AI_SERVICE_API_KEY for authorization.
"""

import logging

from fastapi import APIRouter, UploadFile, File, Form, Header, HTTPException

from ..config import settings
from ..services.voice_processor import VoiceProcessor
from ..schemas.responses import VoiceProcessResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["voice"])


async def _verify_api_key(x_api_key: str | None = Header(None)) -> None:
    """
    Verify the request carries a valid API key.
    The AI service is an internal service called only by the Node.js backend,
    so a shared API key is sufficient for authorization.
    """
    expected_key = settings.AI_SERVICE_API_KEY
    if not expected_key:
        # No API key configured — skip auth (development mode)
        return

    if not x_api_key or x_api_key != expected_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key",
        )


@router.post("/process", response_model=VoiceProcessResponse)
async def process_voice(
    audio: UploadFile = File(
        ..., description="Audio file (webm, wav, mp3, mp4, m4a, ogg)"
    ),
    language: str = Form(
        default="cs", description="Language code: cs, sk, en"
    ),
    company_id: int = Form(
        ..., description="Company ID for context"
    ),
    x_api_key: str | None = Header(None),
) -> VoiceProcessResponse:
    """
    Process voice audio for booking intent extraction.

    Pipeline: Audio -> Whisper STT (transcription) -> GPT-4 NLU (intent extraction)

    Returns transcript, intent (create_booking/cancel_booking/check_availability/unknown),
    extracted entities (service, date, time, employee, customer), and confidence score.

    Does NOT create bookings -- returns intent for Node.js to handle via existing booking flow.

    Requires X-API-Key header for authorization.
    """
    await _verify_api_key(x_api_key)

    processor = VoiceProcessor()
    result = await processor.process(audio, language, company_id)
    return result
