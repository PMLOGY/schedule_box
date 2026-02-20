import { http, HttpResponse } from 'msw';

// =========================================
// Comgate Payment Gateway Handlers
// =========================================
export const comgateHandlers = [
  // Create payment
  http.post('https://payments.comgate.cz/v1.0/create', () => {
    return HttpResponse.json({
      code: 0,
      message: 'OK',
      transId: 'TEST-12345',
      redirect: 'https://payments.comgate.cz/client/instructions/index?id=TEST-12345',
    });
  }),

  // Check payment status
  http.post('https://payments.comgate.cz/v1.0/status', () => {
    return HttpResponse.json({
      code: 0,
      message: 'OK',
      status: 'PAID',
      amount: 500,
    });
  }),

  // Refund payment
  http.post('https://payments.comgate.cz/v1.0/refund', () => {
    return HttpResponse.json({
      code: 0,
      message: 'OK',
    });
  }),
];

// =========================================
// AI Service (Python microservice) Handlers
// =========================================
export const aiHandlers = [
  // No-show prediction
  http.post('http://localhost:8000/api/v1/predict/no-show', () => {
    return HttpResponse.json({
      probability: 0.15,
      factors: ['new_customer', 'weekend'],
    });
  }),

  // Demand prediction
  http.post('http://localhost:8000/api/v1/predict/demand', () => {
    return HttpResponse.json({
      predictions: [
        { date: '2026-02-20', demand: 42 },
        { date: '2026-02-21', demand: 38 },
      ],
    });
  }),

  // Pricing optimization
  http.post('http://localhost:8000/api/v1/optimize/pricing', () => {
    return HttpResponse.json({
      suggestedPrice: 550,
      confidence: 0.82,
    });
  }),
];

// =========================================
// Notification / SMTP Handlers
// =========================================
export const notificationHandlers = [
  // Internal notification send endpoint
  http.post('/api/v1/notifications/send', () => {
    return HttpResponse.json({
      success: true,
      messageId: 'test-msg-123',
    });
  }),
];

/**
 * Creates a handler that returns a specific HTTP status for the SMTP-like
 * notification endpoint. Useful for error scenario testing.
 */
export function createSMTPHandler(status: number) {
  return http.post('/api/v1/notifications/send', () => {
    if (status >= 200 && status < 300) {
      return HttpResponse.json({ success: true, messageId: 'test-msg-123' }, { status });
    }
    return HttpResponse.json(
      { error: 'notification_failed', message: 'Failed to send notification' },
      { status },
    );
  });
}

// =========================================
// Combined default handlers
// =========================================
export const handlers = [...comgateHandlers, ...aiHandlers, ...notificationHandlers];
