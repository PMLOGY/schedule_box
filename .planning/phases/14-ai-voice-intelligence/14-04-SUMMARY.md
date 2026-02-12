---
phase: 14-ai-voice-intelligence
plan: 04
subsystem: api
tags: [scraping, competitor-intelligence, beautifulsoup, google-places, httpx, drizzle]

# Dependency graph
requires:
  - phase: 14-01
    provides: Shared AI foundation types, Zod schemas, circuit breaker client, fallback functions
provides:
  - CompetitorScraper Python service with website scraping and Google Places API integration
  - FastAPI competitor router with POST /scrape and GET /data endpoints
  - competitor_monitors database table for admin-configurable monitoring
  - Next.js competitor API routes (GET/POST) with circuit breaker and DB storage
affects: [15-devops-launch, ai-dashboards, competitor-monitoring-scheduler]

# Tech tracking
tech-stack:
  added: [beautifulsoup4, httpx]
  patterns: [polite-scraping, gdpr-safe-aggregate-data, circuit-breaker-proxy-with-db-storage]

key-files:
  created:
    - services/ai/app/services/scraper.py
    - services/ai/app/routers/competitor.py
    - apps/web/app/api/v1/ai/competitor/route.ts
  modified:
    - packages/database/src/schema/analytics.ts
    - services/ai/app/main.py

key-decisions:
  - 'httpx over aiohttp for HTTP requests (already in requirements, fewer dependencies)'
  - 'Google Places API for reviews instead of direct scraping (ToS and GDPR compliance)'
  - 'GDPR-safe: only aggregate business data, never individual reviews or reviewer names'
  - 'Polite scraping: 5s delay between requests, proper User-Agent, 15s timeout'
  - 'Scrape results stored via Node.js layer (Drizzle ORM) not Python direct DB access'
  - 'competitor_monitors table with frequency check constraint (daily/weekly/monthly)'

patterns-established:
  - 'Polite scraping pattern: configurable delay, User-Agent, timeout per request'
  - 'Website-scrape-once pattern: single HTTP request serves both pricing and services data types'
  - 'Circuit breaker proxy with DB storage: POST triggers AI service, stores results in competitorData table'

# Metrics
duration: 6min
completed: 2026-02-12
---

# Phase 14 Plan 04: Competitor Intelligence Summary

**Web scraper for competitor pricing/services extraction with Google Places review aggregation, competitor_monitors table, and Next.js API routes with circuit breaker DB storage**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-12T15:32:10Z
- **Completed:** 2026-02-12T15:38:41Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- CompetitorScraper service with website scraping (pricing/services extraction via BeautifulSoup) and Google Places API review aggregation
- FastAPI competitor router registered in main.py with POST /scrape and GET /data endpoints
- competitor_monitors table added to analytics schema for admin-configurable monitoring (daily/weekly/monthly frequency)
- Next.js GET and POST competitor API routes with SETTINGS_MANAGE permission, circuit breaker, and automatic DB storage of scrape results

## Task Commits

Each task was committed atomically:

1. **Task 1: Python competitor scraper service and FastAPI router** - `e372b3e` (feat)
2. **Task 2: Database schema extension and Next.js competitor API routes** - `170ce60` (feat)

## Files Created/Modified

- `services/ai/app/services/scraper.py` - CompetitorScraper with scrape_website(), scrape_google_reviews(), scrape_competitor()
- `services/ai/app/routers/competitor.py` - FastAPI router with POST /scrape and GET /data
- `services/ai/app/main.py` - Registered competitor router with /api/v1 prefix
- `packages/database/src/schema/analytics.ts` - Added competitor_monitors table with boolean import
- `apps/web/app/api/v1/ai/competitor/route.ts` - GET/POST endpoints with circuit breaker and DB storage

## Decisions Made

- Used httpx (already in requirements) instead of aiohttp to minimize dependencies
- Google Places API for review aggregation (GDPR-safe, ToS compliant) -- never stores individual reviews
- Single website request serves both pricing and services data types (avoids duplicate requests)
- POST /competitor triggers Python AI service then stores results in competitorData table via Drizzle ORM
- GET /competitor queries competitorData table directly (bypasses Python service for data retrieval)
- competitor_monitors table uses CHECK constraint for scrape_frequency validation (daily/weekly/monthly)
- Max 5 competitors per company enforced at API level (settings.MAX_COMPETITORS_PER_COMPANY)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Python not available in bash shell on Windows (Windows Store alias) -- verified Python files structurally via grep and file existence checks instead of import verification
- Pre-commit hook lint-staged only handles TS files, so Python files required separate commit from main.py changes

## User Setup Required

None - no external service configuration required. Google Places API key is optional (scraper returns graceful error when not configured).

## Next Phase Readiness

- Competitor intelligence pipeline complete: admin triggers scrape -> Python extracts data -> Node.js stores in DB -> retrievable via GET
- competitor_monitors table ready for future scheduler integration (Phase 15)
- All Phase 14 plans (14-01 through 14-04) now complete

## Self-Check: PASSED

- All 5 files verified present on disk
- Commit e372b3e (Task 1) verified in git history
- Commit 170ce60 (Task 2) verified in git history

---

_Phase: 14-ai-voice-intelligence_
_Completed: 2026-02-12_
