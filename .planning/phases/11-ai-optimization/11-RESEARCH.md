# Phase 11: AI Phase 2 -- Optimization - Research

**Researched:** 2026-02-11
**Domain:** ML-based optimization systems (recommendation engines, dynamic pricing, time series forecasting, Bayesian optimization)
**Confidence:** MEDIUM-HIGH

## Summary

Phase 11 extends the Phase 10 AI Python microservice (FastAPI) with four optimization models: (1) Smart upselling via item-based collaborative filtering, (2) Dynamic pricing via Thompson Sampling multi-armed bandit, (3) Capacity optimization via time series demand forecasting, and (4) Smart reminder timing via Bayesian optimization. These all build directly on the existing `services/ai/` FastAPI service, the Opossum circuit breaker client in `apps/web/lib/ai/`, and the `ai_predictions` database table which already includes type checks for `upsell`, `optimal_price`, and `reminder_timing`.

The key architectural decision is that **all four models are additions to the existing Phase 10 AI microservice**, not new services. This means adding new model classes, new FastAPI router endpoints, new training scripts, and extending the Node.js circuit breaker client with new prediction types. On the frontend, a new upselling widget needs to be injected into the booking wizard's Step 1 (service selection), and capacity/pricing dashboards for the admin.

The documentation specifies LSTM for capacity optimization, but for an SMB SaaS with limited per-company data (typically hundreds to low thousands of bookings), Prophet or statistical methods (ARIMA/ETS via statsforecast) are more practical. LSTM requires large datasets to avoid overfitting and adds PyTorch as a ~2GB Docker dependency. This research recommends **Prophet as the primary capacity forecasting engine** with LSTM as a future upgrade path, while noting the documentation's LSTM specification. The planner should decide whether to follow the documentation literally (LSTM) or use the pragmatic recommendation (Prophet).

**Primary recommendation:** Add four new model classes to `services/ai/`, extend the FastAPI prediction router with four new endpoints, extend the Node.js circuit breaker client with four new prediction types, and create frontend upselling widget for the booking wizard. Use scipy/sklearn for collaborative filtering (no new dependencies), numpy for Thompson Sampling (no new dependencies), bayesian-optimization 3.2.0 for reminder timing, and Prophet (or statsforecast) for capacity forecasting.

## Standard Stack

### Core (additions to Phase 10 stack)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| scipy.sparse | (bundled with scipy 1.14+) | Sparse customer-service matrix for collaborative filtering | Standard for sparse matrix operations, already available via scikit-learn dependency |
| sklearn.metrics.pairwise | (bundled with scikit-learn 1.5+) | Cosine similarity computation for item-based CF | Production-grade, handles sparse matrices natively, already in requirements.txt |
| sklearn.neighbors.NearestNeighbors | (bundled with scikit-learn 1.5+) | Efficient top-K similar item retrieval | Avoids computing full N*N similarity matrix, scales to thousands of items |
| numpy | 2.1+ | Thompson Sampling (Beta distribution sampling) for dynamic pricing | numpy.random.beta() is all that's needed for MAB, zero additional dependencies |
| bayesian-optimization | 3.2.0 | Gaussian Process optimization for reminder timing | MIT license, pure Python, 3.9-3.14 support, well-maintained (Dec 2025 release) |
| prophet | 1.1.6+ | Time series demand forecasting for capacity optimizer | Handles seasonality (daily, weekly, yearly), holidays, missing data. Lightweight vs LSTM |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| statsforecast | 2.0+ | Alternative to Prophet with ARIMA/ETS/Theta | If Prophet dependency issues arise or faster training needed for batch forecasting |
| torch | 2.5+ | LSTM neural network for capacity optimizer | Only if documentation's LSTM requirement is strictly enforced (adds ~2GB to Docker image) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| scipy cosine_similarity | implicit library (0.7.2) | implicit has GPU support and ALS, but overkill for item-based CF on small SMB datasets; scipy is already in requirements.txt |
| scipy cosine_similarity | Surprise library (scikit-surprise) | Surprise has built-in CF algorithms but adds dependency; scipy/sklearn already covers item-based CF with cosine similarity |
| Thompson Sampling (numpy) | Vowpal Wabbit contextual bandits | VW is more powerful but massive dependency for a simple pricing bandit; numpy Beta sampling is sufficient |
| Prophet | PyTorch LSTM | LSTM requires ~2GB PyTorch dependency, more training data, GPU for fast training. Prophet handles seasonality natively with additive model |
| Prophet | statsforecast AutoARIMA | statsforecast is faster for millions of series but Prophet is better documented and handles holiday effects which matter for booking demand |
| bayesian-optimization | Custom grid search | Bayesian optimization converges faster with fewer evaluations (critical when each "evaluation" is measuring real customer engagement) |

