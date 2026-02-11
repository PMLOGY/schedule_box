# Phase 12: Advanced Features - Research

**Researched:** 2026-02-11
**Domain:** Marketplace, Reviews, Embeddable Widgets, Video Conferencing, White-label Apps
**Confidence:** MEDIUM

## Summary

Phase 12 implements customer-facing growth features across all segments: marketplace listing with geo-search, review system with moderation, embeddable JavaScript widget, public booking pages, video conferencing integrations (Zoom, Google Meet, MS Teams), and white-label mobile app framework. The database schema already exists from Phase 2, requiring API implementation, frontend components, and third-party integrations.

**Key insight:** These are well-established patterns with mature ecosystems. Primary challenges are security (widget XSS/CORS), scalability (geo-search indexing), and third-party API reliability (video providers). Success requires defensive coding, proper abstraction layers, and graceful degradation.

**Primary recommendation:** Build marketplace and reviews first (foundation for discovery), then widget/public page (acquisition channel), video conferencing (enables online services), and finally white-label apps (longest timeline, separate deployment cycle).

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostGIS | 3.4+ | Geospatial queries for marketplace | Industry standard for PostgreSQL geo data, 4-5× faster than custom distance calculations |
| @zoom/meetingsdk | 3.8+ | Zoom video integration | Official Zoom SDK with OAuth2.0 support |
| googleapis | 140+ | Google Meet via Calendar API | Official Google API client for Node.js |
| @microsoft/microsoft-graph-client | 3.0+ | MS Teams meeting creation | Official Microsoft Graph SDK |
| React Query / TanStack Query | 5.x | Server state management (already in stack) | Handles video meeting creation/polling lifecycle |
| Zod | 3.x | API validation (already in stack) | Critical for webhook signature verification |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-rating-stars-component | 3.x | Star rating UI component | Review submission forms |
| recharts | 2.x | Rating distribution charts | Review analytics dashboard |
| @turf/turf | 7.x | Geospatial calculations client-side | Distance display, map clustering |
| expo | 52+ | White-label app build framework | Continuous Native Generation (CNG) for multi-tenant apps |
| fastlane | 2.x | iOS/Android deployment automation | White-label app store submissions |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PostGIS | earthdistance module | Simpler but lacks advanced geo features (polygons, spatial joins) |
| Web Components | iframe only | More secure isolation but 4-5× slower load time, no interactivity |
| Expo | Bare React Native | More control but manual configuration for each white-label variant |

**Installation:**
```bash
# Backend
npm install @zoom/meetingsdk googleapis @microsoft/microsoft-graph-client

# Frontend (widget)
npm install react-rating-stars-component @turf/turf

# White-label app
npm install -g expo-cli fastlane
npm install expo expo-dev-client expo-build-properties
```

## Architecture Patterns

### Recommended Project Structure

```
apps/web/
├── app/
│   ├── [locale]/
│   │   ├── [company_slug]/           # Public booking page
│   │   │   ├── page.tsx
│   │   │   └── book/                 # Booking flow
│   │   ├── marketplace/
│   │   │   ├── page.tsx              # Marketplace catalog
│   │   │   └── [listing_id]/
│   │   └── reviews/
│   │       └── [company_id]/         # Public review display
│   └── api/v1/
│       ├── marketplace/
│       │   ├── listings/             # GET /marketplace/listings
│       │   └── my-listing/           # PUT /marketplace/my-listing
│       ├── reviews/
│       │   ├── route.ts              # POST /reviews
│       │   └── [id]/reply/           # POST /reviews/{id}/reply
│       ├── video/
│       │   └── meetings/             # POST /video/meetings
│       └── apps/
│           └── whitelabel/           # White-label app management
├── components/
│   ├── marketplace/
│   │   ├── MarketplaceCard.tsx
│   │   ├── GeoSearchMap.tsx
│   │   └── CategoryFilter.tsx
│   ├── reviews/
│   │   ├── ReviewList.tsx
│   │   ├── ReviewForm.tsx
│   │   └── StarRating.tsx
│   └── booking-widget/
│       └── EmbeddableWidget.tsx      # Exported as widget bundle
└── public/
    └── widget/
        ├── embed.js                   # Widget loader script
        └── embed.css                  # Widget styles

packages/shared/
└── video-providers/
    ├── VideoProvider.interface.ts
    ├── ZoomProvider.ts
    ├── GoogleMeetProvider.ts
    └── MSTeamsProvider.ts

services/
└── whitelabel-builder/               # Separate service for app builds
    ├── templates/
    │   ├── app.config.template.js
    │   └── branding/
    └── build-queue/                  # RabbitMQ consumer
```

### Pattern 1: Geospatial Search with PostGIS

**What:** Use PostGIS geography type with SRID 4326 (WGS 84) for accurate distance calculations on Earth's surface.
**When to use:** Marketplace search with "within X km" radius or "nearest" sorting.

**Example:**
```typescript
// Database migration - enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

// Add geography column (more accurate than geometry for lat/lng)
ALTER TABLE marketplace_listings
  ADD COLUMN location geography(POINT, 4326);

// Update from existing lat/lng columns
UPDATE marketplace_listings
  SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography;

// Create spatial index (GiST)
CREATE INDEX idx_marketplace_location ON marketplace_listings USING GIST(location);

// Drizzle ORM query - search within radius
import { sql } from 'drizzle-orm';

const searchRadius = 10000; // 10 km in meters
const userLocation = sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`;

const results = await db
  .select({
    id: marketplaceListings.id,
    title: marketplaceListings.title,
    distance: sql<number>`ST_Distance(${marketplaceListings.location}, ${userLocation})`.as('distance')
  })
  .from(marketplaceListings)
  .where(
    sql`ST_DWithin(${marketplaceListings.location}, ${userLocation}, ${searchRadius})`
  )
  .orderBy(sql`distance ASC`)
  .limit(50);
