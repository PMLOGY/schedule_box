# Phase 14: AI Phase 3 -- Voice & Intelligence - Research

**Researched:** 2026-02-12
**Domain:** Voice AI (STT + NLU), LLM text generation, competitor web scraping
**Confidence:** MEDIUM (OpenAI APIs well-documented; CZ-specific scraping and voice UX are lower confidence)

## Summary

Phase 14 adds three distinct AI-powered features to the AI-Powered pricing tier: (1) voice booking that accepts audio, transcribes it, extracts booking intent, and creates a reservation; (2) AI follow-up email generation using GPT-4 with customer context enrichment; and (3) automated competitor intelligence via web scraping of Czech booking platforms with periodic data collection.

All three features share a common dependency on the OpenAI API (Whisper for STT, GPT-4 for NLU and text generation) and must integrate with the existing Python FastAPI AI service (`services/ai/`) and the Node.js circuit breaker layer (`apps/web/lib/ai/`). The existing patterns are well-established: new router files in Python, new circuit-breaker-wrapped client methods in TypeScript, Pydantic schemas for request/response validation, and graceful fallback on every endpoint.

The most architecturally challenging feature is voice booking. The doc specifies `POST /bookings/voice` accepting multipart audio, but the documentation itself flags significant gaps: no fallback strategy, no confirmation flow, no max audio length. This research fills those gaps. The follow-up generator is the most straightforward feature -- standard GPT-4 chat completion with structured prompts. Competitor intelligence carries the most legal risk (EU scraping law) and requires careful scoping to avoid GDPR violations.

**Primary recommendation:** Use the OpenAI Python SDK (`openai` library) for Whisper and GPT-4 calls within the FastAPI service, despite the Phase 12-04 decision to use raw `fetch()` for external APIs on the Node.js side. The Python service already uses `httpx` and the OpenAI SDK provides critical multipart file handling, retry logic, and streaming support that would be painful to re-implement. The raw-fetch decision applies to the Node.js layer, not the Python microservice.

## Standard Stack

### Core (New dependencies for AI service)

| Library            | Version  | Purpose                                      | Why Standard                                                                                      |
| ------------------ | -------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `openai`           | >=1.60   | OpenAI API client (Whisper STT + GPT-4 NLU)  | Official Python SDK; handles multipart uploads, retries, streaming; actively maintained            |
| `python-multipart` | >=0.0.18 | FastAPI multipart/form-data file upload       | Required by FastAPI for `File` and `UploadFile` parameters; no alternative                        |
| `aiohttp`          | >=3.9    | Async HTTP for competitor scraping            | Already common in async Python; lighter than Scrapy for targeted scraping                         |
| `beautifulsoup4`   | >=4.12   | HTML parsing for competitor data extraction   | De facto standard for HTML scraping; well-maintained, easy API                                    |

### Supporting

| Library          | Version | Purpose                                  | When to Use                                              |
| ---------------- | ------- | ---------------------------------------- | -------------------------------------------------------- |
| `tenacity`       | >=8.2   | Retry logic for OpenAI API calls         | Wrap Whisper/GPT-4 calls for transient failure handling  |
| `tiktoken`       | >=0.7   | Token counting for GPT-4 prompt budgets  | Pre-validate prompt length before sending to API         |
| `pydub`          | >=0.25  | Audio format detection/conversion        | If incoming audio needs format validation or conversion  |

### Alternatives Considered

| Instead of       | Could Use                         | Tradeoff                                                                                         |
| ---------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `openai` SDK     | raw `httpx` multipart uploads     | Phase 12-04 used raw fetch on Node side, but Python SDK handles Whisper file upload edge cases   |
| `beautifulsoup4` | `scrapy`                          | Scrapy is overkill for 3-5 targeted scraping tasks; too heavy a framework                        |
| `pydub`          | Direct ffmpeg subprocess          | `pydub` provides cleaner API; subprocess is fine if you want fewer deps                          |
| `aiohttp`        | `httpx` (already in requirements) | `httpx` is already a dependency and supports async -- use it instead if keeping deps minimal     |

**NOTE on httpx:** The AI service already has `httpx==0.28.1` in requirements.txt. Use `httpx` for scraping instead of adding `aiohttp` to keep dependencies minimal. `beautifulsoup4` is still needed for HTML parsing.

**Installation (Python AI service):**
```bash
pip install openai python-multipart beautifulsoup4 tiktoken tenacity
```

