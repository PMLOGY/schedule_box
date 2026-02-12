"""
Competitor Intelligence Router

FastAPI endpoints for competitor data scraping and retrieval.
POST /competitor/scrape -- Trigger scraping of a competitor's public website.
GET /competitor/data -- Retrieve previously scraped competitor data (placeholder).

Scraping is GDPR-safe: only collects publicly available aggregate business data.
Google Places API used for review data (no individual reviews stored).
"""

import logging

from fastapi import APIRouter, Query

from ..schemas.requests import CompetitorScrapeRequest, CompetitorDataRequest
from ..schemas.responses import (
    CompetitorScrapeResponse,
    CompetitorScrapeResult,
    CompetitorDataResponse,
)
from ..services.scraper import CompetitorScraper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/competitor", tags=["competitor"])


@router.post("/scrape", response_model=CompetitorScrapeResponse)
async def scrape_competitor(request: CompetitorScrapeRequest):
    """
    Trigger scraping of a competitor's public website data.

    Extracts pricing, services, and/or review data from public sources.
    Uses Google Places API for reviews (not direct scraping).
    GDPR-safe: only collects aggregate business data.

    Note: This is a synchronous scraping operation (takes 5-30s).
    For production, consider moving to a background job.
    """
    try:
        scraper = CompetitorScraper()
        results = await scraper.scrape_competitor(
            name=request.competitor_name,
            url=request.competitor_url,
            data_types=request.data_types,
        )
        return CompetitorScrapeResponse(
            results=[CompetitorScrapeResult(**r) for r in results],
            errors=[],
            fallback=False,
        )
    except Exception as e:
        logger.error(f"Competitor scraping failed: {e}")
        return CompetitorScrapeResponse(
            results=[],
            errors=[str(e)],
            fallback=True,
        )


@router.get("/data", response_model=CompetitorDataResponse)
async def get_competitor_data(
    company_id: int = Query(..., gt=0),
    competitor_name: str = Query(default=None),
    data_type: str = Query(default=None),
):
    """
    Retrieve previously scraped competitor data.

    Note: In the current architecture, competitor data storage is handled
    by the Node.js layer (writes to PostgreSQL competitor_data table).
    This endpoint is a placeholder for when the AI service has direct DB access.
    For now, the Node.js API route queries the database directly.
    """
    # Placeholder -- actual DB query happens in Node.js layer
    return CompetitorDataResponse(data=[], total=0, fallback=False)