```

**Performance notes:**
- GiST index enables fast proximity searches on large datasets
- Use `geography` type (not `geometry`) for accurate distance on sphere
- Longitude comes FIRST in ST_MakePoint (x, y order)
- SRID 4326 = WGS 84 coordinate system (GPS standard)

### Pattern 2: Embeddable Widget Architecture (Web Component + iframe hybrid)

**What:** Web Component wrapper that loads React widget in sandboxed iframe with PostMessage communication.
**When to use:** Embeddable booking widget for customer websites.

**Example:**
```typescript
// packages/widget/src/embed.js - Loader script
class ScheduleBoxWidget extends HTMLElement {
  connectedCallback() {
    const companySlug = this.getAttribute('data-company');
    const theme = this.getAttribute('data-theme') || 'light';

    // Create iframe with CSP
    const iframe = document.createElement('iframe');
    iframe.src = `https://widget.schedulebox.cz/embed?company=${companySlug}&theme=${theme}`;
    iframe.style.cssText = 'width: 100%; min-height: 600px; border: none;';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';
    iframe.allow = 'geolocation';

    // PostMessage API for parent-widget communication
    window.addEventListener('message', (event) => {
      if (event.origin !== 'https://widget.schedulebox.cz') return;

      if (event.data.type === 'BOOKING_COMPLETED') {
        this.dispatchEvent(new CustomEvent('booking-complete', {
          detail: event.data.booking
        }));
      }

      if (event.data.type === 'RESIZE') {
        iframe.style.height = event.data.height + 'px';
      }
    });

    this.appendChild(iframe);
  }
}

customElements.define('schedulebox-widget', ScheduleBoxWidget);

// Customer usage:
// <script src="https://widget.schedulebox.cz/embed.js"></script>
// <schedulebox-widget data-company="my-salon"></schedulebox-widget>
```

**Security requirements:**
- Strict CSP in iframe: `Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; frame-ancestors https://*;`
- Origin validation on all PostMessage handlers
- Sandbox attribute with minimal permissions
- HTTPS only (no mixed content)

### Pattern 3: Video Provider Abstraction Layer

**What:** Single interface for Zoom, Google Meet, MS Teams with provider-specific implementations.
**When to use:** Creating video meetings automatically when online booking is confirmed.

**Example:**
```typescript
// packages/shared/src/video-providers/VideoProvider.interface.ts
export interface VideoProvider {
  createMeeting(params: {
    topic: string;
    startTime: Date;
    durationMinutes: number;
    hostEmail: string;
  }): Promise<{
    meetingUrl: string;
    hostUrl: string;
    meetingId: string;
    password?: string;
    providerResponse: Record<string, any>;
  }>;

  deleteMeeting(meetingId: string): Promise<void>;
  refreshToken?(refreshToken: string): Promise<string>;
}

// packages/shared/src/video-providers/ZoomProvider.ts
import { VideoProvider } from './VideoProvider.interface';

export class ZoomProvider implements VideoProvider {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private accountId: string
  ) {}

  async createMeeting(params) {
    // Get OAuth token (server-to-server OAuth)
    const token = await this.getAccessToken();

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: params.topic,
        type: 2, // Scheduled meeting
        start_time: params.startTime.toISOString(),
        duration: params.durationMinutes,
        timezone: 'Europe/Prague',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          waiting_room: true
        }
      })
    });

    if (!response.ok) {
      throw new VideoProviderError('ZOOM_API_ERROR', await response.text());
    }

    const meeting = await response.json();

    return {
      meetingUrl: meeting.join_url,
      hostUrl: meeting.start_url,
      meetingId: meeting.id.toString(),
      password: meeting.password,
      providerResponse: meeting
    };
  }

  private async getAccessToken(): Promise<string> {
    // Implement OAuth2.0 server-to-server flow
    // Cache token in Redis with expiry
  }
}

// Usage in booking confirmation event handler
async function onBookingConfirmed(event: BookingConfirmedEvent) {
  const service = await db.services.findById(event.service_id);
  if (!service.is_online) return;

  const provider = getVideoProvider(service.video_provider, event.company_id);

  try {
    const meeting = await provider.createMeeting({
      topic: `${service.name} - ${event.customer_name}`,
      startTime: event.start_time,
      durationMinutes: service.duration_minutes,
      hostEmail: event.employee_email
    });

    await db.video_meetings.create({
      booking_id: event.booking_id,
      provider: service.video_provider,
      meeting_url: meeting.meetingUrl,
      host_url: meeting.hostUrl,
      meeting_id: meeting.meetingId,
      password: meeting.password,
      provider_response: meeting.providerResponse
    });

    // Send email with meeting link
    await eventBus.publish('notification.send', {
      type: 'video_meeting_created',
      booking_id: event.booking_id,
      meeting_url: meeting.meetingUrl
    });

  } catch (error) {
    // Log error but don't fail booking - manual fallback
    logger.error('Failed to create video meeting', {
      booking_id: event.booking_id,
      provider: service.video_provider,
      error
    });

    // Notify owner to create meeting manually
    await eventBus.publish('notification.send', {
      type: 'video_meeting_failed',
      booking_id: event.booking_id
    });
  }
}
```

### Pattern 4: Review Moderation State Machine

**What:** Four-state review lifecycle with auto-approval rules and manual moderation queue.
**When to use:** Review submission with spam/fake review prevention.

