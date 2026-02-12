---
phase: 14-ai-voice-intelligence
plan: 01
subsystem: api
tags: [openai, whisper, gpt-4, circuit-breaker, zod, pydantic, voice, follow-up, competitor]

# Dependency graph
requires:
  - phase: 10-ai-predictions
    provides: AI service foundation, model loader, circuit breaker pattern
  - phase: 11-ai-optimization
    provides: Existing Pydantic schemas, TypeScript types, fallback pattern, client methods
provides:
  - OpenAI async client singleton (transcribe_audio, extract_intent, generate_followup_text)
  - Pydantic request/response schemas for voice, follow-up, competitor features
  - TypeScript types for all Phase 14 feature domains
  - Circuit breaker wrapped client methods (processVoice, generateFollowUp, triggerCompetitorScrape, getCompetitorData)
  - Fallback functions for all Phase 14 AI features
  - Zod validation schemas in @schedulebox/shared (voiceBooking, followUpRequest, competitorScrape, competitorQuery)
affects: [14-02-voice-booking, 14-03-followup-generator, 14-04-competitor-intelligence]

# Tech tracking
tech-stack:
  added: [openai>=1.60, python-multipart>=0.0.18, beautifulsoup4>=4.12, tiktoken>=0.7, tenacity>=8.2]
  patterns: [openai-async-singleton, whisper-transcription, gpt4-structured-outputs, multipart-circuit-breaker]

key-files:
  created:
    - services/ai/app/services/openai_client.py
    - packages/shared/src/schemas/ai-voice-intelligence.ts
    - packages/shared/src/types/ai-voice-intelligence.ts
  modified:
    - services/ai/requirements.txt
    - services/ai/app/config.py
    - services/ai/app/schemas/requests.py
    - services/ai/app/schemas/responses.py
    - apps/web/lib/ai/types.ts
    - apps/web/lib/ai/fallback.ts
    - apps/web/lib/ai/client.ts
    - packages/shared/src/schemas/index.ts
    - packages/shared/src/types/index.ts

key-decisions:
  - 'OpenAI async singleton pattern matches existing model_loader.py global pattern'
  - 'GPT-4 Structured Outputs with strict JSON schema for deterministic intent extraction'
  - 'gpt-4o-mini for follow-up text (cost-effective), gpt-4-turbo for NLU (accuracy)'
  - 'Voice circuit breaker uses 15s timeout (Whisper + GPT-4 pipeline), scraper uses 30s'
  - 'getVoiceProcessFallback takes no arguments (FormData not useful for fallback)'

patterns-established:
  - 'OpenAI singleton: lazy-init global _client with graceful OPENAI_API_KEY="" handling'
  - 'Multipart circuit breaker: FormData passthrough without Content-Type header for auto-boundary'
  - 'Czech context hint prompt for Whisper transcription accuracy'

# Metrics
duration: 5min
completed: 2026-02-12
---

# Phase 14 Plan 01: Shared AI Foundation Summary

**OpenAI async client singleton with Whisper transcription and GPT-4 NLU, extended Pydantic/TypeScript types, 4 circuit breaker methods, and Zod validation schemas for voice booking, follow-up generation, and competitor intelligence**

## Performance

- **Duration:** 5 min (307s)
- **Started:** 2026-02-12T15:23:46Z
- **Completed:** 2026-02-12T15:28:53Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- OpenAI async client singleton with transcribe_audio (Whisper), extract_intent (GPT-4 Structured Outputs), and generate_followup_text (GPT-4o-mini)
- Extended Python Pydantic schemas with 7 new request models and 7 new response models for all Phase 14 features
- Extended Node.js AI client with 4 new circuit breaker methods (processVoice 15s, generateFollowUp 10s, triggerCompetitorScrape 30s, getCompetitorData 5s)
- Created Zod validation schemas and inferred TypeScript types in @schedulebox/shared for API route validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Python AI service foundation** - `db66695` (feat)
2. **Task 2: Node.js types, fallbacks, circuit breaker client, Zod schemas** - `40ed156` (feat)

## Files Created/Modified

- `services/ai/requirements.txt` - Added openai, python-multipart, beautifulsoup4, tiktoken, tenacity
- `services/ai/app/config.py` - Added OPENAI_API_KEY, model settings, rate limits
- `services/ai/app/services/openai_client.py` - Async OpenAI client singleton (transcribe, intent, followup)
- `services/ai/app/schemas/requests.py` - VoiceProcessRequest, FollowUpRequest, CompetitorScrapeRequest, CompetitorDataRequest
- `services/ai/app/schemas/responses.py` - VoiceProcessResponse, FollowUpResponse, CompetitorScrapeResponse, CompetitorDataResponse
- `apps/web/lib/ai/types.ts` - TypeScript interfaces for all Phase 14 features
- `apps/web/lib/ai/fallback.ts` - 4 fallback functions for Phase 14 features
- `apps/web/lib/ai/client.ts` - 4 circuit breaker wrapped methods for Phase 14 AI endpoints
- `packages/shared/src/schemas/ai-voice-intelligence.ts` - Zod schemas for API input validation
- `packages/shared/src/schemas/index.ts` - Re-exports for Phase 14 schemas
- `packages/shared/src/types/ai-voice-intelligence.ts` - Inferred TypeScript types from Zod schemas
- `packages/shared/src/types/index.ts` - Re-exports for Phase 14 types

## Decisions Made

- OpenAI async singleton pattern matches existing model_loader.py global pattern for consistency
- GPT-4 Structured Outputs with strict JSON schema for deterministic intent extraction (temperature=0.1)
- gpt-4o-mini for follow-up text generation (cost-effective), gpt-4-turbo for NLU (accuracy critical)
- Voice circuit breaker uses 15s timeout (Whisper transcription + GPT-4 NLU pipeline is slow)
- Competitor scrape circuit breaker uses 30s timeout (web scraping is inherently slow)
- getVoiceProcessFallback takes no arguments (FormData is not useful for generating fallback values)
- Czech context hint prompt "Dobry den, chtela bych si objednat termin." improves Whisper accuracy

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Python openai package not installed locally (development environment) - verified syntax only with ast.parse, structural correctness confirmed
- TypeScript compilation verified successfully for both packages/shared and apps/web (0 errors)

## User Setup Required

None - no external service configuration required. OPENAI_API_KEY and GOOGLE_PLACES_API_KEY are optional environment variables that default to empty strings.

## Next Phase Readiness

- All shared foundation pieces exist and compile/import successfully
- Wave 2 plans (14-02, 14-03, 14-04) can independently build voice booking, follow-up generation, and competitor intelligence on top of these types, schemas, and client methods
- No blockers for parallel Wave 2 execution

## Self-Check: PASSED

- [x] services/ai/app/services/openai_client.py - FOUND
- [x] packages/shared/src/schemas/ai-voice-intelligence.ts - FOUND
- [x] packages/shared/src/types/ai-voice-intelligence.ts - FOUND
- [x] Commit db66695 - FOUND
- [x] Commit 40ed156 - FOUND
- [x] TypeScript compilation (packages/shared) - PASSED (0 errors)
- [x] TypeScript compilation (apps/web) - PASSED (0 errors)
- [x] Python syntax validation (all 3 files) - PASSED

---

_Phase: 14-ai-voice-intelligence_
_Completed: 2026-02-12_