**Installation (Node.js -- no new deps needed):**
The Node.js layer only needs new types and circuit breaker wrappers using the existing `opossum` and `fetch()` pattern.

## Architecture Patterns

### Recommended Project Structure

```
services/ai/app/
├── routers/
│   ├── predictions.py      # Existing (Phase 10)
│   ├── optimization.py     # Existing (Phase 11)
│   ├── voice.py            # NEW: Voice booking STT + NLU
│   ├── followup.py         # NEW: AI follow-up text generation
│   └── competitor.py       # NEW: Competitor intelligence scraping
├── schemas/
│   ├── requests.py         # Extend with voice/followup/competitor requests
│   └── responses.py        # Extend with voice/followup/competitor responses
├── services/
│   ├── model_loader.py     # Existing
│   ├── feature_store.py    # Existing
│   ├── openai_client.py    # NEW: Shared OpenAI client (Whisper + GPT-4)
│   ├── voice_processor.py  # NEW: Audio validation, STT, NLU pipeline
│   ├── followup_prompts.py # NEW: Prompt templates + context enrichment
│   └── scraper.py          # NEW: Competitor scraping logic
├── models/                 # Existing ML models (unchanged)
└── config.py               # Extend with OpenAI settings

apps/web/
├── app/api/v1/
│   ├── bookings/voice/route.ts    # NEW: POST /bookings/voice proxy
│   ├── ai/follow-up/route.ts      # NEW: POST /ai/follow-up/generate proxy
│   └── ai/competitor/route.ts     # NEW: GET/POST competitor intelligence
├── lib/ai/
│   ├── client.ts           # Extend with voice/followup/competitor methods
│   ├── types.ts            # Extend with new request/response types
│   └── fallback.ts         # Extend with voice/followup/competitor fallbacks
```

### Pattern 1: Audio Pipeline (Voice Booking)

**What:** Browser records audio -> Next.js API receives multipart -> proxies to Python AI service -> Whisper STT -> GPT-4 NLU -> returns structured intent + transcript
**When to use:** Voice booking endpoint

The flow is:
```
Browser (MediaRecorder API, webm/opus)
  -> POST /api/v1/bookings/voice (Next.js, multipart/form-data)
    -> POST /api/v1/voice/process (Python FastAPI, multipart)
      -> OpenAI Whisper API (transcription, language=cs)
      -> OpenAI GPT-4 Structured Output (intent extraction)
    <- { transcript, intent, entities }
  -> If intent=create_booking: call booking creation logic
  <- { transcript, intent, booking?, confirmation_needed }
```

**Critical design decision:** The voice endpoint does NOT directly create bookings. It returns the extracted intent and entities, then the Next.js layer handles booking creation through the existing booking flow. This keeps the AI service stateless and avoids duplicating booking validation logic.

```python
# services/ai/app/routers/voice.py
from fastapi import APIRouter, UploadFile, File, Form
from ..services.voice_processor import VoiceProcessor

router = APIRouter(prefix="/voice", tags=["voice"])

@router.post("/process")
async def process_voice(
    audio: UploadFile = File(...),
    language: str = Form(default="cs"),
    company_id: int = Form(...),
):
    """Transcribe audio and extract booking intent."""
    processor = VoiceProcessor()
    result = await processor.process(audio, language, company_id)
    return result
```

### Pattern 2: Structured Output NLU (Intent Extraction)

**What:** Use GPT-4 with Structured Outputs (strict JSON schema) to extract booking intent from transcribed Czech text.
**When to use:** After Whisper transcription, to parse intent + entities

```python
# services/ai/app/services/voice_processor.py
import json
from openai import AsyncOpenAI

VOICE_INTENT_SCHEMA = {
    "type": "object",
    "properties": {
        "intent": {
            "type": "string",
            "enum": ["create_booking", "cancel_booking", "check_availability", "unknown"]
        },
        "entities": {
            "type": "object",
            "properties": {
                "service_name": {"type": ["string", "null"]},
                "date": {"type": ["string", "null"]},  # ISO date
                "time": {"type": ["string", "null"]},   # HH:MM
                "employee_name": {"type": ["string", "null"]},
                "customer_name": {"type": ["string", "null"]},
                "customer_phone": {"type": ["string", "null"]},
            },
            "required": ["service_name", "date", "time", "employee_name",
                         "customer_name", "customer_phone"],
            "additionalProperties": False,
        },
        "confidence": {"type": "number"},
        "raw_interpretation": {"type": "string"},
    },
    "required": ["intent", "entities", "confidence", "raw_interpretation"],
    "additionalProperties": False,
}

SYSTEM_PROMPT = """You are a booking assistant for a Czech/Slovak service business.
Extract the booking intent and entities from the customer's speech transcription.
The business offers services like haircuts, manicures, massages, etc.
Respond ONLY with the structured JSON. If information is missing, use null.
Dates should be ISO format (YYYY-MM-DD). Times should be HH:MM format.
Interpret Czech date expressions like "zitra" (tomorrow), "pristi pondeli" (next Monday), etc."""

async def extract_intent(client: AsyncOpenAI, transcript: str, model: str = "gpt-4-turbo"):
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Transkripce zakaznika: {transcript}"},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "booking_intent",
                "strict": True,
                "schema": VOICE_INTENT_SCHEMA,
            },
        },
        temperature=0.1,
    )
    return json.loads(response.choices[0].message.content)
```