**Installation (additions to services/ai/requirements.txt):**
```bash
# Add to existing requirements.txt
bayesian-optimization==3.2.0
prophet==1.1.6
```

**Installation (Node.js - no new packages needed):**
The existing Opossum circuit breaker and AI client from Phase 10 are extended with new prediction types.

## Architecture Patterns

### Recommended Project Structure (additions to Phase 10)

```
services/ai/
├── app/
│   ├── models/
│   │   ├── upselling.py          # NEW: Item-based collaborative filtering
│   │   ├── pricing.py            # NEW: Thompson Sampling MAB
│   │   ├── capacity.py           # NEW: Prophet/LSTM demand forecaster
│   │   └── reminder_timing.py    # NEW: Bayesian optimization timing
│   ├── routers/
│   │   └── optimization.py       # NEW: 4 optimization endpoints
│   ├── schemas/
│   │   ├── requests.py           # EXTEND: Add optimization request models
│   │   └── responses.py          # EXTEND: Add optimization response models
│   └── services/
│       └── model_loader.py       # EXTEND: Load optimization models
├── scripts/
│   ├── train_upselling.py        # NEW: Build similarity matrix
│   ├── train_pricing.py          # NEW: Initialize pricing bandits
│   ├── train_capacity.py         # NEW: Train Prophet/LSTM model
│   └── train_reminder_timing.py  # NEW: Run Bayesian optimization
└── models/
    ├── upselling_v1.0.0.joblib   # Similarity matrix + item mapping
    ├── pricing_state.json        # MAB arm parameters (alpha/beta per context)
    ├── capacity_v1.0.0.joblib    # Prophet model per company
    └── reminder_timing.json      # Optimal timing per customer cluster

apps/web/
├── lib/ai/
│   ├── types.ts                  # EXTEND: Add optimization types
│   ├── fallback.ts               # EXTEND: Add optimization fallbacks
│   └── client.ts                 # EXTEND: Add optimization circuit breakers
├── app/api/v1/ai/
│   ├── optimization/
│   │   ├── upselling/route.ts    # NEW: Upselling endpoint
│   │   ├── pricing/route.ts      # NEW: Dynamic pricing endpoint
│   │   ├── capacity/route.ts     # NEW: Capacity forecast endpoint
│   │   └── reminder-timing/route.ts # NEW: Reminder timing endpoint
├── app/[locale]/(dashboard)/
│   └── ai/
│       ├── pricing/page.tsx      # NEW: Dynamic pricing dashboard
│       └── capacity/page.tsx     # NEW: Capacity optimizer dashboard
└── components/
    └── booking/
        └── upselling-suggestions.tsx # NEW: Upselling widget for booking wizard
```

### Pattern 1: Item-Based Collaborative Filtering (Smart Upselling)

**What:** Build a customer-service interaction matrix, compute item-item cosine similarity, recommend services similar to what the customer and similar customers have booked.

**When to use:** When customer has booking history and company has >= 100 customers and >= 10 services.