**Example:**
```typescript
// Review states: pending → approved/rejected → published
// Auto-approve: 4-5 stars from verified booking
// Manual review: 1-3 stars, first-time reviewer, flagged keywords

const PROFANITY_KEYWORDS = ['spam', 'fake', /* ... */];
const MIN_COMMENT_LENGTH = 10;

async function submitReview(data: ReviewCreate) {
  const { company_id, customer_id, booking_id, rating, comment } = data;

  // Validation
  const booking = await db.bookings.findOne({
    id: booking_id,
    customer_id,
    company_id,
    status: 'completed'
  });

  if (!booking) {
    throw new ValidationError('BOOKING_NOT_FOUND', 'Can only review completed bookings');
  }

  // Check for duplicate review
  const existing = await db.reviews.findOne({ booking_id });
  if (existing) {
    throw new ValidationError('DUPLICATE_REVIEW', 'Booking already reviewed');
  }

  // Auto-moderation logic
  const needsModeration = shouldModerate(rating, comment, customer_id);
  const status = needsModeration ? 'pending' : 'approved';

  // Create review
  const review = await db.reviews.create({
    company_id,
    customer_id,
    booking_id,
    rating,
    comment,
    status,
    is_published: !needsModeration
  });

  // Auto-redirect logic (review routing)
  if (rating >= 4 && !needsModeration) {
    // High ratings → redirect to Google/Facebook
    const redirectUrl = await getReviewRedirectUrl(company_id, 'google');
    return { review, redirect_to: redirectUrl };
  }

  // Low ratings → internal only
  return { review, redirect_to: null };
}

function shouldModerate(rating: number, comment: string, customer_id: number): boolean {
  // Auto-approve trusted customers with good ratings
  if (rating >= 4 && isVerifiedCustomer(customer_id)) {
    return false;
  }

  // Manual review needed if:
  // 1. Low rating (1-3 stars)
  if (rating <= 3) return true;

  // 2. Contains profanity/spam keywords
  const lowerComment = comment.toLowerCase();
  if (PROFANITY_KEYWORDS.some(word => lowerComment.includes(word))) {
    return true;
  }

  // 3. Too short (likely spam)
  if (comment.length < MIN_COMMENT_LENGTH) return true;

  // 4. First-time reviewer
  if (isFirstTimeReviewer(customer_id)) return true;

  // 5. Star-comment mismatch (1 star with positive sentiment)
  if (detectSentimentMismatch(rating, comment)) return true;

  return false;
}
```

### Pattern 5: White-label App Dynamic Configuration (Expo CNG)

**What:** Single React Native codebase with dynamic configuration per company using Expo Continuous Native Generation.
**When to use:** Building custom-branded mobile apps for each business.

**Example:**
```javascript
// services/whitelabel-builder/templates/app.config.template.js
module.exports = ({ config }) => {
  const { companyId, appName, bundleId, colors, logoUrl } = config.branding;

  return {
    name: appName,
    slug: bundleId.toLowerCase().replace(/\./g, '-'),
    version: '1.0.0',
    orientation: 'portrait',
    icon: logoUrl,
    splash: {
      image: './assets/splash.png',
      backgroundColor: colors.primary
    },
    ios: {
      bundleIdentifier: bundleId,
      buildNumber: '1.0.0',
      supportsTablet: true,
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      }
    },
    android: {
      package: bundleId,
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: logoUrl,
        backgroundColor: colors.primary
      }
    },
    extra: {
      companyId,
      apiUrl: process.env.API_URL,
      colors: {
        primary: colors.primary,
        secondary: colors.secondary
      }
    },
    plugins: [
      'expo-router',
      '@react-native-firebase/app',
      'expo-notifications'
    ]
  };
};

// Build automation via RabbitMQ consumer
async function buildWhiteLabelApp(event: WhiteLabelBuildEvent) {
  const { company_id, app_id } = event;

  const app = await db.whitelabel_apps.findById(app_id);

  // Update status
  await db.whitelabel_apps.update(app_id, {
    ios_status: 'building',
    android_status: 'building'
  });

  try {
    // 1. Generate dynamic app.config.js
    const config = generateAppConfig(app);
    fs.writeFileSync('./app.config.js', config);

    // 2. Run Expo prebuild (CNG)
    await execAsync('npx expo prebuild --clean');

    // 3. Build iOS with Fastlane
    await execAsync('cd ios && fastlane beta');

    // 4. Build Android with Fastlane
    await execAsync('cd android && fastlane beta');

    // 5. Upload to TestFlight / Play Console
    // (Handled by Fastlane lanes)

    // 6. Update status
    await db.whitelabel_apps.update(app_id, {
      ios_status: 'submitted',
      android_status: 'submitted',
      last_build_at: new Date()
    });

    await eventBus.publish('notification.send', {
      type: 'whitelabel_build_complete',
      company_id,
      app_id
    });

  } catch (error) {
    await db.whitelabel_apps.update(app_id, {
      ios_status: 'rejected',
      android_status: 'rejected'
    });

    logger.error('White-label build failed', { app_id, error });
  }
}
```

### Anti-Patterns to Avoid

