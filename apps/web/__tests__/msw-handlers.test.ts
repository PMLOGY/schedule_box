import { describe, test, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

describe('MSW default handlers', () => {
  describe('Comgate payment gateway', () => {
    test('create payment handler returns success response', async () => {
      const response = await fetch('https://payments.comgate.cz/v1.0/create', {
        method: 'POST',
        body: new URLSearchParams({ merchant: 'test', amount: '500' }),
      });
      const data = await response.json();
      expect(data.code).toBe(0);
      expect(data.transId).toBe('TEST-12345');
      expect(data.redirect).toContain('TEST-12345');
    });

    test('status handler returns PAID status', async () => {
      const response = await fetch('https://payments.comgate.cz/v1.0/status', {
        method: 'POST',
        body: new URLSearchParams({ transId: 'TEST-12345' }),
      });
      const data = await response.json();
      expect(data.code).toBe(0);
      expect(data.status).toBe('PAID');
    });

    test('refund handler returns success', async () => {
      const response = await fetch('https://payments.comgate.cz/v1.0/refund', {
        method: 'POST',
        body: new URLSearchParams({ transId: 'TEST-12345' }),
      });
      const data = await response.json();
      expect(data.code).toBe(0);
      expect(data.message).toBe('OK');
    });

    test('can override handler for error scenario', async () => {
      server.use(
        http.post('https://payments.comgate.cz/v1.0/create', () => {
          return HttpResponse.json({ code: 1, message: 'Merchant not found' }, { status: 400 });
        }),
      );

      const response = await fetch('https://payments.comgate.cz/v1.0/create', {
        method: 'POST',
      });
      const data = await response.json();
      expect(data.code).toBe(1);
      expect(data.message).toBe('Merchant not found');
    });

    test('handler override is reset between tests (default handler restored)', async () => {
      // This test verifies afterEach(() => server.resetHandlers()) works.
      // The previous test overrode the handler; it should be reset here.
      const response = await fetch('https://payments.comgate.cz/v1.0/create', {
        method: 'POST',
        body: new URLSearchParams({ merchant: 'test', amount: '500' }),
      });
      const data = await response.json();
      // Should be back to default success response
      expect(data.code).toBe(0);
      expect(data.transId).toBe('TEST-12345');
    });
  });

  describe('AI service', () => {
    test('no-show prediction handler returns probability', async () => {
      const response = await fetch('http://localhost:8000/api/v1/predict/no-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: 'test-123' }),
      });
      const data = await response.json();
      expect(data.probability).toBe(0.15);
      expect(data.factors).toContain('new_customer');
    });

    test('demand prediction handler returns predictions array', async () => {
      const response = await fetch('http://localhost:8000/api/v1/predict/demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: 'test-service' }),
      });
      const data = await response.json();
      expect(data.predictions).toHaveLength(2);
      expect(data.predictions[0].demand).toBe(42);
    });

    test('pricing optimization handler returns suggested price', async () => {
      const response = await fetch('http://localhost:8000/api/v1/optimize/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: 'test-service' }),
      });
      const data = await response.json();
      expect(data.suggestedPrice).toBe(550);
      expect(data.confidence).toBe(0.82);
    });
  });

  describe('Notification handlers', () => {
    test('send notification handler returns success', async () => {
      const response = await fetch('/api/v1/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: 'user@example.com', template: 'reminder' }),
      });
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.messageId).toBe('test-msg-123');
    });
  });
});
