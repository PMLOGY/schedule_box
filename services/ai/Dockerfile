# ScheduleBox AI Service - Multi-stage Docker build
# Build stage: install all dependencies including build tools
# Runtime stage: minimal image with only runtime dependencies

# =============================================================================
# Builder stage
# =============================================================================
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install to /install directory
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install --no-warn-script-location -r requirements.txt

# =============================================================================
# Runtime stage
# =============================================================================
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY ./app ./app
COPY ./models ./models
COPY ./scripts ./scripts

# Create non-root user
RUN addgroup --system --gid 1001 aiuser && \
    adduser --system --uid 1001 --gid 1001 aiuser && \
    chown -R aiuser:aiuser /app

USER aiuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