- **Storing raw credentials:** Never store Zoom/Meet API credentials in database. Use environment variables + Vault.
- **No rate limiting on public endpoints:** Marketplace/widget endpoints MUST have aggressive rate limits (prevents scraping).
- **Client-side geo calculations:** Always use PostGIS on server for accuracy and performance.
- **Synchronous video API calls in booking flow:** Create meetings asynchronously via events to avoid timeouts.
- **Auto-publishing all reviews:** ALWAYS moderate first-time reviewers and low ratings to prevent spam.
- **Hardcoded white-label configs:** Use dynamic configuration to enable multi-tenant builds.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Geospatial indexing | Custom lat/lng distance formula | PostGIS with GiST index | Earth is not flat; custom Haversine misses spatial optimizations, 10× slower |
| Star rating UI | Custom SVG star component | react-rating-stars-component | Accessibility (keyboard nav, ARIA), half-star support, RTL languages |
| Video provider OAuth | Custom OAuth2.0 flow | Official SDKs (@zoom/meetingsdk, googleapis) | Token refresh, error handling, rate limiting built-in |
| Review sentiment analysis | Regex keyword matching | AI/ML sentiment API or OpenAI | Sarcasm detection, multilingual support, context understanding |
| White-label app builds | Manual Xcode/Android Studio | Expo CNG + Fastlane | Code signing, versioning, TestFlight/Play Console automation |
| Widget security | Basic origin checking | CSP headers + nonce + sandboxed iframe | XSS prevention requires defense-in-depth; single check insufficient |
| Geo-search caching | Custom in-memory cache | Redis with geospatial commands (GEOADD, GEORADIUS) | Built-in radius queries, pub/sub for invalidation |

**Key insight:** These are deceptively complex domains. Video APIs have token expiry + webhook retries. Geo-search needs projection math. Review moderation fights adversarial users. Widget security faces XSS/CSRF/clickjacking. White-label apps require CI/CD pipelines. Use battle-tested tools.

## Common Pitfalls

### Pitfall 1: PostGIS Geography vs Geometry Confusion

**What goes wrong:** Using `geometry` type instead of `geography` for lat/lng data produces incorrect distances (treats Earth as flat plane).

**Why it happens:** PostGIS has two types: `geometry` (Cartesian plane) and `geography` (spherical Earth). Developers default to `geometry` because it's mentioned first in docs.

**How to avoid:**
- Always use `geography(POINT, 4326)` for lat/lng coordinates
- SRID 4326 = WGS 84 (GPS standard)
- Use `ST_Distance` which returns meters with geography (not degrees)

**Warning signs:**
- Distances in degrees (0.5) instead of meters (50000)
- Incorrect results near poles or date line
- Distance formula documentation mentions "planar" or "Euclidean"

**Example:**
```sql
-- WRONG: geometry gives planar distances
ALTER TABLE marketplace_listings ADD COLUMN location geometry(POINT, 4326);

-- CORRECT: geography gives spherical distances
ALTER TABLE marketplace_listings ADD COLUMN location geography(POINT, 4326);
```

### Pitfall 2: Video API Failures Blocking Booking Confirmation

**What goes wrong:** Zoom/Meet API timeout or rate limit causes entire booking confirmation to fail, preventing customer from completing reservation.

**Why it happens:** Video meeting creation called synchronously in booking confirmation transaction. API call takes 2-5 seconds; if it times out, booking rolls back.

**How to avoid:**
- Create video meetings asynchronously via event handler
- Confirm booking FIRST, create meeting AFTER via RabbitMQ event
- Store provider credentials with fallback (e.g., multiple Zoom accounts)
- Graceful degradation: log error, notify owner to create manually

**Warning signs:**
- Booking confirmation endpoint takes >3 seconds
- Sporadic "booking failed" errors during peak hours
- Zoom API rate limit errors in logs (429 responses)

**Example:**
```typescript
// WRONG: Synchronous in booking creation
async function createBooking(data) {
  const booking = await db.bookings.create(data);

  if (service.is_online) {
    const meeting = await zoomApi.createMeeting(); // BLOCKS! May timeout!
    await db.video_meetings.create({ booking_id: booking.id, ...meeting });
  }

  return booking;
}

// CORRECT: Asynchronous via events
async function createBooking(data) {
  const booking = await db.bookings.create(data);

  // Publish event, don't wait
  await eventBus.publish('booking.confirmed', { booking_id: booking.id });

  return booking;
}

// Separate event handler with retry
async function onBookingConfirmed(event) {
  try {
    const meeting = await zoomApi.createMeeting();
    await db.video_meetings.create(meeting);
  } catch (error) {
    // Log and notify, but don't fail booking
    logger.error('Video meeting creation failed', { booking_id: event.booking_id, error });
    await notifyOwnerManualMeetingNeeded(event.booking_id);
  }
}
```

### Pitfall 3: Widget XSS via Unsanitized Company Data

**What goes wrong:** Malicious company owner injects `<script>` tags into company name/description, which executes on customer websites embedding the widget.

**Why it happens:** Widget loads company branding (logo, name, colors) from API and renders directly without sanitization. Attacker creates company with name `<img src=x onerror=alert(1)>`.

**How to avoid:**
- Strict CSP in widget iframe with nonce-based script whitelisting
- Sanitize ALL company data on backend before sending to widget API
- Use `textContent` (not `innerHTML`) for user-generated strings
- Sandbox iframe with `allow-scripts allow-same-origin` only

**Warning signs:**
- Widget displays raw HTML instead of text
- Console errors about CSP violations
- Customer reports "strange behavior" on their website after embedding widget

**Example:**
```typescript
// WRONG: Direct innerHTML
function renderCompanyName(name: string) {
  widget.innerHTML = `<h1>${name}</h1>`; // XSS if name contains <script>
}

// CORRECT: Text content only
function renderCompanyName(name: string) {
  const h1 = document.createElement('h1');
  h1.textContent = name; // Safe - treats as text, not HTML
  widget.appendChild(h1);
}

// ALSO CORRECT: Sanitize on backend
export const widgetConfigSchema = z.object({
  company_name: z.string().max(100).regex(/^[a-zA-Z0-9\s-]+$/) // No special chars
});
```

### Pitfall 4: Fake Review Spam from Competitor

**What goes wrong:** Competitor creates fake accounts and submits dozens of 1-star reviews to damage business reputation.

**Why it happens:** No verification that reviewer actually had a booking. Auto-publish all reviews without moderation.