### Pattern 3: Prompt-Template Follow-Up Generation

**What:** Use GPT-4 with customer context to generate personalized follow-up emails.
**When to use:** AI follow-up generation endpoint

```python
# services/ai/app/services/followup_prompts.py

FOLLOW_UP_TEMPLATES = {
    "post_visit": {
        "system": """You are a friendly marketing assistant for a Czech service business.
Write a personalized follow-up email in Czech for a customer who recently visited.
Keep the tone warm and personal. Include a subtle upsell if the customer data suggests it.
Output JSON with "subject" and "body" fields. Body should be plain text with line breaks.""",
        "context_template": """Customer: {customer_name}
Last visit: {last_visit_date}
Service: {last_service}
Total visits: {total_visits}
Health score: {health_score}/100
Preferred services: {preferred_services}
Business name: {business_name}"""
    },
    "re_engagement": {
        "system": """You are a marketing assistant for a Czech service business.
Write a re-engagement email in Czech for a customer who hasn't visited in a while.
Be warm but not pushy. Mention what they're missing. Optionally include a time-limited offer.
Output JSON with "subject" and "body" fields.""",
        "context_template": """Customer: {customer_name}
Days since last visit: {days_inactive}
Previous favorite services: {preferred_services}
Total visits: {total_visits}
Total spent: {total_spent} CZK
Health score: {health_score}/100 ({health_category})
Business name: {business_name}"""
    },
    "upsell": {
        "system": """You are a marketing assistant for a Czech service business.
Write an upsell email in Czech suggesting a complementary service.
Reference the customer's history to make it personal.
Output JSON with "subject" and "body" fields.""",
        "context_template": """Customer: {customer_name}
Recent services: {recent_services}
Recommended upsell: {recommended_service}
Recommendation reason: {recommendation_reason}
Business name: {business_name}"""
    },
    "birthday": {
        "system": """You are a marketing assistant for a Czech service business.
Write a birthday congratulation email in Czech with a special offer.
Be celebratory and personal. Include a birthday discount or gift.
Output JSON with "subject" and "body" fields.""",
        "context_template": """Customer: {customer_name}
Total visits: {total_visits}
Loyalty tier: {loyalty_tier}
Preferred services: {preferred_services}
Business name: {business_name}"""
    },
}
```

### Pattern 4: Scheduled Competitor Scraping

**What:** Periodic scraping of competitor pricing, services, and reviews from public sources.
**When to use:** Competitor intelligence background job, triggered via cron or manual admin action.

```python
# services/ai/app/services/scraper.py
import httpx
from bs4 import BeautifulSoup

class CompetitorScraper:
    """Scrapes publicly available business data from Czech booking platforms."""

    def __init__(self, http_client: httpx.AsyncClient):
        self.client = http_client

    async def scrape_google_maps(self, business_name: str, location: str) -> dict:
        """Scrape Google Maps for reviews, rating, and basic info.
        Uses Google Places API (not direct scraping) for ToS compliance."""
        # Use Google Places API with API key
        pass

    async def scrape_public_website(self, url: str) -> dict:
        """Scrape public-facing pricing and services from a competitor website."""
        response = await self.client.get(url, follow_redirects=True, timeout=15.0)
        soup = BeautifulSoup(response.text, "html.parser")
        # Extract pricing tables, service lists, etc.
        return {"services": [], "pricing": []}
```

### Anti-Patterns to Avoid

- **Anti-pattern: Direct booking creation in voice endpoint.** The Python AI service should NOT create bookings directly. It should return intent + entities, and the Node.js layer handles actual booking creation through existing validated paths. This prevents bypassing RLS, double-booking checks, and payment validation.

