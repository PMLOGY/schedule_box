# Phase 10: AI Phase 1 — Predictions - Research

**Researched:** 2026-02-11
**Domain:** Machine Learning microservices, Python ML stack (XGBoost, scikit-learn), Node.js circuit breaker patterns
**Confidence:** HIGH

## Summary

Phase 10 implements AI-powered predictions as a separate Python microservice that communicates with the Next.js backend via REST API. The AI service will provide three core predictions: (1) no-show risk for bookings using XGBoost, (2) Customer Lifetime Value (CLV) using Random Forest, and (3) customer health scores using RFM analysis with ML overlay. The architecture requires a robust fallback system with circuit breaker pattern to ensure the main application remains resilient when AI services are unavailable.

The standard stack for 2026 is FastAPI for the Python ML microservice (superior performance, async support, automatic validation), XGBoost 3.x for no-show prediction (proven in healthcare), scikit-learn for CLV regression, and Opossum circuit breaker for Node.js fault tolerance. Redis will serve as the online feature store for real-time predictions, with PostgreSQL storing training data and prediction history.

**Primary recommendation:** Build the AI service as a separate Docker container using FastAPI with multi-stage builds, implement Opossum circuit breaker in the Next.js backend, use Redis for feature caching, and ensure fallback values are returned immediately when AI is unavailable (circuit breaker open or timeout).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | 0.115+ | Python REST API framework | Async performance, Pydantic validation, automatic OpenAPI docs, ASGI-based for ML workloads |
| uvicorn | 0.32+ | ASGI server for FastAPI | Production-ready, hot reload in dev, WebSocket support |
| XGBoost | 3.2.0 | No-show prediction (binary classification) | Industry standard for tabular data, proven in healthcare no-show prediction (AUC 0.83-0.84) |
| scikit-learn | 1.5+ | CLV prediction (Random Forest), feature engineering | Standard ML library, RandomForestRegressor for CLV, preprocessing utilities |
| Pydantic | 2.10+ | Data validation and serialization | Type-safe request/response, automatic validation, FastAPI native integration |
| pandas | 2.2+ | Data manipulation and feature engineering | Standard for ML data pipelines, DataFrame operations for RFM analysis |
| numpy | 2.1+ | Numerical operations | Required by scikit-learn, efficient array operations |
| joblib | 1.4+ | Model serialization | Standard for scikit-learn model persistence, efficient large numpy arrays |
| opossum | 8.1+ | Circuit breaker for Node.js | Official Node.js circuit breaker, TypeScript support, fallback functions, configurable thresholds |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| python-dotenv | 1.0+ | Environment variable management | Load .env files in Python service |
| httpx | 0.28+ | Async HTTP client for Python | If AI service needs to call external APIs |
| redis-py | 5.2+ | Redis client for feature store | Online feature serving, prediction caching |
| python-multipart | 0.0.18+ | File upload support | If model files are uploaded via API |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| FastAPI | Flask | Flask is simpler but synchronous (WSGI) vs FastAPI's async (ASGI) — for ML inference with I/O waits, FastAPI is superior |
| XGBoost | LightGBM | LightGBM is faster to train on very large datasets, but XGBoost has broader adoption and better documentation for no-show prediction use cases |
| Random Forest | Gradient Boosting (XGBoost/LightGBM) | Gradient boosting might be more accurate but Random Forest is interpretable, faster to train, and documented specifically for CLV prediction |
| Opossum | hystrixJS, brakes | Opossum is actively maintained by RedHat (nodeshift), has better TypeScript support, and more recent updates |
| Redis feature store | PostgreSQL direct queries | Redis provides sub-millisecond latency for online serving vs 10-100ms for PostgreSQL, critical for real-time predictions |

**Installation:**

Python service (services/ai/requirements.txt):
```bash
fastapi==0.115.12
uvicorn[standard]==0.32.1
xgboost==3.2.0
scikit-learn==1.5.2
pandas==2.2.3
numpy==2.1.3
pydantic==2.10.6
pydantic-settings==2.7.2
python-dotenv==1.0.1
redis==5.2.1
joblib==1.4.2
httpx==0.28.1
```

Node.js backend (apps/web/package.json):
```bash
pnpm add opossum
pnpm add -D @types/opossum
```

## Architecture Patterns

### Recommended Project Structure