**Example:**
```python
# services/ai/app/models/upselling.py
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.neighbors import NearestNeighbors

class UpsellRecommender:
    """Item-based collaborative filtering for service upselling."""

    def __init__(self, similarity_matrix=None, service_ids=None,
                 popularity_fallback=None, model_version="v1.0.0"):
        self.similarity_matrix = similarity_matrix  # scipy sparse or dense
        self.service_ids = service_ids  # list of service IDs (column mapping)
        self.service_id_to_idx = {}
        if service_ids:
            self.service_id_to_idx = {sid: idx for idx, sid in enumerate(service_ids)}
        self.popularity_fallback = popularity_fallback or []  # top services by booking count
        self.model_version = model_version

    def recommend(self, current_service_id: int, customer_history: list[int],
                  n_recommendations: int = 3) -> list[dict]:
        """
        Recommend services based on current selection and customer history.
        Falls back to popularity-based if no model or insufficient data.
        """
        if self.similarity_matrix is None or current_service_id not in self.service_id_to_idx:
            return self._popularity_fallback(current_service_id, n_recommendations)

        idx = self.service_id_to_idx[current_service_id]

        # Get similarity scores for current service
        if hasattr(self.similarity_matrix, 'toarray'):
            scores = self.similarity_matrix[idx].toarray().flatten()
        else:
            scores = self.similarity_matrix[idx].flatten()

        # Exclude already-booked services and current service
        exclude_ids = set(customer_history + [current_service_id])
        for eid in exclude_ids:
            if eid in self.service_id_to_idx:
                scores[self.service_id_to_idx[eid]] = -1

        # Get top-N
        top_indices = np.argsort(scores)[::-1][:n_recommendations]

        recommendations = []
        for idx_rec in top_indices:
            if scores[idx_rec] <= 0:
                continue
            recommendations.append({
                "service_id": self.service_ids[idx_rec],
                "confidence": float(scores[idx_rec]),
                "reason": "collaborative_filtering"
            })

        # Pad with popularity fallback if insufficient
        if len(recommendations) < n_recommendations:
            fallback = self._popularity_fallback(
                current_service_id, n_recommendations - len(recommendations)
            )
            recommendations.extend(fallback)

        return recommendations[:n_recommendations]

    def _popularity_fallback(self, exclude_service_id: int, n: int) -> list[dict]:
        return [
            {"service_id": sid, "confidence": 0.3, "reason": "popular_service"}
            for sid in self.popularity_fallback
            if sid != exclude_service_id
        ][:n]

    @classmethod
    def build_from_bookings(cls, booking_data: list[dict]) -> 'UpsellRecommender':
        """
        Build similarity matrix from booking history.
        booking_data: list of {"customer_id": int, "service_id": int, "count": int}
        """
        customer_ids = sorted(set(b["customer_id"] for b in booking_data))
        service_ids = sorted(set(b["service_id"] for b in booking_data))

        cust_idx = {cid: i for i, cid in enumerate(customer_ids)}
        svc_idx = {sid: i for i, sid in enumerate(service_ids)}

        rows, cols, data = [], [], []
        for b in booking_data:
            rows.append(cust_idx[b["customer_id"]])
            cols.append(svc_idx[b["service_id"]])
            data.append(b["count"])

        # Build sparse customer-service matrix
        matrix = csr_matrix(
            (data, (rows, cols)),
            shape=(len(customer_ids), len(service_ids))
        )

        # Compute item-item similarity (transpose to get service-service)
        sim_matrix = cosine_similarity(matrix.T)

        # Compute popularity fallback (total bookings per service)
        svc_totals = matrix.sum(axis=0).A1
        top_services = [service_ids[i] for i in np.argsort(svc_totals)[::-1][:10]]

        return cls(
            similarity_matrix=sim_matrix,
            service_ids=service_ids,
            popularity_fallback=top_services,
        )
```

### Pattern 2: Thompson Sampling for Dynamic Pricing

**What:** Multi-armed bandit that learns optimal price for each service in each time context (day_of_week + hour_of_day + utilization level) by sampling from Beta distributions.

**When to use:** When service has dynamic_pricing_enabled=true and price_min/price_max are set.

**Example:**
```python
# services/ai/app/models/pricing.py
import numpy as np
import json
from typing import Optional

class PricingOptimizer:
    """Thompson Sampling multi-armed bandit for dynamic pricing."""

    # Discretize price range into N arms
    N_ARMS = 5  # e.g., price_min, +25%, +50%, +75%, price_max

    def __init__(self, state: dict = None, model_version="v1.0.0"):
        # State: { "context_key": {"alpha": [...], "beta": [...]} }
        self.state = state or {}
        self.model_version = model_version

    def get_optimal_price(
        self,
        service_id: int,
        price_min: float,
        price_max: float,
        hour_of_day: int,
        day_of_week: int,
        utilization: float,  # 0.0 to 1.0
    ) -> dict:
        """
        Select optimal price using Thompson Sampling.
        Returns price and confidence.
        """
        # Discretize context
        context_key = self._context_key(service_id, hour_of_day, day_of_week, utilization)

        # Get or initialize arm parameters for this context
        if context_key not in self.state:
            self.state[context_key] = {
                "alpha": [1.0] * self.N_ARMS,
                "beta": [1.0] * self.N_ARMS,
            }

        arms = self.state[context_key]

        # Thompson Sampling: sample from Beta distribution for each arm
        samples = [
            np.random.beta(arms["alpha"][i], arms["beta"][i])
            for i in range(self.N_ARMS)
        ]

        # Select arm with highest sample
        best_arm = int(np.argmax(samples))

        # Map arm to price
        prices = np.linspace(price_min, price_max, self.N_ARMS)
        optimal_price = float(prices[best_arm])

        # Calculate confidence from arm parameters
        total_obs = arms["alpha"][best_arm] + arms["beta"][best_arm] - 2
        confidence = min(total_obs / 100, 1.0)  # Normalize to 0-1

        return {
            "optimal_price": round(optimal_price, 2),
            "arm_selected": best_arm,
            "confidence": round(confidence, 3),
            "context_key": context_key,
        }

    def update_reward(self, context_key: str, arm: int, reward: bool):
        """
        Update arm parameters based on observed reward.
        reward=True: booking happened at this price (success)
        reward=False: no booking at this price (failure)
        """
        if context_key in self.state:
            if reward:
                self.state[context_key]["alpha"][arm] += 1
            else:
                self.state[context_key]["beta"][arm] += 1

    def _context_key(self, service_id, hour, day, utilization) -> str:
        util_bucket = "low" if utilization < 0.3 else "mid" if utilization < 0.7 else "high"
        return f"{service_id}:{day}:{hour // 4}:{util_bucket}"

    def save_state(self, path: str):
        with open(path, 'w') as f:
            json.dump(self.state, f)

    @classmethod
    def load_state(cls, path: str) -> 'PricingOptimizer':
        with open(path, 'r') as f:
            state = json.load(f)
        return cls(state=state)
```