- **Anti-pattern: Storing raw audio in the database.** Audio files should be processed and discarded (or stored in R2 temporarily for debugging, with auto-expiry). Never store audio in PostgreSQL.

- **Anti-pattern: Unbounded GPT-4 prompts for follow-ups.** Always use `tiktoken` to count tokens and enforce a budget. A follow-up email prompt should stay under 2000 tokens to keep costs predictable.

- **Anti-pattern: Scraping personal data.** Competitor intelligence MUST only collect publicly listed business information (pricing, services, aggregate review scores). Never scrape individual reviewer names, emails, or other personal data -- this violates GDPR.

- **Anti-pattern: Synchronous scraping on API request.** Competitor scraping should be a background job (triggered by admin or scheduled), never blocking an HTTP request. Results go into `competitor_data` table for later retrieval.

## Don't Hand-Roll

| Problem                         | Don't Build                           | Use Instead                               | Why                                                                                    |
| ------------------------------- | ------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| Audio transcription             | Self-hosted Whisper model             | OpenAI Whisper API (`whisper-1`)          | Self-hosting needs GPU; API is $0.006/min; CZ support works well out of box            |
| Intent extraction from text     | Regex/keyword-based NLU              | GPT-4 Structured Outputs                  | Czech grammar is complex; regex fails on real speech; GPT-4 handles ambiguity          |
| Multipart file upload handling  | Manual request parsing                | FastAPI `UploadFile` + `python-multipart` | FastAPI handles streaming uploads, validation, temp files automatically                |
| Token counting for GPT-4       | Character-based estimation            | `tiktoken` library                        | Token counts differ from character counts; tiktoken matches exact GPT-4 tokenizer      |
| Retry logic for OpenAI calls   | Custom retry loops                    | `tenacity` or OpenAI SDK built-in retries | OpenAI SDK has automatic retry with backoff for 429/500 errors                         |
| Email text generation           | Static template interpolation         | GPT-4 Chat Completion                     | Static templates can't personalize based on nuanced customer context                   |
| Competitor data extraction      | Full web crawling framework           | Targeted `httpx` + `beautifulsoup4`       | Only scraping 3-5 specific page types; Scrapy framework is massive overkill            |

**Key insight:** Phase 14 features are all about calling external APIs (OpenAI) and gluing them together with good validation, fallbacks, and cost controls. The complexity is in the pipeline orchestration and error handling, not in building the AI models themselves.

## Common Pitfalls

### Pitfall 1: Whisper Language Detection Failures for Czech

**What goes wrong:** When `language` parameter is not explicitly set, Whisper may misdetect Czech as Slovak, Polish, or even Russian, producing garbled transcriptions.
**Why it happens:** Czech, Slovak, and Polish share vocabulary and phonetic patterns. Whisper's auto-detection can be unreliable for shorter utterances.
**How to avoid:** ALWAYS pass `language="cs"` (or `language="sk"`) explicitly to the Whisper API. Never rely on auto-detection for CZ/SK market.
**Warning signs:** Transcriptions contain words from the wrong Slavic language; intent extraction fails due to mixed-language input.

### Pitfall 2: Audio File Size Exceeding 25MB Limit

**What goes wrong:** If a user records a long voice message (>~30 minutes uncompressed), the file exceeds Whisper's 25MB upload limit, and the API rejects it.
**Why it happens:** No client-side or server-side audio duration/size limits enforced.
**How to avoid:** Enforce a maximum recording duration of 2 minutes on the client side (MediaRecorder maxDuration) and validate file size on the server (<10MB to be safe). Voice bookings should be short utterances, not conversations.
**Warning signs:** 413 errors from OpenAI; timeouts on file upload.

### Pitfall 3: GPT-4 Hallucinating Booking Details

**What goes wrong:** GPT-4 "invents" a date, time, or service name that the customer never mentioned, leading to incorrect bookings.
**Why it happens:** GPT-4 tries to be helpful and fills in gaps. With low-quality transcriptions, it may confuse partial words with booking entities.
**How to avoid:** (1) Always require confirmation before creating bookings from voice. (2) Set `temperature=0.1` for intent extraction. (3) Return a `confirmation_needed` flag when extracted entities are incomplete. (4) Validate extracted service names against the company's actual service catalog on the Node.js side.
**Warning signs:** Bookings created for services that don't exist; bookings at impossible times.

### Pitfall 4: GPT-4 Cost Explosion from Follow-Up Generation

