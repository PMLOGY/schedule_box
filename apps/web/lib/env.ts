import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  // ===================
  // Required
  // ===================
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL is required' })
    .refine((val) => val.startsWith('postgresql://'), {
      message: 'DATABASE_URL must start with postgresql://',
    }),
  // Redis: either Upstash HTTP (UPSTASH_REDIS_REST_URL) or standard TCP (REDIS_URL)
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  JWT_ACCESS_SECRET: isProduction
    ? z
        .string({ required_error: 'JWT_ACCESS_SECRET is required' })
        .min(16, 'JWT_ACCESS_SECRET must be at least 16 characters in production')
    : z.string({ required_error: 'JWT_ACCESS_SECRET is required' }).min(1),
  JWT_REFRESH_SECRET: isProduction
    ? z
        .string({ required_error: 'JWT_REFRESH_SECRET is required' })
        .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters in production')
    : z.string({ required_error: 'JWT_REFRESH_SECRET is required' }).min(1),
  NEXT_PUBLIC_APP_URL: z
    .string({ required_error: 'NEXT_PUBLIC_APP_URL is required' })
    .url('NEXT_PUBLIC_APP_URL must be a valid URL'),

  // ===================
  // Optional with defaults
  // ===================
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  TZ: z.string().default('Europe/Prague'),

  // ===================
  // Optional services
  // ===================
  AI_SERVICE_URL: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  COMGATE_MERCHANT_ID: z.string().optional(),
  COMGATE_SECRET: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Validate all environment variables against the schema.
 * Throws on failure with a clear list of missing/invalid variables.
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const missing: string[] = [];

    for (const [key, messages] of Object.entries(errors)) {
      if (messages && messages.length > 0) {
        console.error(`  [env] ${key}: ${messages.join(', ')}`);
        missing.push(key);
      }
    }

    throw new Error(`Missing or invalid environment variables: ${missing.join(', ')}`);
  }

  // Warn if no Redis is configured in production
  if (isProduction && !result.data.REDIS_URL && !result.data.UPSTASH_REDIS_REST_URL) {
    console.warn(
      '[env] WARNING: No Redis configured (REDIS_URL or UPSTASH_REDIS_REST_URL). Rate limiting and caching will fail.',
    );
  }

  console.log('[env] Environment validated successfully');
  _env = result.data;
  return result.data;
}

/**
 * Type-safe access to validated environment variables.
 * Lazy-initialized on first access; calls validateEnv() if not yet validated.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    if (!_env) {
      _env = validateEnv();
    }
    return _env[prop as keyof Env];
  },
});