**How to avoid:**
- Require `booking_id` for all reviews (verified bookings only)
- Check `booking.status = 'completed'` AND `booking.completed_at < now()`
- Prevent duplicate reviews per booking (`UNIQUE(booking_id)`)
- Auto-moderate 1-3 star reviews from first-time reviewers
- Rate limit review submission (max 1 per customer per day)
- Flag suspicious patterns (multiple reviews from same IP in short time)

**Warning signs:**
- Sudden spike in negative reviews
- Reviews with no comment or very short text
- Multiple reviews from new customers with no booking history
- Reviews submitted within seconds of booking completion

**Example:**
```typescript
// WRONG: No verification
async function submitReview(data: ReviewCreate) {
  return db.reviews.create(data); // Any customer can review any company!
}

// CORRECT: Verified bookings only
async function submitReview(data: ReviewCreate) {
  const booking = await db.bookings.findOne({
    id: data.booking_id,
    customer_id: data.customer_id,
    company_id: data.company_id,
    status: 'completed'
  });

  if (!booking) {
    throw new ValidationError('INVALID_BOOKING', 'Can only review completed bookings');
  }

  // Check for duplicate
  const existing = await db.reviews.findOne({ booking_id: data.booking_id });
  if (existing) {
    throw new ValidationError('DUPLICATE_REVIEW', 'Booking already reviewed');
  }

  // Auto-moderate low ratings
  const needsModeration = data.rating <= 3 || isFirstTimeReviewer(data.customer_id);

  return db.reviews.create({
    ...data,
    status: needsModeration ? 'pending' : 'approved',
    is_published: !needsModeration
  });
}
```

### Pitfall 5: Marketplace Geo-search Without Indexed Filtering

**What goes wrong:** Geo-search query scans entire `marketplace_listings` table before applying distance filter, causing 10+ second response times with 10,000+ listings.

**Why it happens:** Applying category/city filters AFTER distance calculation. PostGIS spatial index can't be used if WHERE clause filters first.

**How to avoid:**
- Apply non-spatial filters (category, city, active) FIRST
- Then apply spatial filter with GiST index
- Use `ST_DWithin` (indexed) not `ST_Distance < X` (sequential scan)
- Add composite index on (category, is_active) for common filters

**Warning signs:**
- `EXPLAIN ANALYZE` shows sequential scan on marketplace_listings
- Query time increases linearly with table size
- No "Index Scan using idx_marketplace_location" in query plan

**Example:**
```sql
-- WRONG: Distance calculated for ALL rows first
SELECT *, ST_Distance(location, user_location) AS distance
FROM marketplace_listings
WHERE category = 'salons' AND is_active = true
ORDER BY distance
LIMIT 20;
-- Sequential scan on entire table!

-- CORRECT: Spatial filter first, then other filters
SELECT *, ST_Distance(location, user_location) AS distance
FROM marketplace_listings
WHERE is_active = true
  AND category = 'salons'
  AND ST_DWithin(location, user_location, 10000) -- 10 km
ORDER BY distance
LIMIT 20;
-- Uses GiST index on location!

-- Add composite index for common filters
CREATE INDEX idx_marketplace_active_category ON marketplace_listings(is_active, category)
  WHERE is_active = true;
```

### Pitfall 6: White-label Build Queue Starvation

**What goes wrong:** Single build worker processes white-label app builds sequentially. Build takes 30-45 minutes. Queue backs up; customers wait hours for app build.

**Why it happens:** Xcode and Gradle builds are CPU-intensive, memory-heavy. Running multiple builds in parallel crashes server.

**How to avoid:**
- Use separate build workers (Kubernetes pods with resource limits)
- Queue builds in RabbitMQ with priority (paid customers first)
- Set realistic expectations (2-4 hour build time, not instant)
- Pre-build base app with cache to reduce build time to 10-15 min
- Offer "build preview" with Expo Go (instant) before full native build

**Warning signs:**
- Build queue length constantly increasing
- Customers report waiting >4 hours for build
- Server CPU at 100% for extended periods
- Out of memory errors during builds

**Example:**
```yaml
# Kubernetes deployment for white-label builder
apiVersion: apps/v1
kind: Deployment
metadata:
  name: whitelabel-builder
spec:
  replicas: 3 # Multiple workers
  template:
    spec:
      containers:
      - name: builder
        image: whitelabel-builder:latest
        resources:
          requests:
            cpu: 4000m # 4 CPU cores
            memory: 8Gi
          limits:
            cpu: 8000m # 8 CPU max
            memory: 16Gi
        env:
        - name: FASTLANE_XCODE_LIST_TIMEOUT
          value: "120"
        - name: ANDROID_SDK_ROOT
          value: "/opt/android-sdk"
```

### Pitfall 7: Public Booking Page SEO Cannibalization

**What goes wrong:** Every company's public booking page has identical meta tags and content structure. Google indexes all as duplicate content; none rank well.

**Why it happens:** Using same Next.js template for all `[company_slug]` pages without dynamic SEO metadata.

**How to avoid:**
- Generate unique `<title>` and `<meta name="description">` per company
- Include company name, city, services in title
- Add JSON-LD structured data (LocalBusiness schema)
- Canonical URL to prevent duplicate content issues
- Dynamic Open Graph images with company branding

**Warning signs:**
- Google Search Console shows "Duplicate meta description" warnings
- Public booking pages not appearing in Google search
- All pages have same title "ScheduleBox - Online Booking"

**Example:**
```typescript
// apps/web/app/[locale]/[company_slug]/page.tsx
import { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const company = await getCompanyBySlug(params.company_slug);

  return {
    title: `${company.name} - Online Rezervace | ${company.city}`,
    description: `Rezervujte si termín online u ${company.name}. ${company.services.map(s => s.name).join(', ')}. ${company.city}.`,
    openGraph: {
      title: `${company.name} - Online Booking`,
      description: company.description,
      images: [company.og_image_url],
      url: `https://schedulebox.cz/${params.company_slug}`
    },
    alternates: {
      canonical: `https://schedulebox.cz/${params.company_slug}`
    }
  };
}