**What goes wrong:** Each follow-up generation call to GPT-4 costs ~$0.01-0.03 depending on context length. With a batch automation sending to 1000 inactive customers, costs spike to $10-30 per run.
**Why it happens:** No rate limiting or batch size controls on the follow-up endpoint.
**How to avoid:** (1) Implement per-company daily rate limits for follow-up generation (e.g., max 50/day). (2) Use `gpt-4o-mini` instead of `gpt-4-turbo` for follow-up generation -- quality is sufficient for marketing emails and cost is 10x lower. (3) Pre-count tokens with `tiktoken` and truncate long customer contexts. (4) Track costs per company for billing.
**Warning signs:** Sudden spike in OpenAI API costs; slow response times from rate limiting.

### Pitfall 5: Scraping Target Sites Blocking Requests

**What goes wrong:** Google Maps, Reservio, or Bookio detect automated scraping and block the IP or return CAPTCHAs.
**Why it happens:** Direct scraping without rate limiting, without proper User-Agent headers, or too frequent requests.
**How to avoid:** (1) Use Google Places API (paid) instead of scraping Google Maps directly -- it's ToS-compliant and more reliable. (2) For public competitor websites, implement polite scraping: respect robots.txt, rate limit to 1 request per 5 seconds per domain, use realistic User-Agent strings, and implement exponential backoff on 429s. (3) Schedule scraping no more than once per week per competitor. (4) Cache results aggressively.
**Warning signs:** HTTP 403/429 responses; empty scraping results; CAPTCHA pages in HTML.

### Pitfall 6: GDPR Violation from Competitor Scraping

**What goes wrong:** Scraping collects personal data (individual reviewer names, photos, email addresses) from competitor pages, violating GDPR.
**Why it happens:** Broad scraping without filtering; scraping review text that contains customer names.
**How to avoid:** (1) Only collect aggregate business data: average rating, number of reviews, service names, pricing. (2) NEVER store individual review text or reviewer identities. (3) Document the data processing purpose and legal basis (legitimate interest for competitive analysis). (4) Add data retention policies -- delete scraped data older than 90 days.
**Warning signs:** Scraped data contains person names; data protection authority inquiries.

### Pitfall 7: Voice Recording Permission Not Granted

**What goes wrong:** Browser doesn't have microphone permission, MediaRecorder fails silently, or user denies permission.
**Why it happens:** Web audio API requires explicit user permission; some browsers restrict permission to HTTPS only.
**How to avoid:** (1) Check `navigator.mediaDevices.getUserMedia` availability before showing voice UI. (2) Handle permission denial gracefully with a clear error message. (3) Ensure the app is served over HTTPS (required for microphone access). (4) Provide a text-based fallback for booking when voice is unavailable.
**Warning signs:** Blank or zero-length audio uploads; "NotAllowedError" in browser console.

## Code Examples

### Whisper Transcription via OpenAI SDK

```python
# services/ai/app/services/openai_client.py
import logging
from openai import AsyncOpenAI
from ..config import settings

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None

def get_openai_client() -> AsyncOpenAI:
    """Lazy-init singleton OpenAI client."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client

async def transcribe_audio(
    audio_bytes: bytes,
    filename: str,
    language: str = "cs",
    model: str = "whisper-1",
) -> str:
    """Transcribe audio bytes using OpenAI Whisper API.

    Args:
        audio_bytes: Raw audio file content
        filename: Original filename (used for format detection)
        language: ISO 639-1 language code (default: Czech)
        model: Whisper model to use

    Returns:
        Transcribed text string
    """
    client = get_openai_client()

    # Create a file-like tuple for the SDK
    # Format: (filename, file_bytes, content_type)
    transcript = await client.audio.transcriptions.create(
        model=model,
        file=(filename, audio_bytes),
        language=language,
        prompt="Dobry den, chtela bych si objednat termin.",  # Czech context hint
        response_format="text",
    )
    return transcript
```

### Voice Processing Pipeline

