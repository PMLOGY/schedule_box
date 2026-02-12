import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { login, getAuthHeaders } from '../helpers/auth.js';

// Load test users from fixtures
const users = new SharedArray('users', function () {
  return JSON.parse(open('../fixtures/users.json'));
});

// Test configuration with scenario-based load distribution
export const options = {
  scenarios: {
    booking_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 60 },   // Ramp up to 60 VUs
        { duration: '5m', target: 360 },  // Ramp up to 360 VUs
        { duration: '10m', target: 360 }, // Sustain 360 VUs (60% of 600)
        { duration: '2m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
      exec: 'bookingFlow',
      tags: { scenario: 'booking_users' },
    },
    browsing_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 30 },   // Ramp up to 30 VUs
        { duration: '3m', target: 180 },  // Ramp up to 180 VUs
        { duration: '10m', target: 180 }, // Sustain 180 VUs (30% of 600)
        { duration: '1m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
      exec: 'browsingFlow',
      tags: { scenario: 'browsing_users' },
    },
    admin_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },   // Ramp up to 10 VUs
        { duration: '3m', target: 60 },   // Ramp up to 60 VUs
        { duration: '10m', target: 60 },  // Sustain 60 VUs (10% of 600)
        { duration: '1m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
      exec: 'adminFlow',
      tags: { scenario: 'admin_users' },
    },
  },
  thresholds: {
    // Overall thresholds
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.95'],
    // Scenario-specific thresholds
    'http_req_duration{scenario:booking_users}': ['p(95)<2000'],
    'http_req_duration{scenario:browsing_users}': ['p(95)<1000'],
    'http_req_duration{scenario:admin_users}': ['p(95)<2000'],
  },
};

// Booking flow (60% of traffic)
export function bookingFlow() {
  const baseUrl = __ENV.BASE_URL || 'https://staging.schedulebox.cz';
  const user = users[__VU % users.length];

  const tokens = login(baseUrl, user.email, user.password);
  if (!tokens) return;

  const headers = getAuthHeaders(tokens.accessToken);
  sleep(1 + Math.random() * 2);

  // List services
  const servicesResponse = http.get(`${baseUrl}/api/v1/services`, { headers });
  check(servicesResponse, {
    'booking: list services ok': (r) => r.status === 200,
  });
  if (servicesResponse.status !== 200) return;

  let serviceId;
  try {
    const servicesBody = JSON.parse(servicesResponse.body);
    serviceId = servicesBody.data[0].id;
  } catch {
    return;
  }
  sleep(1 + Math.random() * 2);

  // Check availability
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const availabilityResponse = http.get(
    `${baseUrl}/api/v1/availability?serviceId=${serviceId}&date=${dateStr}`,
    { headers }
  );
  check(availabilityResponse, {
    'booking: availability ok': (r) => r.status === 200,
  });
  if (availabilityResponse.status !== 200) return;

  let slot;
  try {
    const availabilityBody = JSON.parse(availabilityResponse.body);
    const dayAvailability = availabilityBody.data[0];
    slot = dayAvailability.slots[0];
  } catch {
    return;
  }
  sleep(1 + Math.random() * 2);

  // Create booking
  const bookingPayload = JSON.stringify({
    serviceId: serviceId,
    employeeId: slot.employeeId,
    startTime: slot.startTime,
    customerName: user.name,
    customerEmail: user.email,
    customerPhone: user.phone,
    notes: 'Mixed traffic test',
  });

  const bookingResponse = http.post(
    `${baseUrl}/api/v1/bookings`,
    bookingPayload,
    { headers }
  );
  check(bookingResponse, {
    'booking: create ok': (r) => r.status === 201,
  });

  sleep(1);
}

// Browsing flow (30% of traffic)
export function browsingFlow() {
  const baseUrl = __ENV.BASE_URL || 'https://staging.schedulebox.cz';
  const user = users[__VU % users.length];

  const tokens = login(baseUrl, user.email, user.password);
  if (!tokens) return;

  const headers = getAuthHeaders(tokens.accessToken);
  sleep(0.5 + Math.random());

  // List services
  const servicesResponse = http.get(`${baseUrl}/api/v1/services`, { headers });
  check(servicesResponse, {
    'browsing: list services ok': (r) => r.status === 200,
  });
  if (servicesResponse.status !== 200) return;

  let serviceId;
  try {
    const servicesBody = JSON.parse(servicesResponse.body);
    const services = servicesBody.data;
    serviceId = services[Math.floor(Math.random() * services.length)].id;
  } catch {
    return;
  }
  sleep(0.5 + Math.random());

  // Check availability for random date
  const daysOffset = Math.floor(Math.random() * 7);
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysOffset);
  const dateStr = targetDate.toISOString().split('T')[0];

  const availabilityResponse = http.get(
    `${baseUrl}/api/v1/availability?serviceId=${serviceId}&date=${dateStr}`,
    { headers }
  );
  check(availabilityResponse, {
    'browsing: availability ok': (r) => r.status === 200,
  });
  sleep(0.5 + Math.random());

  // Get service detail
  const serviceDetailResponse = http.get(`${baseUrl}/api/v1/services/${serviceId}`, { headers });
  check(serviceDetailResponse, {
    'browsing: service detail ok': (r) => r.status === 200,
  });

  sleep(0.5);
}

// Admin flow (10% of traffic)
export function adminFlow() {
  const baseUrl = __ENV.BASE_URL || 'https://staging.schedulebox.cz';
  const user = users[__VU % users.length];

  const tokens = login(baseUrl, user.email, user.password);
  if (!tokens) return;

  const headers = getAuthHeaders(tokens.accessToken);
  sleep(1 + Math.random());

  // List bookings
  const bookingsResponse = http.get(`${baseUrl}/api/v1/bookings`, { headers });
  check(bookingsResponse, {
    'admin: list bookings ok': (r) => r.status === 200,
  });
  sleep(1 + Math.random());

  // List customers
  const customersResponse = http.get(`${baseUrl}/api/v1/customers`, { headers });
  check(customersResponse, {
    'admin: list customers ok': (r) => r.status === 200,
  });
  sleep(1 + Math.random());

  // Get analytics overview
  const analyticsResponse = http.get(`${baseUrl}/api/v1/analytics/overview`, { headers });
  check(analyticsResponse, {
    'admin: analytics ok': (r) => r.status === 200,
  });

  sleep(1);
}