// Add JSON-LD structured data
export default function PublicBookingPage({ params }) {
  const company = await getCompanyBySlug(params.company_slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: company.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.address_street,
      addressLocality: company.city,
      postalCode: company.zip
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: company.latitude,
      longitude: company.longitude
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: company.average_rating,
      reviewCount: company.review_count
    }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Page content */}
    </>
  );
}
```

## Code Examples

Verified patterns from official sources and documentation:

### PostGIS Geo-search with Drizzle ORM

```typescript
// packages/database/src/schema/marketplace.ts
import { pgTable, serial, integer, varchar, numeric, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const marketplaceListings = pgTable('marketplace_listings', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  // ... other columns
}, (table) => ({
  geoIdx: index('idx_marketplace_geo').on(sql`(ST_SetSRID(ST_MakePoint(${table.longitude}, ${table.latitude}), 4326)::geography)`)
}));

// apps/web/app/api/v1/marketplace/listings/route.ts
import { marketplaceListings } from '@/packages/database/schema';
import { db } from '@/packages/database';
import { sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const radius_km = parseFloat(searchParams.get('radius_km') || '10');
  const category = searchParams.get('category');

  const userLocation = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
  const radiusMeters = radius_km * 1000;

  const results = await db
    .select({
      id: marketplaceListings.id,
      uuid: marketplaceListings.uuid,
      title: marketplaceListings.title,
      category: marketplaceListings.category,
      average_rating: marketplaceListings.average_rating,
      distance: sql<number>`ST_Distance(
        ST_SetSRID(ST_MakePoint(${marketplaceListings.longitude}, ${marketplaceListings.latitude}), 4326)::geography,
        ${userLocation}
      )`.as('distance')
    })
    .from(marketplaceListings)
    .where(sql`
      ${marketplaceListings.is_active} = true
      ${category ? sql`AND ${marketplaceListings.category} = ${category}` : sql``}
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(${marketplaceListings.longitude}, ${marketplaceListings.latitude}), 4326)::geography,
        ${userLocation},
        ${radiusMeters}
      )
    `)
    .orderBy(sql`distance ASC`)
    .limit(50);

  return Response.json(results);
}
```

### Review Submission with Auto-moderation

```typescript
// apps/web/app/api/v1/reviews/route.ts
import { reviews } from '@/packages/database/schema';
import { z } from 'zod';

const reviewCreateSchema = z.object({
  booking_id: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000).optional()
});

