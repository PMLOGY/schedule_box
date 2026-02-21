import { describe, it, expect } from 'vitest';
import {
  notificationTemplateTypeEnum,
  notificationChannelEnum,
  notificationStatusEnum,
  notificationTemplateCreateSchema,
  notificationTemplateUpdateSchema,
  notificationListQuerySchema,
  notificationTemplatePreviewSchema,
} from './notification';

// ============================================================================
// notificationTemplateTypeEnum
// ============================================================================

describe('notificationTemplateTypeEnum', () => {
  it('accepts all valid template type values', () => {
    const validTypes = [
      'booking_confirmation',
      'booking_reminder',
      'booking_cancellation',
      'payment_confirmation',
      'payment_reminder',
      'review_request',
      'welcome',
      'loyalty_update',
      'follow_up',
      'custom',
    ];
    for (const type of validTypes) {
      expect(notificationTemplateTypeEnum.safeParse(type).success).toBe(true);
    }
  });

  it('rejects invalid template type', () => {
    expect(notificationTemplateTypeEnum.safeParse('password_reset').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(notificationTemplateTypeEnum.safeParse('').success).toBe(false);
  });
});

// ============================================================================
// notificationChannelEnum
// ============================================================================

describe('notificationChannelEnum', () => {
  it('accepts email channel', () => {
    expect(notificationChannelEnum.safeParse('email').success).toBe(true);
  });

  it('accepts sms channel', () => {
    expect(notificationChannelEnum.safeParse('sms').success).toBe(true);
  });

  it('accepts push channel', () => {
    expect(notificationChannelEnum.safeParse('push').success).toBe(true);
  });

  it('rejects invalid channel', () => {
    expect(notificationChannelEnum.safeParse('webhook').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(notificationChannelEnum.safeParse('').success).toBe(false);
  });
});

// ============================================================================
// notificationStatusEnum
// ============================================================================

describe('notificationStatusEnum', () => {
  it('accepts all valid status values', () => {
    const validStatuses = ['pending', 'sent', 'delivered', 'failed', 'opened', 'clicked'];
    for (const status of validStatuses) {
      expect(notificationStatusEnum.safeParse(status).success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    expect(notificationStatusEnum.safeParse('bounced').success).toBe(false);
  });
});

// ============================================================================
// notificationTemplateCreateSchema
// ============================================================================

describe('notificationTemplateCreateSchema', () => {
  const validCreate = {
    type: 'booking_confirmation',
    channel: 'email',
    bodyTemplate: 'Hello {{customerName}}, your booking is confirmed!',
  };

  it('validates correct minimal template data', () => {
    const result = notificationTemplateCreateSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it('applies default isActive of true when not provided', () => {
    const result = notificationTemplateCreateSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });

  it('accepts all optional fields', () => {
    const result = notificationTemplateCreateSchema.safeParse({
      ...validCreate,
      subject: 'Booking Confirmed',
      isActive: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
    }
  });

  it('rejects missing type', () => {
    const { type: _, ...without } = validCreate;
    expect(notificationTemplateCreateSchema.safeParse(without).success).toBe(false);
  });

  it('rejects missing channel', () => {
    const { channel: _, ...without } = validCreate;
    expect(notificationTemplateCreateSchema.safeParse(without).success).toBe(false);
  });

  it('rejects missing bodyTemplate', () => {
    const { bodyTemplate: _, ...without } = validCreate;
    expect(notificationTemplateCreateSchema.safeParse(without).success).toBe(false);
  });

  it('rejects empty bodyTemplate (min length 1)', () => {
    expect(
      notificationTemplateCreateSchema.safeParse({ ...validCreate, bodyTemplate: '' }).success,
    ).toBe(false);
  });

  it('rejects invalid template type', () => {
    expect(
      notificationTemplateCreateSchema.safeParse({ ...validCreate, type: 'otp' }).success,
    ).toBe(false);
  });

  it('rejects invalid channel', () => {
    expect(
      notificationTemplateCreateSchema.safeParse({ ...validCreate, channel: 'slack' }).success,
    ).toBe(false);
  });

  it('rejects subject exceeding 255 characters', () => {
    expect(
      notificationTemplateCreateSchema.safeParse({
        ...validCreate,
        subject: 's'.repeat(256),
      }).success,
    ).toBe(false);
  });

  it('accepts subject at maximum length (255 chars)', () => {
    expect(
      notificationTemplateCreateSchema.safeParse({
        ...validCreate,
        subject: 's'.repeat(255),
      }).success,
    ).toBe(true);
  });

  it('rejects empty object', () => {
    expect(notificationTemplateCreateSchema.safeParse({}).success).toBe(false);
  });
});

// ============================================================================
// notificationTemplateUpdateSchema
// ============================================================================

describe('notificationTemplateUpdateSchema', () => {
  it('validates empty update (all fields optional for partial update)', () => {
    expect(notificationTemplateUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('validates update with only bodyTemplate', () => {
    expect(
      notificationTemplateUpdateSchema.safeParse({
        bodyTemplate: 'Updated template content',
      }).success,
    ).toBe(true);
  });

  it('validates update with only channel', () => {
    expect(notificationTemplateUpdateSchema.safeParse({ channel: 'sms' }).success).toBe(true);
  });

  it('rejects invalid channel in update', () => {
    expect(notificationTemplateUpdateSchema.safeParse({ channel: 'fax' }).success).toBe(false);
  });

  it('rejects invalid type in update', () => {
    expect(notificationTemplateUpdateSchema.safeParse({ type: 'unknown_type' }).success).toBe(
      false,
    );
  });

  it('rejects empty bodyTemplate in update (min length still applies)', () => {
    expect(notificationTemplateUpdateSchema.safeParse({ bodyTemplate: '' }).success).toBe(false);
  });
});

// ============================================================================
// notificationListQuerySchema
// ============================================================================

describe('notificationListQuerySchema', () => {
  it('validates empty query with defaults', () => {
    const result = notificationListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('coerces string page and limit to numbers', () => {
    const result = notificationListQuerySchema.safeParse({ page: '2', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('validates all optional filters', () => {
    const result = notificationListQuerySchema.safeParse({
      channel: 'email',
      status: 'sent',
      customerId: '42',
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid channel filter', () => {
    expect(notificationListQuerySchema.safeParse({ channel: 'telegram' }).success).toBe(false);
  });

  it('rejects invalid status filter', () => {
    expect(notificationListQuerySchema.safeParse({ status: 'archived' }).success).toBe(false);
  });

  it('rejects page below 1', () => {
    expect(notificationListQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('rejects limit above 100', () => {
    expect(notificationListQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });
});

// ============================================================================
// notificationTemplatePreviewSchema
// ============================================================================

describe('notificationTemplatePreviewSchema', () => {
  it('validates correct preview request', () => {
    const result = notificationTemplatePreviewSchema.safeParse({
      templateId: 1,
      testData: { customerName: 'Jan', serviceName: 'Massage' },
    });
    expect(result.success).toBe(true);
  });

  it('validates preview with empty testData', () => {
    const result = notificationTemplatePreviewSchema.safeParse({
      templateId: 1,
      testData: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing templateId', () => {
    expect(notificationTemplatePreviewSchema.safeParse({ testData: {} }).success).toBe(false);
  });

  it('rejects missing testData', () => {
    expect(notificationTemplatePreviewSchema.safeParse({ templateId: 1 }).success).toBe(false);
  });

  it('rejects non-positive templateId', () => {
    expect(
      notificationTemplatePreviewSchema.safeParse({ templateId: 0, testData: {} }).success,
    ).toBe(false);
  });
});