### Pattern 3: Prophet for Capacity Forecasting

**What:** Additive time series model that forecasts booking demand per hour/day for the next 7 days, accounting for weekly/yearly seasonality and holidays.

**When to use:** When company has >= 12 weeks of booking history.

**Example:**
```python
# services/ai/app/models/capacity.py
from prophet import Prophet
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class CapacityForecaster:
    """Time series demand forecaster using Prophet."""

    def __init__(self, model=None, model_version="v1.0.0"):
        self.model = model
        self.model_version = model_version

    def forecast(self, days_ahead: int = 7) -> list[dict]:
        """
        Forecast booking demand for the next N days.
        Returns hourly predictions with utilization recommendations.
        """
        if self.model is None:
            return []  # Fallback: empty recommendations

        # Create future dataframe
        future = self.model.make_future_dataframe(
            periods=days_ahead * 24,
            freq='h'
        )

        # Predict
        forecast = self.model.predict(future)

        # Get only future predictions
        now = datetime.now()
        future_mask = forecast['ds'] >= now
        future_forecast = forecast[future_mask]

        results = []
        for _, row in future_forecast.iterrows():
            predicted_demand = max(0, row['yhat'])
            lower = max(0, row['yhat_lower'])
            upper = max(0, row['yhat_upper'])

            results.append({
                "datetime": row['ds'].isoformat(),
                "predicted_bookings": round(predicted_demand, 1),
                "lower_bound": round(lower, 1),
                "upper_bound": round(upper, 1),
                "utilization_level": self._classify_utilization(predicted_demand),
            })

        return results

    def suggest_schedule_changes(self, forecast_data: list[dict],
                                  current_capacity: int) -> list[dict]:
        """
        Based on forecast, suggest schedule modifications.
        """
        suggestions = []
        for entry in forecast_data:
            demand = entry["predicted_bookings"]
            if demand > current_capacity * 0.9:
                suggestions.append({
                    "datetime": entry["datetime"],
                    "type": "extend_hours",
                    "reason": f"Predicted demand ({demand:.0f}) near capacity ({current_capacity})",
                    "priority": "high"
                })
            elif demand < current_capacity * 0.3:
                suggestions.append({
                    "datetime": entry["datetime"],
                    "type": "reduce_hours",
                    "reason": f"Low predicted demand ({demand:.0f}), consider shorter hours",
                    "priority": "low"
                })
        return suggestions

    @classmethod
    def train(cls, booking_counts: pd.DataFrame) -> 'CapacityForecaster':
        """
        Train Prophet model from booking counts.
        booking_counts: DataFrame with 'ds' (datetime) and 'y' (booking count) columns.
        """
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=True,
            changepoint_prior_scale=0.05,  # Conservative for booking data
        )
        model.fit(booking_counts)
        return cls(model=model)

    def _classify_utilization(self, predicted: float) -> str:
        if predicted >= 8:
            return "high"
        elif predicted >= 4:
            return "medium"
        return "low"
```

### Pattern 4: Bayesian Optimization for Reminder Timing

**What:** Find the optimal number of minutes before a booking to send a reminder, maximizing notification open rate per customer cluster.

**When to use:** When company has >= 50 completed bookings with notification open/read tracking data.