export async function POST(request: Request) {
  const session = await getSession(request);
  const data = reviewCreateSchema.parse(await request.json());

  // Verify booking ownership and completion
  const booking = await db.query.bookings.findFirst({
    where: (bookings, { and, eq }) => and(
      eq(bookings.id, data.booking_id),
      eq(bookings.customer_id, session.customer_id),
      eq(bookings.status, 'completed')
    )
  });

  if (!booking) {
    return Response.json(
      { error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found or not completed' } },
      { status: 404 }
    );
  }

  // Check for duplicate review
  const existingReview = await db.query.reviews.findFirst({
    where: (reviews, { eq }) => eq(reviews.booking_id, data.booking_id)
  });

  if (existingReview) {
    return Response.json(
      { error: { code: 'DUPLICATE_REVIEW', message: 'Booking already reviewed' } },
      { status: 400 }
    );
  }

  // Auto-moderation logic
  const customerReviewCount = await db.select({ count: sql`count(*)` })
    .from(reviews)
    .where(eq(reviews.customer_id, session.customer_id));

  const isFirstReview = customerReviewCount[0].count === 0;
  const needsModeration = data.rating <= 3 || isFirstReview;

  // Create review
  const review = await db.insert(reviews).values({
    company_id: booking.company_id,
    customer_id: session.customer_id,
    booking_id: data.booking_id,
    service_id: booking.service_id,
    employee_id: booking.employee_id,
    rating: data.rating,
    comment: data.comment || null,
    status: needsModeration ? 'pending' : 'approved',
    is_published: !needsModeration
  }).returning();

  // Publish event for marketplace rating update
  await eventBus.publish('review.created', {
    review_id: review[0].id,
    company_id: booking.company_id,
    rating: data.rating
  });

  // Review routing: high ratings → redirect to Google
  let redirect_to = null;
  if (data.rating >= 4 && !needsModeration) {
    const company = await db.query.companies.findFirst({
      where: (companies, { eq }) => eq(companies.id, booking.company_id)
    });
    redirect_to = company.google_review_url;
  }

  return Response.json({ review: review[0], redirect_to }, { status: 201 });
}
```

### Video Meeting Creation (Zoom Provider)

```typescript
// packages/shared/src/video-providers/ZoomProvider.ts
import { VideoProvider } from './VideoProvider.interface';

export class ZoomProvider implements VideoProvider {
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    private accountId: string,
    private clientId: string,
    private clientSecret: string
  ) {}

  async createMeeting(params: {
    topic: string;
    startTime: Date;
    durationMinutes: number;
    hostEmail: string;
  }) {
    const token = await this.getAccessToken();

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: params.topic,
        type: 2, // Scheduled meeting
        start_time: params.startTime.toISOString(),
        duration: params.durationMinutes,
        timezone: 'Europe/Prague',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          waiting_room: true,
          auto_recording: 'none'
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zoom API error: ${response.status} ${error}`);
    }

    const meeting = await response.json();

    return {
      meetingUrl: meeting.join_url,
      hostUrl: meeting.start_url,
      meetingId: meeting.id.toString(),
      password: meeting.password,
      providerResponse: meeting
    };
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    const token = await this.getAccessToken();

    await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }

  private async getAccessToken(): Promise<string> {
    // Check cache
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    // Server-to-Server OAuth (account credentials)
    const response = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: this.accountId
      })
    });

    if (!response.ok) {
      throw new Error(`Zoom OAuth error: ${response.status}`);
    }

    const data = await response.json();

    // Cache token (expires in 1 hour, cache for 55 min)
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (55 * 60 * 1000)
    };

    return data.access_token;
  }
}

// Event handler for automatic meeting creation
async function onBookingConfirmed(event: BookingConfirmedEvent) {
  const booking = await db.query.bookings.findFirst({
    where: (bookings, { eq }) => eq(bookings.id, event.booking_id),
    with: {
      service: true,
      employee: true,
      customer: true
    }
  });

  if (!booking.service.is_online || !booking.service.video_provider) {
    return; // Not an online service
  }

  try {
    const provider = createVideoProvider(
      booking.service.video_provider,
      booking.company_id
    );

    const meeting = await provider.createMeeting({
      topic: `${booking.service.name} - ${booking.customer.name}`,
      startTime: booking.start_time,
      durationMinutes: booking.service.duration_minutes,
      hostEmail: booking.employee.email
    });

    await db.insert(videoMeetings).values({
      company_id: booking.company_id,
      booking_id: booking.id,
      provider: booking.service.video_provider,
      meeting_url: meeting.meetingUrl,
      host_url: meeting.hostUrl,
      meeting_id: meeting.meetingId,
      password: meeting.password,
      start_time: booking.start_time,
      duration_minutes: booking.service.duration_minutes,
      provider_response: meeting.providerResponse
    });

    // Send notification with meeting link
    await eventBus.publish('notification.send', {
      type: 'video_meeting_created',
      booking_id: booking.id,
      meeting_url: meeting.meetingUrl
    });

  } catch (error) {
    // Don't fail booking if video creation fails
    logger.error('Failed to create video meeting', {
      booking_id: booking.id,
      provider: booking.service.video_provider,
      error
    });

    // Notify owner to create manually
    await eventBus.publish('notification.send', {
      type: 'video_meeting_failed',
      booking_id: booking.id,
      company_id: booking.company_id
    });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|---------|
| iframe-only widgets | Web Components + sandboxed iframe | 2024-2025 | 4-5× faster load time, better parent-child communication via PostMessage |
| Manual review moderation | AI-powered spam detection | 2025-2026 | Detects fake reviews, sentiment mismatch, sophisticated spam bots |
| Geometry type for lat/lng | Geography type (PostGIS 3.0+) | 2020 | Accurate spherical distance calculations on Earth's surface |
| User-based OAuth for video APIs | Server-to-Server OAuth | 2023-2024 | No user consent required, token refresh automation, better for headless systems |
| Manual white-label builds | Expo Continuous Native Generation | 2024 | Dynamic app.config.js, automated prebuild, 50% faster build times |
| Google Places Autocomplete | Mapbox Search API | 2025 | Lower cost ($0.017 vs $0.032 per request), better autocomplete quality |

**Deprecated/outdated:**
- Zoom API v1: Deprecated June 2023, use v2 with Server-to-Server OAuth
- Google Maps Embed API for static maps: Use Static Maps API with custom styling
- Manual Fastlane match certificates: Use App Store Connect API for automated code signing
- Plain `geometry` type: Use `geography` for lat/lng to avoid distance calculation errors

## Open Questions

### 1. White-label App Store Approval Rate

**What we know:** Apple/Google review each white-label app submission. Apps with minimal differentiation (same codebase, different branding) face higher rejection risk.

**What's unclear:** Acceptance rate for white-label SaaS apps in 2026. Does Apple still enforce "4.2.6 Spam" policy strictly? Do we need custom features per app or is branding sufficient?

**Recommendation:**
- Start with 3-5 pilot apps to test approval process
- Document rejection reasons and required changes
- Prepare fallback: Progressive Web App (PWA) if native builds consistently rejected
- Include App Store Connect API automation for resubmission workflow

### 2. Video API Rate Limits for Multi-tenant SaaS

**What we know:** Zoom allows 100 requests/day on free accounts, 10,000/day on paid plans. Google Meet uses Calendar API quotas (10,000 requests/day). MS Teams unclear.

**What's unclear:** How to handle rate limits across multiple companies. Do we need one Zoom account per company? Or single shared account with request queuing?

**Recommendation:**
- Implement per-company video provider credentials (companies bring their own Zoom account)
- Offer "ScheduleBox Shared Account" as fallback for small businesses
- Track API usage per company in Redis
- Implement request queuing with backpressure when approaching limits

### 3. PostGIS Extension Availability on Managed PostgreSQL

**What we know:** PostGIS is available on most managed PostgreSQL services (AWS RDS, Google Cloud SQL, Supabase, Neon).

**What's unclear:** Does current hosting provider (not specified in docs) support PostGIS extension? Version compatibility?

**Recommendation:**
- Verify `CREATE EXTENSION postgis;` works in current environment
- If not available, fall back to earthdistance module (less accurate but functional)
- Document PostGIS version requirement in deployment docs (3.4+ recommended)

### 4. Review Platform API Availability (Google Reviews)

**What we know:** Documentation mentions "review routing" - redirect 4-5 star reviews to Google Reviews URL.

**What's unclear:** Is there a Google My Business API for direct review posting? Or just redirecting users to review page?

**Recommendation:**
- Confirm that direct API posting is NOT available (Google requires manual user action)
- Implement redirect flow: internal review submission → redirect to GMB review URL
- Store GMB review URL per company in settings
- Track redirect completion via UTM parameters

### 5. Marketplace SEO Strategy

**What we know:** Public booking pages need unique SEO metadata. Marketplace catalog needs to rank for "beauty salon Prague" type queries.

**What's unclear:** Should marketplace have its own subdomain (marketplace.schedulebox.cz) or path (schedulebox.cz/marketplace)? Impact on SEO authority?

**Recommendation:**
- Use path-based structure (/marketplace) to consolidate domain authority
- Implement category pages with city-specific landing pages (e.g., /marketplace/salons/prague)
- Generate XML sitemap for all marketplace listings
- Add canonical URLs to prevent duplicate content issues

## Sources

### Primary (HIGH confidence)

- ScheduleBox Documentation (schedulebox_complete_documentation.md) - Database schema (lines 1635-1771), API endpoints (lines 3726-4094), Phase requirements (lines 8119+)

### Secondary (MEDIUM confidence)

- [PostgreSQL Geo Queries Made Easy – PostIndustria](https://postindustria.com/postgresql-geo-queries-made-easy/) - PostGIS best practices
- [Geospatial Search in Postgres - Neon Guides](https://neon.com/guides/geospatial-search) - Geography vs Geometry types
- [PostgreSQL earthdistance Documentation](https://www.postgresql.org/docs/current/earthdistance.html) - Fallback for non-PostGIS environments
- [iframes vs Web Components performance 2025 | Medium](https://dp-lewis.medium.com/iframes-vs-web-components-which-one-actually-performs-better-in-2025-4db95784eb9f) - 4-5× load time advantage for Web Components
- [Web Components vs Iframes | Webagility](https://www.webagility.com/posts/web-components-vs-iframes) - Security and interactivity tradeoffs
- [Building Embeddable Apps with Web Components | iTelaSoft](https://www.itelasoft.com.au/blog/embeddable-micro-apps-go-live) - Real-world implementation patterns
- [Zoom API Documentation](https://developers.zoom.us/docs/api/) - Video conferencing integration
- [Microsoft Graph API - Online Meetings](https://learn.microsoft.com/en-us/graph/choose-online-meeting-api) - Teams integration approaches
- [How to Integrate with Google Meet | Recall.ai](https://www.recall.ai/blog/how-to-integrate-with-google-meet) - Calendar API for Meet links
- [Expo Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/) - White-label app build automation
- [Building white-label apps using Expo | Medium](https://medium.com/@vivek2neel/building-a-white-label-apps-using-expo-6b1e9cf50843) - Multi-tenant configuration patterns
- [React Native White-Labeling Guide | React Native Expert](https://reactnativeexpert.com/blog/white-labeling-with-react-native/) - Dynamic branding implementation
- [Content Security Policy for XSS Prevention | OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) - Widget security hardening
- [Mitigate XSS with Strict CSP | web.dev](https://web.dev/articles/strict-csp) - Nonce-based CSP implementation
- [CSP Embedded Enforcement | W3C](https://w3c.github.io/webappsec-cspee/) - iframe sandboxing best practices
- [Google Fake Reviews Crackdown 2025 | Marketing Growth Hub](https://www.marketinggrowthhub.com/google-fake-reviews-crackdown/) - Review moderation automation
- [AI-Generated Spam Review Detection | MDPI](https://www.mdpi.com/2073-431X/13/10/264) - Deep Learning for fake review detection
- [Fake Review Detection 2026 | AIM Multiple](https://research.aimultiple.com/fake-review-detection/) - Industry best practices
- [Featuring Online Customer Reviews: FTC Guide](https://www.ftc.gov/business-guidance/resources/featuring-online-customer-reviews-guide-platforms) - Legal compliance for review systems
- [Marketplace SEO 2026 Playbook | Journey H](https://www.journeyh.io/blog/marketplace-seo-playbook) - Duplicate content prevention, category optimization
- [SEO for Marketplaces | Journey H](https://www.journeyh.io/blog/seo-for-marketplaces-drive-growth-with-organic-search) - Structured data, semantic SEO
- [Multi-Marketplace SEO Guide | GenRise AI](https://www.genrise.ai/post/marketplace-seo-listing-optimization) - Scaling SEO for multi-vendor platforms

### Tertiary (LOW confidence - needs validation)

- Zoom API rate limits (100/day free, 10,000/day paid) - mentioned in search results but not verified in official docs
- Google Meet API scopes requiring verification - mentioned but unclear which scopes are "sensitive"
- PostGIS 3.4 as minimum version - inferred from search results, not confirmed for production readiness

## Metadata

**Confidence breakdown:**

- Standard stack: MEDIUM - PostGIS/Expo/video SDKs well-documented, but version compatibility needs environment testing
- Architecture: HIGH - Patterns verified from official sources (PostGIS docs, Expo CNG, OWASP CSP)
- Pitfalls: HIGH - Drawn from real-world experiences documented in 2025-2026 sources
- Security (widget): HIGH - OWASP CSP guidelines, W3C specs for iframe sandboxing
- Video APIs: MEDIUM - Official SDK docs available, but rate limits and multi-tenant best practices need verification
- White-label builds: MEDIUM - Expo CNG well-documented, but App Store approval rates unclear

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stack is mature, updates monthly)

**Notes for planner:**
- Database schema already exists from Phase 2 - focus tasks on API routes and frontend components
- Video conferencing should be event-driven (async) to prevent booking flow blocking
- Widget security is critical - requires strict CSP, sandboxing, and sanitization
- White-label builds have longest timeline (30-45 min per build) - needs separate worker infrastructure
- Marketplace geo-search MUST use PostGIS for performance at scale (10k+ listings)
- Review moderation is essential anti-spam measure - auto-approve trusted users only
