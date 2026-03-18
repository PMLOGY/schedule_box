/**
 * Feature Flags Library
 *
 * Provides Redis-cached feature flag evaluation with DB fallback.
 * Per-company overrides take precedence over global flag state.
 *
 * Cache strategy: Redis with 60s TTL.
 * Cache keys:
 *   ff:{flagName}:{companyId} — per-company override
 *   ff:{flagName}:global      — global flag state
 */

import { redis } from '@/lib/redis/client';
import { db } from '@schedulebox/database';
import { featureFlags, featureFlagOverrides } from '@schedulebox/database';
import { eq, and } from 'drizzle-orm';

/**
 * Get the effective value of a feature flag for the given context.
 *
 * Resolution order:
 * 1. Redis cache (ff:{flagName}:{companyId} or ff:{flagName}:global)
 * 2. DB: per-company override (if companyId provided)
 * 3. DB: global flag state
 * 4. false (flag does not exist)
 */
export async function getFlag(flagName: string, companyId?: number): Promise<boolean> {
  // Check company-specific cache first if companyId is provided
  if (companyId !== undefined) {
    const companyCacheKey = `ff:${flagName}:${companyId}`;
    const cachedCompany = await redis.get<string>(companyCacheKey);
    if (cachedCompany !== null) {
      return cachedCompany === 'true';
    }
  }

  // Check global cache
  const globalCacheKey = `ff:${flagName}:global`;
  const cachedGlobal = await redis.get<string>(globalCacheKey);
  if (cachedGlobal !== null) {
    return cachedGlobal === 'true';
  }

  // DB fallback: check per-company override if companyId provided
  if (companyId !== undefined) {
    const [override] = await db
      .select({ enabled: featureFlagOverrides.enabled })
      .from(featureFlagOverrides)
      .innerJoin(featureFlags, eq(featureFlagOverrides.flagId, featureFlags.id))
      .where(and(eq(featureFlags.name, flagName), eq(featureFlagOverrides.companyId, companyId)))
      .limit(1);

    if (override !== undefined) {
      const value = override.enabled ? 'true' : 'false';
      await redis.set(`ff:${flagName}:${companyId}`, value, { ex: 60 });
      return override.enabled;
    }
  }

  // DB fallback: global flag state
  const [flag] = await db
    .select({ globalEnabled: featureFlags.globalEnabled })
    .from(featureFlags)
    .where(eq(featureFlags.name, flagName))
    .limit(1);

  if (flag === undefined) {
    // Flag does not exist — cache as false for 60s to avoid repeated DB hits
    await redis.set(globalCacheKey, 'false', { ex: 60 });
    return false;
  }

  const enabled = flag.globalEnabled ?? false;
  await redis.set(globalCacheKey, enabled ? 'true' : 'false', { ex: 60 });
  return enabled;
}

/**
 * Invalidate cached flag values.
 *
 * Always deletes the global cache key.
 * If companyId is provided, also deletes the company-specific key.
 */
export async function invalidateFlagCache(flagName: string, companyId?: number): Promise<void> {
  const keysToDelete: string[] = [`ff:${flagName}:global`];
  if (companyId !== undefined) {
    keysToDelete.push(`ff:${flagName}:${companyId}`);
  }
  await Promise.all(keysToDelete.map((key) => redis.del(key)));
}
