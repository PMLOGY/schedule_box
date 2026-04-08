# =============================================================================
# Stage 1: Base - Install dependencies
# =============================================================================
FROM node:20-alpine AS base

# Enable corepack for pnpm
RUN corepack enable pnpm

WORKDIR /app

# Copy workspace configuration first (for better layer caching)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./

# Copy all package.json files for workspace resolution
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/events/package.json ./packages/events/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies
RUN pnpm install --frozen-lockfile

# =============================================================================
# Stage 2: Development - For local dev with hot reload
# =============================================================================
FROM base AS development

WORKDIR /app

# Source code is mounted via Docker Compose volumes
# No COPY needed - volumes handle it

EXPOSE 3000

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["pnpm", "--filter", "@schedulebox/web", "dev"]

# =============================================================================
# Stage 3: Builder - Build Next.js for production
# =============================================================================
FROM base AS builder

WORKDIR /app

# Copy all source code
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT_STANDALONE=1
# Limit Node.js heap — 3GB needed for build with 60+ pages, monorepo tracing, and drizzle-orm 0.45
ENV NODE_OPTIONS="--max-old-space-size=3072"
# Skip Sentry source map upload during Docker build
ENV SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING=1

# NEXT_PUBLIC_* vars are inlined at build time — pass via Coolify build args
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SENTRY_DSN

# Build the Next.js app
RUN pnpm --filter @schedulebox/web build

# =============================================================================
# Stage 4: Production - Minimal runtime image
# =============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Install wget for health checks — allow failure if Alpine repos are unreachable
RUN apk update && apk add --no-cache wget || true

# Remove unused package managers to reduce attack surface
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy standalone output from builder
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
# i18n message files loaded at runtime by next-intl
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/messages ./apps/web/messages

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health 2>/dev/null || \
      node -e "fetch('http://localhost:3000/api/health').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
