/**
 * Notification Worker Configuration
 * Reads environment variables with sensible defaults
 */

/**
 * Parse Redis URL into BullMQ connection options
 * @param url Redis connection URL (e.g., redis://default:password@host:6379)
 */
export function parseRedisUrl(url: string): {
  host: string;
  port: number;
  password?: string;
  username?: string;
} {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      ...(parsed.password && { password: decodeURIComponent(parsed.password) }),
      ...(parsed.username && parsed.username !== 'default' && { username: parsed.username }),
    };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
}

/**
 * Redis configuration
 */
function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    return parseRedisUrl(redisUrl);
  }
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  };
}

/**
 * SMTP configuration for email sending
 */
const smtp = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || 'noreply@schedulebox.cz',
};

/**
 * Twilio configuration for SMS sending
 */
const twilio = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.TWILIO_FROM_NUMBER,
  messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
};

/**
 * VAPID configuration for web push notifications
 */
const vapid = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
  subject: process.env.VAPID_SUBJECT || 'mailto:admin@schedulebox.cz',
};

/**
 * RabbitMQ configuration
 */
const rabbitmq = {
  url: process.env.RABBITMQ_URL || 'amqp://schedulebox:schedulebox@localhost:5672',
};

/**
 * AI service configuration for no-show predictions
 */
const ai = {
  serviceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  /** Budget threshold for SMS cost alerting (USD) */
  smsBudgetThreshold: process.env.SMS_BUDGET_ALERT_THRESHOLD
    ? parseFloat(process.env.SMS_BUDGET_ALERT_THRESHOLD)
    : 50,
  /** No-show probability threshold for SMS gating */
  noShowThreshold: process.env.SMS_NO_SHOW_THRESHOLD
    ? parseFloat(process.env.SMS_NO_SHOW_THRESHOLD)
    : 0.7,
};

/**
 * Application URL for tracking pixels and links
 */
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Monitoring and alerting configuration
 */
const monitoring = {
  alertEmail: process.env.MONITORING_ALERT_EMAIL || process.env.SMTP_FROM || 'admin@schedulebox.cz',
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  emailBounceThreshold: parseFloat(process.env.EMAIL_BOUNCE_THRESHOLD || '0.05'),
  smsMonthlyCostLimitCzk: parseFloat(process.env.SMS_MONTHLY_COST_LIMIT_CZK || '5000'),
  smsCostPerSegmentCzk: parseFloat(process.env.SMS_COST_PER_SEGMENT_CZK || '1.50'),
  checkIntervalMs: parseInt(process.env.MONITORING_CHECK_INTERVAL_MS || '300000', 10), // 5 min
};

/**
 * Complete configuration object
 */
export const config = {
  redis: getRedisConfig(),
  smtp,
  twilio,
  vapid,
  rabbitmq,
  ai,
  appUrl,
  monitoring,
};
