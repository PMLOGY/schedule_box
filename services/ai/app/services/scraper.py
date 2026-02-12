"""
Competitor Intelligence Scraper

Extracts pricing, services, and aggregate review data from public competitor websites.
Uses httpx for async HTTP requests and BeautifulSoup for HTML parsing.
Google Places API for review aggregation (GDPR-safe, no personal data).

Rate limiting: 5s delay between requests to same domain (polite scraping).
"""

import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from ..config import settings

logger = logging.getLogger(__name__)

SCRAPE_TIMEOUT = 15.0  # 15s per request
SCRAPE_DELAY = 5.0  # 5s between requests to same domain (polite scraping)
USER_AGENT = "Mozilla/5.0 (compatible; ScheduleBox/1.0; +https://schedulebox.cz)"
MAX_DATA_TYPES = 3  # Max data types per scrape call

# Common Czech price patterns (CZK, Kc)
PRICE_PATTERN = re.compile(
    r"(\d[\d\s]*(?:[.,]\d{1,2})?)\s*(?:Kč|CZK|Kc|,-)",
    re.IGNORECASE,
)


class CompetitorScraper:
    """
    Scrapes public competitor data: pricing, services, and aggregate reviews.

    GDPR-safe: Never stores individual reviewer names or review text.
    Uses Google Places API for review aggregation (not direct review scraping).
    """

    def __init__(self, client: Optional[httpx.AsyncClient] = None):
        self._external_client = client
        self._client: Optional[httpx.AsyncClient] = client

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                follow_redirects=True,
                timeout=httpx.Timeout(SCRAPE_TIMEOUT),
                headers={"User-Agent": USER_AGENT},
            )
        return self._client

    async def _close_client(self) -> None:
        """Close the client if we created it (not if externally provided)."""
        if self._external_client is None and self._client is not None:
            await self._client.aclose()
            self._client = None

    async def scrape_website(self, url: str) -> dict:
        """
        Scrape a competitor website for pricing and service data.

        Extracts:
        - Pricing data: numbers followed by CZK/Kc patterns
        - Service names: from lists, headings, structured data
        - Page title for reference

        Args:
            url: The competitor website URL to scrape.

        Returns:
            Dict with services, pricing, source_url, and raw_title.
            On error, returns error message with empty lists.
        """
        try:
            client = await self._get_client()
            response = await client.get(url)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Extract pricing data
            pricing = self._extract_pricing(soup)

            # Extract service names
            services = self._extract_services(soup)

            # Extract from structured data (JSON-LD) if available
            structured = self._extract_structured_data(soup)
            if structured.get("services"):
                services.extend(structured["services"])
            if structured.get("pricing"):
                pricing.extend(structured["pricing"])

            # Deduplicate
            services = list(dict.fromkeys(services))
            pricing = self._deduplicate_pricing(pricing)

            result = {
                "services": services,
                "pricing": pricing,
                "source_url": url,
                "raw_title": soup.title.string if soup.title and soup.title.string else "",
            }

            # Polite scraping delay
            await asyncio.sleep(SCRAPE_DELAY)

            return result

        except httpx.TimeoutException:
            logger.warning(f"Timeout scraping {url}")
            return {"error": "timeout", "services": [], "pricing": [], "source_url": url}
        except httpx.HTTPStatusError as e:
            logger.warning(f"HTTP error scraping {url}: {e.response.status_code}")
            return {
                "error": f"http_{e.response.status_code}",
                "services": [],
                "pricing": [],
                "source_url": url,
            }
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
            return {"error": str(e), "services": [], "pricing": [], "source_url": url}

    def _extract_pricing(self, soup: BeautifulSoup) -> list[dict]:
        """Extract pricing data from HTML content."""
        pricing: list[dict] = []
        seen_prices: set[str] = set()

        # Look for tables with price-like content
        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all(["td", "th"])
                if len(cells) >= 2:
                    text = " ".join(cell.get_text(strip=True) for cell in cells)
                    match = PRICE_PATTERN.search(text)
                    if match:
                        service_name = cells[0].get_text(strip=True)
                        price_str = match.group(1).replace(" ", "").replace(",", ".")
                        key = f"{service_name}:{price_str}"
                        if key not in seen_prices and service_name:
                            seen_prices.add(key)
                            pricing.append(
                                {
                                    "service": service_name,
                                    "price": price_str,
                                    "currency": "CZK",
                                    "source": "table",
                                }
                            )

        # Look for price patterns in list items and divs
        for element in soup.find_all(["li", "div", "span", "p"]):
            text = element.get_text(strip=True)
            if len(text) > 200:  # Skip large text blocks
                continue
            match = PRICE_PATTERN.search(text)
            if match:
                # Try to extract service name (text before the price)
                price_pos = match.start()
                service_text = text[:price_pos].strip().rstrip("-–:").strip()
                price_str = match.group(1).replace(" ", "").replace(",", ".")
                if service_text and len(service_text) > 2:
                    key = f"{service_text}:{price_str}"
                    if key not in seen_prices:
                        seen_prices.add(key)
                        pricing.append(
                            {
                                "service": service_text[:200],
                                "price": price_str,
                                "currency": "CZK",
                                "source": "text",
                            }
                        )

        return pricing

    def _extract_services(self, soup: BeautifulSoup) -> list[str]:
        """Extract service names from HTML content."""
        services: list[str] = []

        # Look for service-related headings
        for heading in soup.find_all(["h2", "h3", "h4"]):
            text = heading.get_text(strip=True)
            # Skip navigation/footer headings
            if len(text) > 3 and len(text) < 100:
                parent = heading.parent
                if parent and parent.name not in ["nav", "footer", "header"]:
                    services.append(text)

        # Look for service lists
        for ul in soup.find_all("ul"):
            parent = ul.parent
            if parent and parent.name in ["nav", "footer", "header"]:
                continue
            items = ul.find_all("li", recursive=False)
            for item in items:
                text = item.get_text(strip=True)
                if 3 < len(text) < 100:
                    services.append(text)

        return services

    def _extract_structured_data(self, soup: BeautifulSoup) -> dict:
        """Extract data from JSON-LD structured data."""
        import json

        result: dict[str, list] = {"services": [], "pricing": []}

        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
                if isinstance(data, dict):
                    self._parse_jsonld_item(data, result)
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict):
                            self._parse_jsonld_item(item, result)
            except (json.JSONDecodeError, TypeError):
                continue

        return result

    def _parse_jsonld_item(self, data: dict, result: dict) -> None:
        """Parse a single JSON-LD item for service/pricing data."""
        schema_type = data.get("@type", "")

        if schema_type in ("Service", "Product", "Offer"):
            name = data.get("name", "")
            if name:
                result["services"].append(name)

            # Check for price offers
            offers = data.get("offers", data.get("priceSpecification", {}))
            if isinstance(offers, dict):
                price = offers.get("price", "")
                if price:
                    result["pricing"].append(
                        {
                            "service": name or "Unknown",
                            "price": str(price),
                            "currency": offers.get("priceCurrency", "CZK"),
                            "source": "json-ld",
                        }
                    )

        # Check for hasOfferCatalog (common in service businesses)
        catalog = data.get("hasOfferCatalog", {})
        if isinstance(catalog, dict):
            for item in catalog.get("itemListElement", []):
                if isinstance(item, dict):
                    name = item.get("name", "")
                    if name:
                        result["services"].append(name)

    def _deduplicate_pricing(self, pricing: list[dict]) -> list[dict]:
        """Remove duplicate pricing entries."""
        seen: set[str] = set()
        unique: list[dict] = []
        for item in pricing:
            key = f"{item.get('service', '')}:{item.get('price', '')}"
            if key not in seen:
                seen.add(key)
                unique.append(item)
        return unique

    async def scrape_google_reviews(
        self, business_name: str, location: str
    ) -> dict:
        """
        Retrieve aggregate review data from Google Places API.

        Uses Google Places API (NOT direct scraping) for ToS compliance.
        Returns ONLY aggregate data (average rating, total reviews).
        NEVER stores individual review text or reviewer names (GDPR).

        Args:
            business_name: The competitor business name.
            location: Location hint (e.g., city name or domain).

        Returns:
            Dict with aggregate review data or error.
        """
        api_key = settings.GOOGLE_PLACES_API_KEY
        if not api_key:
            return {
                "error": "google_places_api_key_not_configured",
                "reviews": {},
            }

        try:
            client = await self._get_client()

            # Step 1: Find Place from text query
            find_url = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
            find_params = {
                "input": f"{business_name} {location}",
                "inputtype": "textquery",
                "fields": "place_id,name",
                "key": api_key,
            }
            find_response = await client.get(find_url, params=find_params)
            find_response.raise_for_status()
            find_data = find_response.json()

            candidates = find_data.get("candidates", [])
            if not candidates:
                return {
                    "error": "place_not_found",
                    "reviews": {},
                    "business_name": business_name,
                }

            place_id = candidates[0].get("place_id")
            if not place_id:
                return {
                    "error": "no_place_id",
                    "reviews": {},
                    "business_name": business_name,
                }

            # Step 2: Get Place Details for aggregate review data
            details_url = "https://maps.googleapis.com/maps/api/place/details/json"
            details_params = {
                "place_id": place_id,
                "fields": "name,rating,user_ratings_total",
                "key": api_key,
            }
            details_response = await client.get(details_url, params=details_params)
            details_response.raise_for_status()
            details_data = details_response.json()

            result_info = details_data.get("result", {})

            # Polite delay
            await asyncio.sleep(SCRAPE_DELAY)

            return {
                "average_rating": result_info.get("rating"),
                "total_reviews": result_info.get("user_ratings_total", 0),
                "business_name": result_info.get("name", business_name),
            }

        except httpx.TimeoutException:
            logger.warning(f"Timeout fetching Google reviews for {business_name}")
            return {"error": "timeout", "reviews": {}}
        except Exception as e:
            logger.error(f"Error fetching Google reviews for {business_name}: {e}")
            return {"error": str(e), "reviews": {}}

    async def scrape_competitor(
        self,
        name: str,
        url: str,
        data_types: list[str],
    ) -> list[dict]:
        """
        Orchestrate scraping for a competitor across multiple data types.

        Args:
            name: Competitor business name.
            url: Competitor website URL.
            data_types: List of data types to scrape (pricing, services, reviews).

        Returns:
            List of scrape results, one per data type.
        """
        # Enforce rate limit on data types
        if len(data_types) > MAX_DATA_TYPES:
            data_types = data_types[:MAX_DATA_TYPES]

        results: list[dict] = []
        now = datetime.now(timezone.utc).isoformat()

        # Extract location hint from URL domain
        parsed = urlparse(url)
        location = parsed.netloc.replace("www.", "").split(".")[0] if parsed.netloc else ""

        website_data: Optional[dict] = None

        try:
            for data_type in data_types:
                if data_type in ("pricing", "services"):
                    # Scrape website once for both pricing and services
                    if website_data is None:
                        website_data = await self.scrape_website(url)

                    if data_type == "pricing":
                        results.append(
                            {
                                "competitor_name": name,
                                "data_type": "pricing",
                                "data": {
                                    "pricing": website_data.get("pricing", []),
                                    "source_url": url,
                                    "raw_title": website_data.get("raw_title", ""),
                                    "error": website_data.get("error"),
                                },
                                "scraped_at": now,
                            }
                        )
                    elif data_type == "services":
                        results.append(
                            {
                                "competitor_name": name,
                                "data_type": "services",
                                "data": {
                                    "services": website_data.get("services", []),
                                    "source_url": url,
                                    "raw_title": website_data.get("raw_title", ""),
                                    "error": website_data.get("error"),
                                },
                                "scraped_at": now,
                            }
                        )

                elif data_type == "reviews":
                    review_data = await self.scrape_google_reviews(name, location)
                    results.append(
                        {
                            "competitor_name": name,
                            "data_type": "reviews",
                            "data": review_data,
                            "scraped_at": now,
                        }
                    )
        finally:
            await self._close_client()

        return results