```python
# services/ai/app/services/voice_processor.py
import logging
from fastapi import UploadFile
from .openai_client import get_openai_client, transcribe_audio

logger = logging.getLogger(__name__)

MAX_AUDIO_SIZE = 10 * 1024 * 1024  # 10MB
MAX_AUDIO_DURATION_HINT = 120  # 2 minutes
ALLOWED_CONTENT_TYPES = {
    "audio/webm", "audio/wav", "audio/mp3", "audio/mpeg",
    "audio/mp4", "audio/m4a", "audio/ogg",
}

class VoiceProcessor:
    async def process(
        self,
        audio: UploadFile,
        language: str,
        company_id: int,
    ) -> dict:
        # 1. Validate audio
        content = await audio.read()
        if len(content) > MAX_AUDIO_SIZE:
            return {
                "error": "audio_too_large",
                "message": f"Audio file exceeds {MAX_AUDIO_SIZE // (1024*1024)}MB limit",
                "transcript": None,
                "intent": "unknown",
            }

        # 2. Transcribe with Whisper
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
                "error": "transcription_failed",
                "fallback": True,
            }

        if not transcript or len(transcript.strip()) < 3:
            return {
                "transcript": transcript,
                "intent": "unknown",
                "error": "empty_transcription",
                "entities": {},
                "fallback": True,
            }

        # 3. Extract intent with GPT-4
        try:
            intent_result = await extract_intent(
                get_openai_client(),
                transcript,
            )
        except Exception as e:
            logger.error(f"Intent extraction failed: {e}")
            return {
                "transcript": transcript,
                "intent": "unknown",
                "entities": {},
                "error": "intent_extraction_failed",
                "fallback": True,
            }

        return {
            "transcript": transcript,
            "intent": intent_result["intent"],
            "entities": intent_result["entities"],
            "confidence": intent_result["confidence"],
            "confirmation_needed": intent_result["intent"] == "create_booking",
            "fallback": False,
        }
```

### Follow-Up Generation with Cost Control

```python
# services/ai/app/routers/followup.py
import json
import logging
import tiktoken
from fastapi import APIRouter
from ..services.openai_client import get_openai_client
from ..services.followup_prompts import FOLLOW_UP_TEMPLATES

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/followup", tags=["followup"])

MAX_PROMPT_TOKENS = 2000
FOLLOWUP_MODEL = "gpt-4o-mini"  # Cost-effective for email generation

@router.post("/generate")
async def generate_followup(request: FollowUpRequest):
    """Generate personalized follow-up email content."""
    template = FOLLOW_UP_TEMPLATES.get(request.type)
    if not template:
        return {"error": "invalid_type", "subject": "", "body": ""}

    # Build context from customer data
    context_str = template["context_template"].format(**request.customer_context)

    # Token budget check
    enc = tiktoken.encoding_for_model(FOLLOWUP_MODEL)
    system_tokens = len(enc.encode(template["system"]))
    context_tokens = len(enc.encode(context_str))

    if system_tokens + context_tokens > MAX_PROMPT_TOKENS:
        # Truncate context to fit budget
        max_context = MAX_PROMPT_TOKENS - system_tokens - 100
        context_str = enc.decode(enc.encode(context_str)[:max_context])

    try:
        client = get_openai_client()
        response = await client.chat.completions.create(
            model=FOLLOWUP_MODEL,
            messages=[
                {"role": "system", "content": template["system"]},
                {"role": "user", "content": context_str},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=500,
        )
        result = json.loads(response.choices[0].message.content)
        return {
            "subject": result.get("subject", ""),
            "body": result.get("body", ""),
            "model": FOLLOWUP_MODEL,
            "tokens_used": response.usage.total_tokens,
            "fallback": False,
        }
    except Exception as e:
        logger.error(f"Follow-up generation failed: {e}")
        return {
            "subject": "",
            "body": "",
            "error": "generation_failed",
            "fallback": True,
        }
```

### Node.js Circuit Breaker Extension

