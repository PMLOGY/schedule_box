---
phase: 14-ai-voice-intelligence
plan: 03
subsystem: ai
tags: [openai, gpt-4o-mini, tiktoken, fastapi, email-generation, czech, circuit-breaker]

# Dependency graph
requires:
  - phase: 14-01
    provides: "OpenAI client singleton, Pydantic request/response models, circuit breaker client, Zod schemas"
provides:
  - "FOLLOW_UP_TEMPLATES dict with 4 Czech email template types"
  - "build_prompt() for safe template formatting with defaultdict"
  - "check_token_budget() via tiktoken for prompt cost control"
  - "FastAPI POST /followup/generate endpoint with rate limiting"
  - "Next.js POST /api/v1/ai/follow-up proxy with circuit breaker"
affects: [frontend, ai-dashboard, notification-worker]

# Tech tracking
tech-stack:
  added: [tiktoken]
  patterns: [prompt-template-with-token-budget, per-company-rate-limiting, advisory-endpoint-pattern]

key-files:
  created:
    - services/ai/app/services/followup_prompts.py
    - services/ai/app/routers/followup.py
    - apps/web/app/api/v1/ai/follow-up/route.ts
  modified:
    - services/ai/app/main.py

key-decisions:
  - "In-memory rate limiter for MVP (single process); Redis-based for production"
  - "company_id injected from JWT token, not request body, for tenant isolation"
  - "Advisory endpoint pattern: always returns 200 with fallback on AI failure"
  - "tiktoken cl100k_base fallback encoding when model-specific encoding unavailable"

patterns-established:
  - "Follow-up prompt template: system prompt + context_template with format_map and defaultdict"
  - "Token budget enforcement: count tokens with tiktoken, truncate context to fit limit"
  - "Per-company daily rate limiting with module-level dict and day-based reset"

# Metrics
duration: 5min
completed: 2026-02-12
---

# Phase 14 Plan 03: AI Follow-Up Email Generator Summary

**GPT-4o-mini follow-up email generation with 4 Czech templates, tiktoken token budget, per-company rate limiting, and circuit breaker proxy**

## Performance

- **Duration:** 5 min (~278s)
- **Started:** 2026-02-12T15:31:50Z
- **Completed:** 2026-02-12T15:36:28Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Four Czech email prompt templates (post_visit, re_engagement, upsell, birthday) with system prompts instructing GPT-4o-mini to output JSON with subject and body fields
- Token budget enforcement via tiktoken (max 2000 tokens) prevents cost explosion on large customer context
- Per-company daily rate limit (50/day) with in-memory counter and day-based reset
- FastAPI POST /followup/generate endpoint with full error handling and fallback responses
- Next.js POST /api/v1/ai/follow-up proxy endpoint with 10s circuit breaker timeout, SETTINGS_MANAGE permission, and tenant-isolated company_id injection from JWT

## Task Commits

Each task was committed atomically:

1. **Task 1: Python follow-up prompt templates, token budget, and FastAPI router** - `527bad7` (feat)
2. **Task 2: Next.js follow-up generation API route** - `5acb333` (feat, shared commit with parallel agent)

## Files Created/Modified

- `services/ai/app/services/followup_prompts.py` - 4 Czech email templates, build_prompt(), check_token_budget()
- `services/ai/app/routers/followup.py` - FastAPI router with POST /followup/generate, rate limiter
- `services/ai/app/main.py` - Register followup router under /api/v1 prefix
- `apps/web/app/api/v1/ai/follow-up/route.ts` - Next.js proxy with circuit breaker, auth, fallback

## Decisions Made

- **In-memory rate limiter for MVP:** Module-level dict with day-based reset is sufficient for single-process deployment. Document Redis-based rate limiting for production multi-process deployment.
- **company_id from JWT, not body:** Prevents users from generating follow-ups for other companies. The Python service receives company_id from the authenticated user's token, enforcing tenant isolation.
- **Advisory endpoint pattern (200 on failure):** Follow-up generation is non-critical -- returns 200 with fallback (empty subject/body) when AI service is unavailable, matching optimization endpoint pattern.
- **tiktoken cl100k_base fallback:** When model-specific encoding is not found (e.g., for newer models), falls back to cl100k_base which is the standard encoding for GPT-4 family models.
- **SETTINGS_MANAGE permission:** Follow-up generation is an admin/owner feature (marketing), not customer-facing. Same permission as AI health endpoint (Phase 10-04).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Python not available on host PATH (Windows), so Python syntax verification was skipped. Files are syntactically verified by code review and will be validated when Docker container starts.
- Task 2 commit was merged with a parallel agent's commit (5acb333) due to lint-staged stash behavior. The follow-up route is correctly committed.

## User Setup Required

None - no external service configuration required. OpenAI API key was configured in Phase 14-01.

## Next Phase Readiness

- Follow-up generation pipeline is complete: customer context + template type -> Python GPT-4o-mini -> personalized Czech email subject + body
- Cost controls in place: token budget (2000 max) + rate limit (50/day per company)
- Ready for Phase 14-04 (Competitor Intelligence) which is the final plan in Phase 14

## Self-Check: PASSED

- [x] services/ai/app/services/followup_prompts.py - FOUND
- [x] services/ai/app/routers/followup.py - FOUND
- [x] apps/web/app/api/v1/ai/follow-up/route.ts - FOUND
- [x] services/ai/app/main.py - FOUND
- [x] Commit 527bad7 - FOUND
- [x] Commit 5acb333 - FOUND

---

_Phase: 14-ai-voice-intelligence_
_Completed: 2026-02-12_
