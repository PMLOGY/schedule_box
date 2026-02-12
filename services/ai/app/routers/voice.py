"""
Voice processing router for booking intent extraction.

Accepts multipart/form-data with audio file and metadata,
processes through Whisper STT + GPT-4 NLU pipeline,
returns structured booking intent response.

Does NOT create bookings -- returns intent for Node.js to handle
via existing booking flow.
"""

import logging

from fastapi import APIRouter, UploadFile, File, Form

from ..services.voice_processor import VoiceProcessor
from ..schemas.responses import VoiceProcessResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["voice"])


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
) -> VoiceProcessResponse:
    """
    Process voice audio for booking intent extraction.

    Pipeline: Audio -> Whisper STT (transcription) -> GPT-4 NLU (intent extraction)

    Returns transcript, intent (create_booking/cancel_booking/check_availability/unknown),
    extracted entities (service, date, time, employee, customer), and confidence score.

    Does NOT create bookings -- returns intent for Node.js to handle via existing booking flow.
    """
    processor = VoiceProcessor()
    result = await processor.process(audio, language, company_id)
    return result