```
services/
├── ai/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── config.py               # Settings via pydantic-settings
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── no_show.py          # XGBoost no-show predictor
│   │   │   ├── clv.py              # Random Forest CLV predictor
│   │   │   └── health_score.py     # RFM + ML health score
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── predictions.py      # Prediction endpoints
│   │   │   └── health.py           # Health check endpoint
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── requests.py         # Pydantic request models
│   │   │   └── responses.py        # Pydantic response models
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── feature_store.py    # Redis feature serving
│   │   │   └── model_loader.py     # Model loading/caching
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── feature_engineering.py
│   ├── models/                     # Serialized model artifacts
│   │   ├── no_show_v1.0.0.joblib
│   │   ├── clv_v1.0.0.joblib
│   │   └── metadata.json
│   ├── scripts/
│   │   ├── train_no_show.py
│   │   ├── train_clv.py
│   │   └── evaluate.py
│   ├── tests/
│   │   ├── test_predictions.py
│   │   └── test_feature_engineering.py
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── .env.example

apps/web/lib/
├── ai/
│   ├── client.ts                   # AI service HTTP client
│   ├── circuit-breaker.ts          # Opossum configuration
│   └── fallback.ts                 # Fallback prediction values
```

### Pattern 1: AI Service with FastAPI

**What:** Standalone Python FastAPI microservice for ML predictions with health checks, automatic validation, and OpenAPI docs.

**When to use:** When you need async ML inference with multiple models, automatic request validation, and want OpenAPI documentation generated automatically.

**Example:**
```python
# services/ai/app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .routers import predictions, health
from .services.model_loader import load_models
from .config import settings

app = FastAPI(
    title="ScheduleBox AI Service",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Load ML models on startup"""
    await load_models()

app.include_router(predictions.router, prefix="/api/v1", tags=["predictions"])
app.include_router(health.router, tags=["health"])
```

```python
# services/ai/app/routers/predictions.py
from fastapi import APIRouter, Depends
from ..schemas.requests import NoShowPredictionRequest
from ..schemas.responses import NoShowPredictionResponse
from ..services.model_loader import get_no_show_model
from ..services.feature_store import get_features

router = APIRouter()

@router.post("/no-show-prediction", response_model=NoShowPredictionResponse)
async def predict_no_show(
    request: NoShowPredictionRequest,
    model = Depends(get_no_show_model)
):
    """Predict no-show probability for a booking"""
    try:
        # Get features from feature store or compute on-the-fly
        features = await get_features(request.booking_id)

        # Make prediction
        probability = model.predict_proba([features])[0][1]

        # Determine risk level
        risk_level = "high" if probability >= 0.5 else "medium" if probability >= 0.3 else "low"

        return NoShowPredictionResponse(
            booking_id=request.booking_id,
            no_show_probability=round(probability, 3),
            confidence=0.82,  # From model evaluation
            risk_level=risk_level,
            model_version="v1.0.0",
            fallback=False
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Pattern 2: Circuit Breaker with Opossum

**What:** Wrap AI service HTTP calls with circuit breaker to fail fast when AI is down, return fallback values immediately.

**When to use:** Always use when calling external services (especially AI/ML) that might be slow or unavailable.

**Example:**
```typescript
// apps/web/lib/ai/circuit-breaker.ts
import CircuitBreaker from 'opossum';
import { aiClient } from './client';

interface CircuitBreakerOptions {
  timeout: number; // Time in ms before timing out
  errorThresholdPercentage: number; // % of failures to trip circuit
  resetTimeout: number; // Time in ms before attempting to close circuit
}

const defaultOptions: CircuitBreakerOptions = {
  timeout: 5000, // 5 second timeout
  errorThresholdPercentage: 50, // Trip at 50% error rate
  resetTimeout: 30000, // Try again after 30 seconds
};

export function createAICircuitBreaker<T, R>(
  fn: (args: T) => Promise<R>,
  fallbackFn: (args: T) => R,
  options: Partial<CircuitBreakerOptions> = {}
): CircuitBreaker<[T], R> {
  const breaker = new CircuitBreaker(fn, {
    ...defaultOptions,
    ...options,
  });

  // Fallback function when circuit is open or call fails
  breaker.fallback(fallbackFn);

  // Event listeners for monitoring
  breaker.on('open', () => {
    console.warn('[Circuit Breaker] Circuit opened - AI service unavailable');
  });

  breaker.on('halfOpen', () => {
    console.info('[Circuit Breaker] Circuit half-open - testing AI service');
  });

  breaker.on('close', () => {
    console.info('[Circuit Breaker] Circuit closed - AI service restored');
  });

  return breaker;
}
```

```typescript
// apps/web/lib/ai/client.ts
import { createAICircuitBreaker } from './circuit-breaker';
import { getNoShowFallback, getCLVFallback, getHealthScoreFallback } from './fallback';

interface NoShowPredictionRequest {
  booking_id: number;
}

interface NoShowPredictionResponse {
  booking_id: number;
  no_show_probability: number;
  confidence: number;
  risk_level: 'low' | 'medium' | 'high';
  model_version: string;
  fallback: boolean;
}