```typescript
// apps/web/lib/ai/client.ts (additions)

// Voice booking - different timeout (15s for audio processing)
async function callVoiceProcessAPI(formData: FormData): Promise<VoiceProcessResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/v1/voice/process`, {
    method: 'POST',
    body: formData, // multipart/form-data (no Content-Type header -- browser sets boundary)
  });
  if (!response.ok) {
    throw new Error(`AI service error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<VoiceProcessResponse>;
}

export const processVoice = createAICircuitBreaker<[FormData], VoiceProcessResponse>(
  callVoiceProcessAPI,
  getVoiceProcessFallback,
  { timeout: 15000 }, // 15s -- Whisper + GPT-4 pipeline takes longer
);

// Follow-up generation
async function callFollowUpAPI(request: FollowUpRequest): Promise<FollowUpResponse> {
  const response = await fetch(`${AI_SERVICE_URL}/api/v1/followup/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`AI service error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<FollowUpResponse>;
}

export const generateFollowUp = createAICircuitBreaker<[FollowUpRequest], FollowUpResponse>(
  callFollowUpAPI,
  getFollowUpFallback,
  { timeout: 10000 }, // 10s -- GPT-4 text generation
);
```

### Browser Audio Recording

```typescript
// apps/web/components/voice-booking/useVoiceRecorder.ts
import { useState, useRef, useCallback } from 'react';

const MAX_DURATION_MS = 120_000; // 2 minutes max

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const getMimeType = (): string => {
    // Prefer webm/opus (Chrome/Edge), fall back to mp4 (Safari)
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      return 'audio/webm;codecs=opus';
    }
    if (MediaRecorder.isTypeSupported('audio/mp4')) {
      return 'audio/mp4';
    }
    return 'audio/webm'; // Generic fallback
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });

      chunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      mediaRecorder.current = recorder;
      setIsRecording(true);

      // Auto-stop after max duration
      timeoutRef.current = setTimeout(() => stopRecording(), MAX_DURATION_MS);
    } catch (err) {
      console.error('Microphone access denied:', err);
      throw new Error('microphone_access_denied');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  }, []);

  return { isRecording, audioBlob, startRecording, stopRecording };
}
```

## State of the Art

| Old Approach                          | Current Approach                                 | When Changed       | Impact                                                                  |
| ------------------------------------- | ------------------------------------------------ | ------------------ | ----------------------------------------------------------------------- |
| Whisper V2 (`whisper-1`)              | `gpt-4o-transcribe` / `gpt-4o-mini-transcribe`  | March 2025         | ~20% lower WER; but `whisper-1` still fine for Czech at $0.006/min      |
| GPT-4 function calling                | GPT-4 Structured Outputs (strict mode)           | August 2024        | 100% schema adherence; use for intent extraction                        |
| Chat Completions API                  | Responses API (newer)                             | 2025               | Responses API is newer but Chat Completions still fully supported       |
| Self-hosted Whisper                   | OpenAI Whisper API                                | Ongoing            | API is simpler; self-hosted only for latency-critical or offline use    |
| Scrapy for web scraping               | Targeted httpx+BS4 / SerpAPI / Google Places API | Ongoing            | Full crawl frameworks are overkill for specific competitor monitoring    |

**Model recommendation:** Start with `whisper-1` as the doc specifies. It works well for Czech and is the battle-tested option. Consider upgrading to `gpt-4o-mini-transcribe` ($0.003/min, 50% cheaper, better accuracy) once voice booking is stable and tested. For intent extraction, use `gpt-4-turbo` (or `gpt-4o-mini` for cost savings) with Structured Outputs. For follow-up email generation, use `gpt-4o-mini` -- it's 10x cheaper than `gpt-4-turbo` and produces perfectly adequate marketing emails.

**Deprecated/outdated:**
- OpenAI Completions API (not Chat Completions) -- deprecated, do not use
- Whisper local model without GPU -- too slow for real-time voice booking; use API

## Open Questions

1. **Phone integration vs browser-only voice booking**
   - What we know: The doc says "Rezervace hlasem přes telefon (AI)" suggesting phone-based voice booking. The API spec accepts multipart audio, which works for both browser and phone.
   - What's unclear: Does the product need actual phone/Twilio integration (caller dials a number), or is browser-based voice recording sufficient for MVP? Phone integration adds significant complexity (Twilio costs, real-time STT, conversational flow).
   - Recommendation: **Start with browser-only voice recording for MVP.** Phone/Twilio integration can be a Phase 14+ follow-up. The API is designed to accept audio regardless of source, so the backend work is the same.

2. **Confirmation flow for voice-created bookings**
   - What we know: The doc flags this as a gap. Voice bookings need confirmation because STT/NLU can make mistakes.
   - What's unclear: Should confirmation be voice-based (speak "yes") or visual (show a summary screen with confirm button)?
   - Recommendation: **Use visual confirmation.** After voice processing returns intent + entities, display a booking summary card in the UI with "Confirm" and "Cancel" buttons. This is simpler, more reliable, and avoids the complexity of multi-turn voice interaction. The response includes `confirmation_needed: true` to trigger this flow.

3. **Usage tracking for voice booking billing (1 CZK/min)**
   - What we know: Voice booking is priced at 1 CZK/min. OpenAI Whisper charges $0.006/min.
   - What's unclear: Where to track usage -- should there be an `ai_usage` table? How to measure audio duration (from file metadata or Whisper response)?
   - Recommendation: **Create an `ai_usage_log` table** with columns: company_id, feature (voice_booking/follow_up/competitor_intel), duration_seconds (for voice), tokens_used (for text gen), cost_czk, created_at. Log every AI API call. Duration can be estimated from file size or measured via audio metadata. This feeds into billing.

4. **Competitor scraping frequency and scope**
   - What we know: The `competitor_data` table exists with data_type IN (pricing, services, reviews, availability).
   - What's unclear: How does an admin configure which competitors to monitor? Is there a `competitor_config` table or UI?
   - Recommendation: **Add a `competitor_monitors` table** (company_id, competitor_name, competitor_url, scrape_frequency, is_active, last_scraped_at) that admins configure via a settings UI. The scraper checks this table on each run. Default frequency: weekly. Max competitors per company: 5 for the AI-Powered tier.

5. **Legal basis for competitor scraping in Czech Republic**
   - What we know: EU GDPR applies. Web scraping of personal data requires legal basis. Czech Republic follows general EU framework.
   - What's unclear: Whether scraping publicly listed competitor pricing and aggregate reviews falls under legitimate interest.
   - Recommendation: **Scrape only publicly available business information** (pricing pages, service catalogs, aggregate review scores from Google). Avoid scraping individual reviews, personal names, or data behind login walls. Document the legal basis as "legitimate interest for competitive market analysis." Add a ToS clause stating the platform monitors publicly available market data. This is MEDIUM confidence -- should be validated with legal counsel before launch.

## Sources

### Primary (HIGH confidence)
- OpenAI Whisper API docs: File size limit 25MB, supported formats (mp3, mp4, mpeg, mpga, m4a, wav, webm), pricing $0.006/min, Czech language supported -- [Speech to text | OpenAI API](https://platform.openai.com/docs/guides/speech-to-text)
- OpenAI Structured Outputs: strict JSON schema adherence, available on gpt-4-turbo and gpt-4o models -- [Structured Outputs | OpenAI](https://openai.com/index/introducing-structured-outputs-in-the-api/)
- OpenAI pricing (Feb 2026): GPT-4o-mini at $0.15/$0.60 per 1M tokens input/output, Whisper at $0.006/min -- [OpenAI Pricing](https://platform.openai.com/docs/pricing)
- MediaRecorder API: webm/opus on Chrome/Edge, mp4 on Safari -- [MDN MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)

### Secondary (MEDIUM confidence)
- OpenAI gpt-4o-transcribe: ~20% lower WER than whisper-1, released March 2025, $0.006/min (same price), gpt-4o-mini-transcribe at $0.003/min -- [OpenAI Transcription Models](https://openai.com/index/introducing-our-next-generation-audio-models/)
- Whisper prompt parameter for Czech: context hints in Czech improve transcription accuracy -- [Whisper Prompting Guide | OpenAI Cookbook](https://cookbook.openai.com/examples/whisper_prompting_guide)
- EU GDPR scraping legality: Personal data scraping requires lawful basis; aggregate business data generally falls under legitimate interest -- [IAPP EU Web Scraping](https://iapp.org/news/a/the-state-of-web-scraping-in-the-eu)
- Google Maps scraping alternatives: SerpAPI, Outscraper, Apify provide ToS-compliant access to Google business data -- [Google Maps Scraper APIs](https://research.aimultiple.com/google-maps-scraper/)

### Tertiary (LOW confidence)
- Czech Whisper accuracy: Third-party claims ~98.5% accuracy for Czech (unverified by OpenAI) -- [Czech Speech to Text | Subper](https://subtitlewhisper.com/en/tools/czech-speech-to-text)
- Twilio ConversationRelay for phone-based voice booking (not recommended for MVP but documented for future) -- [Twilio ConversationRelay](https://www.twilio.com/docs/voice/conversationrelay)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- OpenAI APIs are well-documented; Python ecosystem for audio/scraping is mature
- Architecture: HIGH -- Patterns follow existing AI service structure exactly (new routers + new services)
- Voice booking flow: MEDIUM -- Whisper + GPT-4 pipeline is proven, but Czech-specific accuracy and voice UX confirmation flow need runtime validation
- Follow-up generation: HIGH -- Standard GPT-4 text generation pattern; well-understood costs and limits
- Competitor intelligence: MEDIUM -- Technical scraping is straightforward, but legal considerations and target site stability add uncertainty
- Pitfalls: HIGH -- OpenAI API limitations, GDPR, and cost control are well-documented concern areas

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days -- OpenAI APIs stable but pricing may change)