**Example:**
```python
# services/ai/app/models/reminder_timing.py
from bayes_opt import BayesianOptimization
import json
import numpy as np

class ReminderTimingOptimizer:
    """Bayesian optimization for optimal reminder send time."""

    # Search space: 30 minutes to 2880 minutes (2 days)
    MIN_MINUTES = 30
    MAX_MINUTES = 2880
    DEFAULT_MINUTES = 1440  # 24 hours (fallback)

    def __init__(self, optimal_timings: dict = None, model_version="v1.0.0"):
        # optimal_timings: {"cluster_key": {"minutes": int, "open_rate": float}}
        self.optimal_timings = optimal_timings or {}
        self.model_version = model_version

    def get_optimal_timing(self, customer_id: int,
                           notification_channel: str = "email") -> dict:
        """
        Get optimal reminder timing for a customer.
        Returns minutes before booking to send reminder.
        """
        cluster_key = self._cluster_key(customer_id, notification_channel)

        if cluster_key in self.optimal_timings:
            timing = self.optimal_timings[cluster_key]
            return {
                "minutes_before": timing["minutes"],
                "expected_open_rate": timing.get("open_rate", 0.0),
                "confidence": timing.get("confidence", 0.5),
                "fallback": False,
            }

        # Fallback to channel default or global default
        channel_key = f"default:{notification_channel}"
        if channel_key in self.optimal_timings:
            timing = self.optimal_timings[channel_key]
            return {
                "minutes_before": timing["minutes"],
                "expected_open_rate": timing.get("open_rate", 0.0),
                "confidence": 0.3,
                "fallback": True,
            }

        return {
            "minutes_before": self.DEFAULT_MINUTES,
            "expected_open_rate": 0.0,
            "confidence": 0.0,
            "fallback": True,
        }

    def _cluster_key(self, customer_id: int, channel: str) -> str:
        # In production, cluster customers by behavior patterns
        # For MVP, use customer_id directly (per-customer optimization)
        return f"{customer_id}:{channel}"

    @classmethod
    def optimize_from_data(cls, notification_data: list[dict]) -> 'ReminderTimingOptimizer':
        """
        Run Bayesian optimization on historical notification data.
        notification_data: list of {"customer_id", "channel", "minutes_before",
                                     "was_opened": bool}
        """
        # Group by customer cluster
        clusters = {}
        for n in notification_data:
            key = f"{n['customer_id']}:{n['channel']}"
            if key not in clusters:
                clusters[key] = []
            clusters[key].append(n)

        optimal = {}
        for cluster_key, records in clusters.items():
            if len(records) < 5:
                continue  # Need minimum observations

            # Build objective function from data
            def objective(minutes):
                # Estimate open rate at this timing
                # Use kernel smoothing around the target minutes
                bandwidth = 120  # 2-hour kernel bandwidth
                weights = [
                    np.exp(-0.5 * ((r["minutes_before"] - minutes) / bandwidth) ** 2)
                    for r in records
                ]
                total_w = sum(weights)
                if total_w == 0:
                    return 0
                return sum(
                    w * (1 if r["was_opened"] else 0)
                    for w, r in zip(weights, records)
                ) / total_w

            optimizer = BayesianOptimization(
                f=objective,
                pbounds={"minutes": (cls.MIN_MINUTES, cls.MAX_MINUTES)},
                verbose=0,
                random_state=42,
            )
            optimizer.maximize(init_points=5, n_iter=15)

            best = optimizer.max
            optimal[cluster_key] = {
                "minutes": int(round(best["params"]["minutes"])),
                "open_rate": round(best["target"], 3),
                "confidence": min(len(records) / 20, 1.0),
            }

        return cls(optimal_timings=optimal)

    def save(self, path: str):
        with open(path, 'w') as f:
            json.dump(self.optimal_timings, f)

    @classmethod
    def load(cls, path: str) -> 'ReminderTimingOptimizer':
        with open(path, 'r') as f:
            timings = json.load(f)
        return cls(optimal_timings=timings)
```

### Anti-Patterns to Avoid

- **Training optimization models per-request:** All four models should be pre-trained (batch) and served from memory. Never run collaborative filtering matrix computation or Bayesian optimization during a booking API request.
- **Ignoring the 30% daily price change constraint:** The documentation requires dynamic pricing changes be <= 30% per day. The pricing optimizer MUST enforce this constraint, not just rely on the MAB arm selection.
- **Updating MAB state synchronously in booking flow:** Record reward observations asynchronously via RabbitMQ events (booking.created, booking.completed). Never block booking creation on pricing reward updates.
- **Full similarity matrix recomputation on every upselling request:** Pre-compute the similarity matrix weekly via training script, load at startup, serve from memory.
- **Using customer-level Bayesian optimization with < 5 observations:** Fall back to channel-level or global defaults when individual customer data is insufficient.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Item-item cosine similarity | Custom dot product loop | sklearn cosine_similarity + scipy sparse | Handles sparse matrices, normalized, vectorized C implementation |
| Beta distribution sampling | Manual probability calculation | numpy.random.beta() | Numerically stable, fast, correct parameterization |
| Time series decomposition | Manual trend/seasonality extraction | Prophet additive model | Handles holidays, changepoints, missing data, uncertainty intervals |
| Gaussian process optimization | Grid search for reminder timing | bayesian-optimization library | Converges in fewer iterations, handles non-convex objective functions |
| Sparse matrix representation | Dense numpy arrays for user-item | scipy.sparse.csr_matrix | Memory efficient (SMB data is very sparse), fast row/column slicing |

**Key insight:** The ML algorithms themselves are relatively simple (cosine similarity, Beta sampling, Prophet fit, GP optimization). The complexity is in the data pipeline, fallback logic, constraint enforcement (30% price cap), and integration with the existing booking/notification systems. Focus engineering effort on reliable data flow and fallback paths, not on reimplementing ML primitives.

## Common Pitfalls

### Pitfall 1: Cold Start for New Companies

