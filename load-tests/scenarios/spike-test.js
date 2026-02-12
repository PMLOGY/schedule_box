import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { login, getAuthHeaders } from '../helpers/auth.js';

// Load test users from fixtures
const users = new SharedArray('users', function () {
  return JSON.parse(open('../fixtures/users.json'));
});

// Custom metrics
const spikeRequests = new Counter('spike_requests');
const baselineRequests = new Counter('baseline_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '3m', target: 100 },   // Baseline: 100 VUs for 3 minutes
    { duration: '30s', target: 2000 }, // Spike: sudden surge to 2000 VUs
    { duration: '1m', target: 2000 },  // Sustain spike: 2000 VUs for 1 minute
    { duration: '30s', target: 100 },  // Drop back to baseline
    { duration: '3m', target: 100 },   // Recovery: 3 minutes at baseline
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // Looser threshold during spike
    http_req_failed: ['rate<0.05'],     // Allow 5% errors during burst
    checks: ['rate>0.90'],              // Allow 10% check failures
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'https://staging.schedulebox.cz';
  const user = users[__VU % users.length];

  // Track whether we're in spike period (rough approximation based on VU count)
  const isSpike = __VU > 500;
  if (isSpike) {
    spikeRequests.add(1);
  } else {
    baselineRequests.add(1);
  }

  // Step 1: Login
  const tokens = login(baseUrl, user.email, user.password);
  if (!tokens) {
    console.error(`Failed to login user ${user.email}`);
    return;
  }

  const headers = getAuthHeaders(tokens.accessToken);
  sleep(1 + Math.random() * 2);

  // Step 2: List services
  const servicesResponse = http.get(`${baseUrl}/api/v1/services`, { headers });
  check(servicesResponse, {
    'spike: list services ok': (r) => r.status === 200,
  });

  if (servicesResponse.status !== 200) {
    return;
  }

  let serviceId;
  try {
    const servicesBody = JSON.parse(servicesResponse.body);
    if (servicesBody.data && servicesBody.data.length > 0) {
      serviceId = servicesBody.data[0].id;
    } else {
      return;
    }
  } catch {
    return;
  }

  sleep(1 + Math.random() * 2);

  // Step 3: Check availability
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const availabilityResponse = http.get(
    `${baseUrl}/api/v1/availability?serviceId=${serviceId}&date=${dateStr}`,
    { headers }
  );

  check(availabilityResponse, {
    'spike: availability ok': (r) => r.status === 200,
  });

  if (availabilityResponse.status !== 200) {
    return;
  }

  let slot;
  try {
    const availabilityBody = JSON.parse(availabilityResponse.body);
    const dayAvailability = availabilityBody.data[0];
    if (dayAvailability.slots && dayAvailability.slots.length > 0) {
      slot = dayAvailability.slots[0];
    } else {
      return;
    }
  } catch {
    return;
  }

  sleep(1 + Math.random() * 2);

  // Step 4: Create booking
  const bookingPayload = JSON.stringify({
    serviceId: serviceId,
    employeeId: slot.employeeId,
    startTime: slot.startTime,
    customerName: user.name,
    customerEmail: user.email,
    customerPhone: user.phone,
    notes: 'Spike test booking',
  });

  const bookingResponse = http.post(
    `${baseUrl}/api/v1/bookings`,
    bookingPayload,
    { headers }
  );

  check(bookingResponse, {
    'spike: create booking ok': (r) => r.status === 201,
  });

  if (bookingResponse.status !== 201) {
    return;
  }

  let bookingId;
  try {
    const bookingBody = JSON.parse(bookingResponse.body);
    bookingId = bookingBody.data.id;
  } catch {
    return;
  }

  sleep(1 + Math.random() * 2);

  // Step 5: Verify booking (tests system recovery)
  const verifyResponse = http.get(`${baseUrl}/api/v1/bookings/${bookingId}`, { headers });

  check(verifyResponse, {
    'spike: verify booking ok': (r) => r.status === 200,
  });

  sleep(1);
}