async function callNoShowAPI(request: NoShowPredictionRequest): Promise<NoShowPredictionResponse> {
  const response = await fetch(`${process.env.AI_SERVICE_URL}/api/v1/no-show-prediction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`AI service error: ${response.status}`);
  }

  return response.json();
}

export const predictNoShow = createAICircuitBreaker(
  callNoShowAPI,
  getNoShowFallback,
  { timeout: 5000, errorThresholdPercentage: 50, resetTimeout: 30000 }
);

// Usage in API route:
// const prediction = await predictNoShow.fire({ booking_id: 123 });
```

```typescript
// apps/web/lib/ai/fallback.ts
import type { NoShowPredictionResponse, CLVPredictionResponse, HealthScoreResponse } from './types';

export function getNoShowFallback(request: { booking_id: number }): NoShowPredictionResponse {
  return {
    booking_id: request.booking_id,
    no_show_probability: 0.15, // Conservative default
    confidence: 0.0, // Zero confidence indicates fallback
    risk_level: 'low',
    model_version: 'fallback',
    fallback: true,
  };
}

export function getCLVFallback(request: { customer_id: number }): CLVPredictionResponse {
  // Fallback: Use heuristic (total_spent * 2.5)
  // This would be computed from customer data if available
  return {
    customer_id: request.customer_id,
    clv_predicted: 0, // Caller should compute from customer.total_spent * 2.5
    confidence: 0.0,
    model_version: 'fallback',
    fallback: true,
  };
}

export function getHealthScoreFallback(request: { customer_id: number }): HealthScoreResponse {
  return {
    customer_id: request.customer_id,
    health_score: 50, // Neutral default
    category: 'good',
    model_version: 'fallback',
    fallback: true,
  };
}
```

### Pattern 3: Feature Store with Redis

**What:** Cache computed features in Redis for fast online serving (sub-millisecond latency).

**When to use:** When you need real-time predictions with features computed from multiple database queries.

**Example:**
```python
# services/ai/app/services/feature_store.py
import redis.asyncio as redis
import json
from typing import Dict, Any
from ..config import settings

redis_client: redis.Redis = None

async def get_redis_client() -> redis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return redis_client

async def get_features(booking_id: int) -> Dict[str, Any]:
    """
    Get features from Redis feature store.
    Falls back to computing from database if not cached.
    """
    client = await get_redis_client()

    # Try to get from cache
    cache_key = f"features:booking:{booking_id}"
    cached = await client.get(cache_key)

    if cached:
        return json.loads(cached)

    # If not cached, compute and store
    # In production, this would query the main database
    features = await compute_features_from_db(booking_id)

    # Cache for 1 hour
    await client.setex(cache_key, 3600, json.dumps(features))

    return features

async def compute_features_from_db(booking_id: int) -> Dict[str, Any]:
    """
    Compute features from database.
    In production, this queries PostgreSQL via httpx to the main API.
    """
    # Placeholder - in production, make HTTP call to main API
    # GET /api/v1/bookings/{booking_id}/features (internal endpoint)
    return {
        'booking_lead_time_hours': 48,
        'customer_no_show_rate': 0.1,
        'customer_total_bookings': 5,
        'day_of_week': 1,  # Monday
        'hour_of_day': 14,
        'service_duration_minutes': 60,
        'service_price': 1500,
        'is_first_visit': 0,
        'has_payment': 1,
        'days_since_last_visit': 30,
    }
```

### Pattern 4: Multi-Stage Docker Build for ML Service

**What:** Use multi-stage Docker builds to minimize final image size (only runtime dependencies).

**When to use:** Always for production ML services - reduces deployment time and attack surface.

**Example:**
```dockerfile
# services/ai/Dockerfile

# Build stage - install all dependencies including build tools
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install to /install directory
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install --no-warn-script-location -r requirements.txt

# Runtime stage - minimal image with only runtime dependencies
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY ./app ./app
COPY ./models ./models

# Create non-root user
RUN addgroup --system --gid 1001 aiuser && \
    adduser --system --uid 1001 --gid 1001 aiuser && \
    chown -R aiuser:aiuser /app

USER aiuser

EXPOSE 8000

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Anti-Patterns to Avoid

- **Synchronous ML inference in Next.js API routes:** Never load scikit-learn or TensorFlow in Node.js - use separate Python service via HTTP
- **No fallback values:** Always provide sensible defaults when AI is unavailable, never let the entire booking flow fail because AI is down
- **Loading models on every request:** Load models once at startup and cache in memory, not on every prediction
- **Returning raw ML scores without interpretation:** Always provide risk_level/category/recommendation, not just 0.35 probability
- **Not versioning models:** Always include model_version in responses and store metadata.json with training date, metrics, features
- **Ignoring circuit breaker state:** Monitor circuit breaker events and alert when open (AI service down)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Circuit breaker pattern | Custom retry logic with counters | Opossum | Handles state machine (closed/open/half-open), exponential backoff, fallback functions, event monitoring - edge cases are complex |
| Feature scaling/normalization | Manual z-score calculation | scikit-learn StandardScaler, MinMaxScaler | Handles fit/transform separation, prevents data leakage, saves scaling parameters |
| Model serialization | JSON model exports | joblib (sklearn) or pickle | Efficient binary format, handles numpy arrays, preserves exact model state including hyperparameters |
| RFM scoring | Manual quantile calculation | pandas qcut() | Handles edge cases (duplicate values, empty bins), optimized for large datasets |
| Request validation | Manual JSON parsing + if checks | Pydantic models | Type coercion, nested validation, automatic error messages, OpenAPI schema generation |
| Async HTTP client | requests library in Python | httpx | Async/await support, HTTP/2, connection pooling, timeout handling |
| Model versioning system | Custom file naming | MLflow, DVC, or simple metadata.json | Track experiments, compare metrics, rollback capability, reproducibility |

**Key insight:** ML infrastructure has many subtle failure modes (stale features, data drift, model staleness, deployment rollback). Use battle-tested libraries for the plumbing so you can focus on model quality and business logic.

## Common Pitfalls

### Pitfall 1: Training/Serving Skew

**What goes wrong:** Features computed differently during training vs serving, causing poor production accuracy despite good training metrics.

**Why it happens:** Training uses batch SQL queries with lookbacks, serving uses cached/real-time data with slightly different logic.

**How to avoid:**
- Share feature engineering code between training and serving (extract to shared module)
- Use identical SQL/pandas logic for feature computation
- Test feature computation with sample data: assert train_features == serve_features
- Consider feature store (Redis) to serve exact same features used in training

**Warning signs:**
- Model performs well in offline evaluation but poorly in production
- Predictions don't match expected behavior for known edge cases
- Feature distributions in serving differ from training (monitor with histograms)

### Pitfall 2: Cold Start with No Training Data

**What goes wrong:** New company signs up, has zero bookings, AI tries to predict no-show but has no customer history.

**Why it happens:** Features like `customer_no_show_rate`, `days_since_last_visit` are undefined for new customers.

**How to avoid:**
- Check minimum data requirements before making predictions (e.g., ≥ 3 bookings for CLV)
- Use fallback values for missing features: `customer_no_show_rate = 0.15` (population average)
- Return fallback response with `fallback: true` flag when data insufficient
- Train separate model for new customers (e.g., first-visit no-show rate based on booking_lead_time only)

**Warning signs:**
- NaN values in feature vectors
- Errors like "customer_id not found in feature store"
- Fallback rate > 50% for a company

### Pitfall 3: Model Staleness

**What goes wrong:** Model trained 6 months ago on summer data, now it's winter and customer behavior has changed.

**Why it happens:** ML models are static snapshots, business patterns drift over time (seasonality, new services, price changes).

**How to avoid:**
- Schedule regular retraining (weekly for no-show, monthly for CLV)
- Monitor prediction accuracy in production (compare predicted vs actual no-shows)
- Store actual outcomes in ai_predictions table with `actual_outcome` column (filled when booking completes)
- Alert when accuracy drops below threshold (e.g., F1 < 0.60 for no-show)
- Track model_version in responses to know which model made each prediction

**Warning signs:**
- Gradual decline in accuracy metrics over time
- Seasonal patterns not reflected in predictions
- New features/services have poor predictions (not in training data)

### Pitfall 4: Blocking Main Application on AI Latency

**What goes wrong:** Booking creation takes 8 seconds because AI service is slow, users abandon.

**Why it happens:** Calling AI synchronously during booking creation, waiting for response before confirming booking.

**How to avoid:**
- Use circuit breaker with short timeout (5 seconds max)
- Return fallback immediately on timeout, don't block booking creation
- Consider async pattern: create booking first, update no_show_probability later via background job
- Cache predictions in Redis for frequently requested entities (customer health scores)
- Monitor AI service latency (p50, p95, p99) and alert if p95 > 2 seconds

**Warning signs:**
- API endpoint latency spikes when AI service is slow
- Circuit breaker frequently opening
- User complaints about slow booking flow

### Pitfall 5: Not Handling Model Load Failures

**What goes wrong:** AI service crashes on startup because model file is corrupted or missing, entire service is down.

**Why it happens:** Model loading happens in startup event, uncaught exception crashes the service.

**How to avoid:**
- Wrap model loading in try/except with logging
- Use health check endpoint that verifies models are loaded (`GET /health` returns 503 if models not ready)
- Store model files in persistent volume or object storage (S3/R2), not in container image
- Validate model files (check file size, attempt prediction on dummy data)
- Fall back to previous model version if new version fails to load

**Warning signs:**
- AI service restarts frequently (CrashLoopBackOff in Kubernetes)
- Health checks failing
- Errors like "FileNotFoundError: models/no_show_v1.0.0.joblib"

### Pitfall 6: Leaking Training Data into Production

**What goes wrong:** Training data includes bookings from the past year, including those from companies that haven't signed up yet (data leakage from future).

**Why it happens:** Not properly separating training data by time (temporal split) or company_id (tenant isolation).

**How to avoid:**
- Always use temporal split for training: train on data before date X, validate on data after date X
- For multi-tenant, train per-company models OR ensure feature engineering doesn't leak cross-company information
- Use proper cross-validation (TimeSeriesSplit, not random K-Fold) for time series data
- Filter training data: `WHERE created_at < '2025-12-31'` to ensure no future data leaks

**Warning signs:**
- Unrealistically high accuracy in training (e.g., AUC > 0.95 for no-show)
- Model performs worse in production than in training (should be opposite)
- Feature importance shows `created_at` or `booking_id` as top features (data leakage indicators)

## Code Examples

Verified patterns from official sources and documentation:

### XGBoost No-Show Predictor Training

```python
# services/ai/scripts/train_no_show.py
import xgboost as xgb
import pandas as pd
import numpy as np
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import roc_auc_score, precision_score, recall_score, f1_score
import joblib
import json
from datetime import datetime

def load_training_data() -> pd.DataFrame:
    """
    Load booking data from PostgreSQL for training.
    In production, this queries the main database.
    """
    # Placeholder - in production, query via psycopg2 or httpx
    # SELECT * FROM bookings WHERE created_at < NOW() - INTERVAL '30 days'
    # AND status IN ('completed', 'no_show')
    pass

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Feature engineering for no-show prediction.
    Must match serving feature computation exactly!
    """
    features = df.copy()

    # Time-based features
    features['booking_lead_time_hours'] = (
        (df['start_time'] - df['created_at']).dt.total_seconds() / 3600
    )
    features['day_of_week'] = df['start_time'].dt.dayofweek  # 0=Monday, 6=Sunday
    features['hour_of_day'] = df['start_time'].dt.hour
    features['is_weekend'] = df['start_time'].dt.dayofweek.isin([5, 6]).astype(int)

    # Customer history features (computed from previous bookings)
    features['customer_no_show_rate'] = df['customer_no_show_count'] / df['customer_total_bookings'].clip(lower=1)
    features['customer_total_bookings'] = df['customer_total_bookings']
    features['days_since_last_visit'] = (
        (df['created_at'] - df['customer_last_visit_at']).dt.total_seconds() / 86400
    ).fillna(999)  # 999 for new customers

    # Booking characteristics
    features['service_duration_minutes'] = df['service_duration_minutes']
    features['service_price'] = df['service_price']
    features['is_first_visit'] = (df['customer_total_bookings'] == 0).astype(int)
    features['has_payment'] = df['has_payment'].astype(int)

    # Target variable
    features['no_show'] = (df['status'] == 'no_show').astype(int)

    return features

def train_model():
    """Train XGBoost no-show predictor"""

    # Load and prepare data
    df = load_training_data()
    df_features = engineer_features(df)

    # Define feature columns (must be consistent across training and serving)
    feature_cols = [
        'booking_lead_time_hours',
        'customer_no_show_rate',
        'customer_total_bookings',
        'day_of_week',
        'hour_of_day',
        'is_weekend',
        'service_duration_minutes',
        'service_price',
        'is_first_visit',
        'has_payment',
        'days_since_last_visit',
    ]

    X = df_features[feature_cols]
    y = df_features['no_show']

    # Time series split for validation
    tscv = TimeSeriesSplit(n_splits=3)

    # XGBoost parameters (tuned for binary classification)
    params = {
        'objective': 'binary:logistic',
        'eval_metric': 'auc',
        'max_depth': 6,
        'learning_rate': 0.1,
        'n_estimators': 100,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'scale_pos_weight': (y == 0).sum() / (y == 1).sum(),  # Handle class imbalance
        'random_state': 42,
    }

    # Train final model on all data
    model = xgb.XGBClassifier(**params)
    model.fit(X, y)

    # Evaluate on last fold
    for train_idx, val_idx in tscv.split(X):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

        eval_model = xgb.XGBClassifier(**params)
        eval_model.fit(X_train, y_train)

        y_pred = eval_model.predict(X_val)
        y_pred_proba = eval_model.predict_proba(X_val)[:, 1]

        # Calculate metrics
        auc = roc_auc_score(y_val, y_pred_proba)
        precision = precision_score(y_val, y_pred)
        recall = recall_score(y_val, y_pred)
        f1 = f1_score(y_val, y_pred)

        print(f"Validation Metrics:")
        print(f"  AUC: {auc:.3f}")
        print(f"  Precision: {precision:.3f}")
        print(f"  Recall: {recall:.3f}")
        print(f"  F1: {f1:.3f}")

    # Save model
    model_version = "v1.0.0"
    model_path = f"models/no_show_{model_version}.joblib"
    joblib.dump(model, model_path)

    # Save metadata
    metadata = {
        'model_name': 'no_show_predictor',
        'model_version': model_version,
        'trained_at': datetime.now().isoformat(),
        'features': feature_cols,
        'metrics': {
            'auc': float(auc),
            'precision': float(precision),
            'recall': float(recall),
            'f1': float(f1),
        },
        'hyperparameters': params,
        'training_samples': len(X),
    }

    with open('models/metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"Model saved to {model_path}")
    print(f"Metadata saved to models/metadata.json")

if __name__ == '__main__':
    train_model()
```

### RFM-Based Health Score Calculation

```python
# services/ai/app/utils/feature_engineering.py
import pandas as pd
import numpy as np
from datetime import datetime

def calculate_rfm_scores(customers_df: pd.DataFrame, reference_date: datetime = None) -> pd.DataFrame:
    """
    Calculate RFM scores for customer health scoring.

    RFM = Recency, Frequency, Monetary
    - Recency: Days since last visit (lower is better)
    - Frequency: Number of visits in last 12 months (higher is better)
    - Monetary: Total spent in last 12 months (higher is better)

    Returns customer_df with rfm_recency, rfm_frequency, rfm_monetary, health_score columns.
    """
    if reference_date is None:
        reference_date = datetime.now()

    df = customers_df.copy()

    # Recency: days since last visit
    df['rfm_recency'] = (reference_date - pd.to_datetime(df['last_visit_at'])).dt.days
    df['rfm_recency'] = df['rfm_recency'].fillna(999)  # New customers

    # Frequency: total bookings (could be filtered to last 12 months)
    df['rfm_frequency'] = df['total_bookings']

    # Monetary: total spent (could be filtered to last 12 months)
    df['rfm_monetary'] = df['total_spent']

    # Score each dimension on 1-4 scale using quantiles
    # Recency: lower is better, so inverse the labels
    df['r_score'] = pd.qcut(df['rfm_recency'], q=4, labels=[4, 3, 2, 1], duplicates='drop')

    # Frequency and Monetary: higher is better
    df['f_score'] = pd.qcut(df['rfm_frequency'], q=4, labels=[1, 2, 3, 4], duplicates='drop')
    df['m_score'] = pd.qcut(df['rfm_monetary'], q=4, labels=[1, 2, 3, 4], duplicates='drop')

    # Convert to numeric
    df['r_score'] = pd.to_numeric(df['r_score'])
    df['f_score'] = pd.to_numeric(df['f_score'])
    df['m_score'] = pd.to_numeric(df['m_score'])

    # Weighted health score (0-100 scale)
    # Recency × 40% + Frequency × 35% + Monetary × 25%
    df['health_score'] = (
        df['r_score'] * 10 * 0.4 +
        df['f_score'] * 10 * 0.35 +
        df['m_score'] * 10 * 0.25
    ).round(0).astype(int)

    # Categorize health score
    def categorize_health(score):
        if score >= 80:
            return 'excellent'
        elif score >= 60:
            return 'good'
        elif score >= 40:
            return 'at_risk'
        else:
            return 'churning'

    df['health_category'] = df['health_score'].apply(categorize_health)

    return df
```

### Opossum Circuit Breaker with TypeScript

```typescript
// Source: https://github.com/nodeshift/opossum
// apps/web/lib/ai/circuit-breaker.ts

import CircuitBreaker from 'opossum';
import type { CircuitBreakerOptions } from 'opossum';

/**
 * Create a circuit breaker for AI service calls with automatic fallback.
 *
 * Circuit states:
 * - CLOSED: Normal operation, all requests pass through
 * - OPEN: Too many failures, all requests return fallback immediately
 * - HALF_OPEN: Testing if service recovered, limited requests pass through
 */
export function createAICircuitBreaker<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
  fallbackFn: (args: TArgs) => TResult,
  customOptions: Partial<CircuitBreakerOptions> = {}
): CircuitBreaker<[TArgs], TResult> {

  const options: CircuitBreakerOptions = {
    timeout: 5000, // Fail after 5 seconds
    errorThresholdPercentage: 50, // Open circuit at 50% error rate
    resetTimeout: 30000, // Try closing circuit after 30 seconds
    rollingCountTimeout: 10000, // Track errors over 10 second window
    rollingCountBuckets: 10, // Divide window into 10 buckets
    volumeThreshold: 5, // Need at least 5 requests before opening circuit
    ...customOptions,
  };

  const breaker = new CircuitBreaker<[TArgs], TResult>(fn, options);

  // Attach fallback function
  breaker.fallback(fallbackFn);

  // Monitor circuit breaker state changes
  breaker.on('open', () => {
    console.warn('[Circuit Breaker] OPEN - AI service unavailable, using fallback');
    // In production: send alert to monitoring system
  });

  breaker.on('halfOpen', () => {
    console.info('[Circuit Breaker] HALF_OPEN - Testing AI service recovery');
  });

  breaker.on('close', () => {
    console.info('[Circuit Breaker] CLOSED - AI service recovered');
    // In production: send recovery notification
  });

  breaker.on('fallback', (result) => {
    console.warn('[Circuit Breaker] Fallback triggered', { result });
  });

  // Track statistics
  breaker.on('snapshot', (snapshot) => {
    console.debug('[Circuit Breaker] Stats', {
      successes: snapshot.successes,
      failures: snapshot.failures,
      fallbacks: snapshot.fallbacks,
      timeouts: snapshot.timeouts,
    });
  });

  return breaker;
}

/**
 * Check circuit breaker health for monitoring endpoint
 */
export function getCircuitBreakerHealth(breaker: CircuitBreaker): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  state: 'OPEN' | 'CLOSED' | 'HALF_OPEN';
  stats: {
    successes: number;
    failures: number;
    fallbacks: number;
    timeouts: number;
  };
} {
  const stats = breaker.stats;
  const state = breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED';

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (state === 'OPEN') {
    status = 'unhealthy';
  } else if (state === 'HALF_OPEN' || stats.fallbacks > 0) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  return {
    status,
    state,
    stats: {
      successes: stats.successes,
      failures: stats.failures,
      fallbacks: stats.fallbacks,
      timeouts: stats.timeouts,
    },
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|---------|
| Flask for ML APIs | FastAPI | ~2020-2021 | Async support crucial for ML workloads with I/O waits, automatic validation reduces bugs |
| Manual model versioning (filenames) | MLflow/DVC/Model Registry | ~2019-2020 | Reproducibility, rollback capability, A/B testing different model versions |
| Direct PostgreSQL for feature serving | Redis feature store | ~2018-2019 | 100x latency improvement (1ms vs 100ms), critical for real-time predictions |
| WSGI servers (gunicorn) | ASGI servers (uvicorn) | ~2021-2022 | Better concurrency for ML inference, WebSocket support for streaming predictions |
| Python 3.7 | Python 3.12 | 2023-2024 | Performance improvements (10-60% faster), better type hints, pattern matching |
| Manual retry logic | Circuit breaker libraries (Opossum) | ~2017-2018 | Prevents cascading failures, configurable fallback strategies |

**Deprecated/outdated:**

- **Flask for new ML APIs:** Use FastAPI instead (async, validation, OpenAPI docs)
- **Pickle for model serialization:** Use joblib for scikit-learn models (more efficient for numpy arrays)
- **requests library:** Use httpx for async HTTP in Python (requests is synchronous only)
- **pandas 1.x:** Upgrade to pandas 2.x (2-4x performance improvement, Apache Arrow backend)
- **XGBoost <1.0:** XGBoost 3.x has better performance and more features (use latest stable)

## Open Questions

1. **Model Retraining Schedule**
   - What we know: Documentation specifies weekly for no-show, monthly for CLV
   - What's unclear: How to trigger retraining (cron job, event-driven, manual)?
   - Recommendation: Start with cron job in Kubernetes CronJob, run training script, deploy new model if metrics improve

2. **Multi-Tenant Model Training**
   - What we know: Each company has isolated data via RLS
   - What's unclear: Train one global model or per-company models?
   - Recommendation: Start with global model (simpler, requires less data per company), add per-company models later for premium tier

3. **Feature Engineering in API vs AI Service**
   - What we know: Features need customer/booking data from PostgreSQL
   - What's unclear: Should AI service query main DB directly or via Next.js API?
   - Recommendation: AI service calls Next.js internal API endpoint (`/api/internal/features/booking/:id`) for features to avoid duplicate DB connection logic

4. **Model Storage Location**
   - What we know: Models are serialized with joblib
   - What's unclear: Store in Docker image, persistent volume, or S3/R2?
   - Recommendation: Start with persistent volume (simple), migrate to R2 later when adding model versioning/rollback

5. **Health Score ML Overlay**
   - What we know: Documentation mentions "Gradient Boosting classifier (churn/active)" as ML overlay on RFM
   - What's unclear: Is this a separate model or enhancement to RFM scoring?
   - Recommendation: Phase 10 implements RFM-only health score (simple, interpretable), add ML overlay in Phase 14 (AI Phase 2)

## Sources

### Primary (HIGH confidence)

- **XGBoost Official Documentation** - https://xgboost.readthedocs.io/en/stable/ - Installation, Python API, model training
- **FastAPI Official Documentation** - https://fastapi.tiangolo.com/ - Framework features, async patterns, Pydantic integration
- **scikit-learn Official Documentation** - https://scikit-learn.org/stable/ - RandomForestRegressor, feature engineering, model persistence
- **Opossum GitHub Repository** - https://github.com/nodeshift/opossum - Circuit breaker API, TypeScript usage, configuration options
- **ScheduleBox Documentation** (schedulebox_complete_documentation.md lines 6846-7099) - AI model specifications, features, metrics, fallback strategy

### Secondary (MEDIUM confidence)

- [XGBoost PyPI Package](https://pypi.org/project/xgboost/) - Latest version 3.2.0, Python 3.10-3.14 compatibility
- [FastAPI Requirements Setup Guide 2026](https://www.zestminds.com/blog/fastapi-requirements-setup-guide-2025/) - Best practices for FastAPI in 2026
- [Step-by-Step Guide to Deploying ML Models with FastAPI and Docker](https://machinelearningmastery.com/step-by-step-guide-to-deploying-machine-learning-models-with-fastapi-and-docker/) - Multi-stage Docker builds, model serving patterns
- [Redis Feature Store Blog](https://redis.io/blog/feature-stores-for-real-time-artificial-intelligence-and-machine-learning/) - Feature store architecture, Feast with Redis integration
- [Feast with Redis Tutorial](https://redis.io/blog/feast-with-redis-tutorial-for-machine-learning/) - Online feature serving patterns
- [Healthcare No-Show Prediction Research](https://bmchealthservres.biomedcentral.com/articles/10.1186/s12913-023-09969-5) - XGBoost AUC 0.83-0.84, key features (lead time, no-show history)
- [DataCamp RFM Analysis Tutorial](https://www.datacamp.com/tutorial/introduction-customer-segmentation-python) - Python implementation of RFM segmentation
- [Opossum npm Package](https://www.npmjs.com/package/opossum) - Circuit breaker installation, usage examples

### Tertiary (LOW confidence)

- Various Medium/blog posts on CLV prediction with Random Forest - Approach validated but implementation details vary

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - XGBoost, FastAPI, scikit-learn, Opossum are well-documented, stable, industry-standard tools with official documentation verified
- Architecture: HIGH - FastAPI microservice pattern, circuit breaker pattern, feature store with Redis are proven patterns with official documentation
- Pitfalls: MEDIUM-HIGH - Training/serving skew and circuit breaker patterns are well-documented, but multi-tenant ML and cold start scenarios are project-specific

**Research date:** 2026-02-11
**Valid until:** 2026-03-31 (stable ML stack, unlikely to change in 6-8 weeks)

---

## RESEARCH COMPLETE

**Phase:** 10 - AI Phase 1 — Predictions
**Confidence:** HIGH

### Key Findings

- **FastAPI is the standard for ML microservices in 2026** - ASGI-based async performance crucial for ML workloads, Pydantic validation eliminates entire class of bugs, automatic OpenAPI docs
- **XGBoost 3.2.0 proven for no-show prediction** - Healthcare research shows AUC 0.83-0.84, key features are booking_lead_time, customer_no_show_history, payment_status
- **Circuit breaker pattern is essential** - Opossum library provides robust state machine (closed/open/half-open), fallback functions, prevents cascading failures when AI is down
- **Redis feature store provides sub-millisecond latency** - Critical for real-time predictions, 100x faster than PostgreSQL queries, Feast integration available if needed
- **Multi-stage Docker builds minimize attack surface** - Separate builder stage for compile-time dependencies, runtime image only includes Python runtime and models

### File Created

`.planning/phases/10-ai-predictions/10-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All libraries have official documentation, proven in production, stable versions available |
| Architecture | HIGH | FastAPI microservice, circuit breaker, feature store are well-documented patterns with official sources |
| Pitfalls | MEDIUM-HIGH | Training/serving skew and circuit breaker patterns well-documented, multi-tenant ML is project-specific |

### Open Questions

1. Model retraining trigger mechanism (cron vs event-driven) - recommend starting with Kubernetes CronJob
2. Global vs per-company model training strategy - recommend global model initially for simplicity
3. Feature engineering location (AI service vs Next.js API) - recommend internal API endpoint for features
4. Model storage (Docker image vs persistent volume vs R2) - recommend persistent volume initially, migrate to R2 later
5. Health score ML overlay implementation (RFM-only vs ML-enhanced) - recommend RFM-only for Phase 10, ML overlay in Phase 14

### Ready for Planning

Research complete. Planner can now create PLAN.md files for segments (DATABASE, BACKEND, DEVOPS) with specific tasks for implementing AI predictions with fallback system.