**What goes wrong:** New company has 0 bookings, all four AI optimization features return empty/useless results.

**Why it happens:** Collaborative filtering needs >= 100 customers and >= 10 services. Thompson Sampling needs observations to learn. Prophet needs >= 12 weeks of data.

**How to avoid:**
- Implement minimum data thresholds per model (documented in doc: 100 customers/10 services for upselling)
- Return popularity-based fallbacks for upselling (top services by booking count)
- Use static pricing (services.price) when dynamic pricing has no data
- Skip capacity suggestions until sufficient history exists
- Use default 1440-minute reminder timing (24h) per customer.preferred_reminder_minutes column default

**Warning signs:** Fallback rate > 80% for a company, empty recommendation lists

### Pitfall 2: Dynamic Pricing Constraint Violation

**What goes wrong:** Thompson Sampling selects a price that, combined with previous price changes today, exceeds the 30% daily change limit.

**Why it happens:** The MAB doesn't inherently know about the constraint. Each arm selection is independent.

**How to avoid:**
- Track the base price (services.price) and the day's starting price
- After MAB selects a price, clamp it: `max(base_price * 0.7, min(selected_price, base_price * 1.3))`
- Store daily pricing log per service to enforce the constraint
- Return the original static price when constraint would be violated

**Warning signs:** Prices oscillating wildly, customer complaints about inconsistent pricing

### Pitfall 3: Stale Similarity Matrix

**What goes wrong:** Upselling recommendations don't reflect new services added last week because the similarity matrix was built before they existed.

**Why it happens:** The similarity matrix is rebuilt weekly, new services have zero interactions.

**How to avoid:**
- When a service_id is not in the similarity matrix, fall back to category-based recommendations (same service_category_id)
- Include new services in popularity fallback from day one
- Retraining script should handle new service IDs gracefully (expand matrix dimensions)

**Warning signs:** New services never appear in recommendations, recommendations stagnate

### Pitfall 4: Reminder Timing Feedback Loop

**What goes wrong:** Optimizing send time based on open rate but open tracking is unreliable (image blocking, email clients).

**Why it happens:** Email open tracking via pixel depends on image loading which many clients block by default.

**How to avoid:**
- Use both open rate and click-through rate as objective signals
- Weight SMS open confirmations higher than email opens (SMS read receipts are more reliable)
- Include "booking completed after reminder" as a stronger signal than just "opened"
- Accept that reminder timing will converge slowly and maintain conservative defaults

**Warning signs:** Measured open rate near 0% (tracking blocked), optimizer converges to extreme values (30 min or 48h)

### Pitfall 5: Prophet Model Size and Memory

**What goes wrong:** Training one Prophet model per company consumes excessive memory when serving 5000 companies.

**Why it happens:** Each Prophet model object is ~10-50MB in memory.

**How to avoid:**
- Store serialized models on disk, load on-demand with LRU cache (keep top 50 in memory)
- For companies with < 12 weeks data, don't train a model (use heuristic)
- Consider shared models with company-specific scaling factors (transfer learning lite)

**Warning signs:** AI service memory usage growing linearly with company count, OOM crashes

### Pitfall 6: Frontend Upselling Blocking Booking Flow

**What goes wrong:** Upselling API call during booking wizard step 1 is slow, making service selection feel sluggish.

**Why it happens:** Synchronous upselling API call blocks rendering of the next step.

**How to avoid:**
- Make upselling request asynchronous (fire after service selection, show suggestions while user continues)
- Use circuit breaker timeout of 2 seconds (shorter than normal 5s for predictions)
- Pre-fetch upselling suggestions when service list loads (background)
- Show empty state gracefully ("No suggestions") rather than spinner

**Warning signs:** Booking wizard step 1 loading > 3 seconds, users skipping upselling step

## Code Examples

### Extended AI Client Types (TypeScript)

```typescript
// apps/web/lib/ai/types.ts (additions)

// Upselling
export interface UpsellRequest {
  customer_id: number;
  current_service_id: number;
  customer_history?: number[];  // Previous service IDs
}

export interface UpsellRecommendation {
  service_id: number;
  confidence: number;
  reason: string;
}

export interface UpsellResponse {
  recommendations: UpsellRecommendation[];
  model_version: string;
  fallback: boolean;
}

// Dynamic Pricing
export interface DynamicPricingRequest {
  service_id: number;
  price_min: number;
  price_max: number;
  hour_of_day: number;
  day_of_week: number;
  utilization: number;
}

export interface DynamicPricingResponse {
  optimal_price: number;
  confidence: number;
  model_version: string;
  fallback: boolean;
}

// Capacity Forecast
export interface CapacityForecastRequest {
  company_id: number;
  days_ahead?: number;  // Default 7
}

export interface CapacityForecastEntry {
  datetime: string;
  predicted_bookings: number;
  lower_bound: number;
  upper_bound: number;
  utilization_level: 'low' | 'medium' | 'high';
}

export interface CapacityForecastResponse {
  forecast: CapacityForecastEntry[];
  suggestions: CapacityScheduleSuggestion[];
  model_version: string;
  fallback: boolean;
}

export interface CapacityScheduleSuggestion {
  datetime: string;
  type: 'extend_hours' | 'reduce_hours' | 'add_employee';
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

// Reminder Timing
export interface ReminderTimingRequest {
  customer_id: number;
  notification_channel: 'email' | 'sms' | 'push';
}

export interface ReminderTimingResponse {
  minutes_before: number;
  expected_open_rate: number;
  confidence: number;
  model_version: string;
  fallback: boolean;
}
```

### Fallback Functions (TypeScript)

```typescript
// apps/web/lib/ai/fallback.ts (additions)

export function getUpsellFallback(request: UpsellRequest): UpsellResponse {
  return {
    recommendations: [],  // No recommendations when AI unavailable
    model_version: 'fallback',
    fallback: true,
  };
}

export function getDynamicPricingFallback(
  request: DynamicPricingRequest
): DynamicPricingResponse {
  // Fallback: use the midpoint of min/max range (static pricing)
  return {
    optimal_price: (request.price_min + request.price_max) / 2,
    confidence: 0.0,
    model_version: 'fallback',
    fallback: true,
  };
}

export function getCapacityForecastFallback(
  request: CapacityForecastRequest
): CapacityForecastResponse {
  return {
    forecast: [],
    suggestions: [],
    model_version: 'fallback',
    fallback: true,
  };
}

export function getReminderTimingFallback(
  request: ReminderTimingRequest
): ReminderTimingResponse {
  return {
    minutes_before: 1440,  // Default 24 hours
    expected_open_rate: 0.0,
    confidence: 0.0,
    model_version: 'fallback',
    fallback: true,
  };
}
```

### Integration Point: Reminder Scheduler Modification

```typescript
// services/notification-worker/src/schedulers/reminder-scheduler.ts
// Key change: Use customer.preferredReminderMinutes instead of hardcoded 24h/2h windows

// Instead of fixed 24h and 2h windows, query AI service for optimal timing
// OR use the customer.preferred_reminder_minutes column (updated by batch job)
// The batch job calls the AI reminder timing endpoint and writes the result
// to the customer record. The scheduler then reads this value.

// Per-customer window calculation:
const reminderMinutes = customer.preferredReminderMinutes || 1440;
const windowStart = new Date(
  booking.startTime.getTime() - (reminderMinutes + 15) * 60 * 1000
);
const windowEnd = new Date(
  booking.startTime.getTime() - (reminderMinutes - 15) * 60 * 1000
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|---------|
| Full matrix factorization (SVD) | Sparse cosine similarity + NearestNeighbors | ~2020 | Simpler, faster for item-based CF on small datasets, no need for latent factor tuning |
| Epsilon-greedy bandit | Thompson Sampling | ~2018 | Better exploration/exploitation balance, natural uncertainty quantification |
| ARIMA for demand forecasting | Prophet/StatsForecast | ~2019-2020 | Handles holidays, seasonality auto-detection, missing data, uncertainty intervals |
| Grid search for optimization | Bayesian Optimization | ~2018 | Converges in 10-20 evaluations vs hundreds for grid search |
| PyTorch LSTM for booking demand | Prophet for SMB scale | Practical shift | 100x smaller dependency, works with small datasets, handles weekly/yearly seasonality natively |
| Monolithic recommendation service | Embedded in existing AI microservice | Architecture pattern | Fewer containers to manage, shared model loader and health checks |

**Deprecated/outdated:**

- **Surprise library for CF:** Still functional but last release was 2022. For simple item-based CF, sklearn cosine_similarity on scipy sparse is sufficient without adding a dependency.
- **GPyOpt for Bayesian optimization:** Deprecated by University of Sheffield. Use bayesian-optimization (MIT, actively maintained, Dec 2025 release).
- **LSTM for small-scale time series:** Overkill for SMB booking data with < 10K observations. Prophet or StatsForecast are more appropriate and don't require GPU or PyTorch.

## Open Questions

1. **LSTM vs Prophet for Capacity Optimizer**
   - What we know: Documentation specifies LSTM. Prophet is more practical for small datasets (SMB).
   - What's unclear: Is LSTM a strict requirement or a suggestion?
   - Recommendation: Use Prophet for MVP, document LSTM as upgrade path for enterprise tier. If LSTM is required, add PyTorch to requirements.txt (but note ~2GB Docker image increase).

2. **Per-Company vs Global Optimization Models**
   - What we know: Each company has isolated data (RLS). Documentation implies per-company models.
   - What's unclear: For pricing and capacity, is global model with company features acceptable?
   - Recommendation: Per-company models for all four (tenant isolation is critical for pricing/capacity). Use global fallback when per-company data is insufficient.

3. **Upselling Suggestion Display in Booking Wizard**
   - What we know: Documentation says "appear during booking (step 1) based on service selection."
   - What's unclear: Do suggestions appear as add-ons to the selected service, or as alternative service recommendations?
   - Recommendation: Show as "frequently combined with" add-on suggestions after service selection in Step 1. Allow user to add suggested services to their booking cart.

4. **Dynamic Pricing Visibility to Customers**
   - What we know: Price adjusts based on demand. Constraint: <= 30% change per day.
   - What's unclear: Should customers see that pricing is dynamic? Should the original price be shown with a discount/surcharge?
   - Recommendation: Show adjusted price as the current price without indicating it's dynamic. Track both base_price and dynamic_price in booking records for transparency.

5. **Reward Signal for Pricing MAB**
   - What we know: Documentation says "Revenue za timeslot" is the reward.
   - What's unclear: Is reward binary (booked/not) or continuous (revenue amount)?
   - Recommendation: Use binary reward (was a booking created at this price point? yes/no) for Thompson Sampling with Beta distributions. Continuous reward would require Gaussian Thompson Sampling which is more complex.

6. **Reminder Timing Batch Job Scheduling**
   - What we know: Output writes to customers.preferred_reminder_minutes. Existing scheduler reads this column.
   - What's unclear: How often to run the optimization batch job? How to trigger it?
   - Recommendation: Run weekly as a Kubernetes CronJob or BullMQ repeatable job (consistent with no-show retraining schedule). Update customers.preferred_reminder_minutes column in database.

## Sources

### Primary (HIGH confidence)

- **ScheduleBox Documentation** (schedulebox_complete_documentation.md lines 6904-7099) - AI model specifications for all 7 models, API contracts, fallback strategies, data pipeline
- **Phase 10 Research** (.planning/phases/10-ai-predictions/10-RESEARCH.md) - FastAPI microservice architecture, circuit breaker patterns, Docker setup
- **Phase 10 Plans** (.planning/phases/10-ai-predictions/10-01 through 10-04 PLAN.md) - Existing AI service structure, prediction endpoints, model loader
- **Database Schemas** (packages/database/src/schema/ai.ts, services.ts, customers.ts, bookings.ts) - AI predictions table with optimization types, dynamic pricing fields, reminder minutes
- **Existing Reminder Scheduler** (services/notification-worker/src/schedulers/reminder-scheduler.ts) - Current fixed-window reminder logic that smart timing will modify

### Secondary (MEDIUM confidence)

- [scikit-learn cosine_similarity documentation](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html) - Sparse matrix support, API
- [bayesian-optimization PyPI](https://pypi.org/project/bayesian-optimization/) - Version 3.2.0, Dec 2025 release, Python 3.9-3.14 support
- [Prophet Official Documentation](https://facebook.github.io/prophet/) - Time series forecasting with seasonality
- [Thompson Sampling implementations](https://peterroelants.github.io/posts/multi-armed-bandit-implementation/) - numpy-only Beta distribution sampling for MAB
- [Dynamic Pricing with Multi-Armed Bandit (Towards Data Science)](https://towardsdatascience.com/dynamic-pricing-with-multi-armed-bandit-learning-by-doing-3e4550ed02ac/) - Practical pricing optimization patterns
- [Item-Based Collaborative Filtering in Python (Towards Data Science)](https://towardsdatascience.com/item-based-collaborative-filtering-in-python-91f747200fab/) - scipy sparse + cosine similarity approach
- [Adobe Send-Time Optimization](https://experienceleague.adobe.com/en/docs/journey-optimizer/using/orchestrate-journeys/manage-journey/send-time-optimization) - Industry approach to Bayesian send time optimization

### Tertiary (LOW confidence)

- implicit library (0.7.2, Sep 2023) - Could be used for ALS collaborative filtering but last release was 2023, may have compatibility issues with Python 3.12
- Surprise library (1.1.1, last release ~2022) - Functional but unmaintained, avoid adding as dependency

## Metadata

**Confidence breakdown:**

- Standard stack: MEDIUM-HIGH - All libraries verified on PyPI/official docs, but Prophet vs LSTM decision needs user confirmation
- Architecture: HIGH - Extends proven Phase 10 patterns, database already supports optimization prediction types
- Pitfalls: MEDIUM-HIGH - Cold start, pricing constraints, and memory concerns are well-documented patterns; feedback loop risks are project-specific
- Code examples: MEDIUM - Based on verified library APIs but not tested against actual ScheduleBox codebase

**Research date:** 2026-02-11
**Valid until:** 2026-03-15 (stable ML stack, bayesian-optimization recently updated, Prophet stable)
