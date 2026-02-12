import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { login, getAuthHeaders } from '../helpers/auth.js';

// Load test users from fixtures
const users = new SharedArray('users', function () {
  return JSON.parse(open('../fixtures/users.json'));
});

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Ramp up to 100 VUs over 1 minute
    { duration: '3m', target: 300 },   // Ramp up to 300 VUs over 3 minutes
    { duration: '10m', target: 300 },  // Sustain 300 VUs for 10 minutes
    { duration: '1m', target: 0 },     // Ramp down to 0 VUs
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<3000'], // Tighter thresholds for read-only ops
    http_req_failed: ['rate<0.01'],                   // Error rate < 1%
    checks: ['rate>0.95'],                            // Check success rate > 95%
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'https://staging.schedulebox.cz';

  // Select user based on VU ID (round-robin)
  const user = users[__VU % users.length];

  // Step 1: Login
  const tokens = login(baseUrl, user.email, user.password);
  if (!tokens) {
    console.error(`Failed to login user ${user.email}`);
    return;
  }

  const headers = getAuthHeaders(tokens.accessToken);
  sleep(0.5 + Math.random()); // Think time: 0.5-1.5 seconds

  // Step 2: List services
  const servicesResponse = http.get(`${baseUrl}/api/v1/services`, { headers });
  check(servicesResponse, {
    'list services status is 200': (r) => r.status === 200,
    'services response has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && Array.isArray(body.data) && body.data.length > 0;
      } catch {
        return false;
      }
    },
  });

  if (servicesResponse.status !== 200) {
    console.error(`Failed to list services: ${servicesResponse.status}`);
    return;
  }

  // Parse services and select a random one
  let serviceId;
  try {
    const servicesBody = JSON.parse(servicesResponse.body);
    if (servicesBody.data && servicesBody.data.length > 0) {
      const services = servicesBody.data;
      serviceId = services[Math.floor(Math.random() * services.length)].id;
    } else {
      console.error('No services available');
      return;
    }
  } catch (error) {
    console.error(`Failed to parse services response: ${error}`);
    return;
  }

  sleep(0.5 + Math.random()); // Think time: 0.5-1.5 seconds

  // Step 3: Check availability for a random date in the next 7 days
  const daysOffset = Math.floor(Math.random() * 7);
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysOffset);
  const dateStr = targetDate.toISOString().split('T')[0];

  const availabilityResponse = http.get(
    `${baseUrl}/api/v1/availability?serviceId=${serviceId}&date=${dateStr}`,
    { headers }
  );

  check(availabilityResponse, {
    'availability status is 200': (r) => r.status === 200,
    'availability response has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && Array.isArray(body.data);
      } catch {
        return false;
      }
    },
  });

  sleep(0.5 + Math.random()); // Think time: 0.5-1.5 seconds

  // Step 4: Get service detail
  const serviceDetailResponse = http.get(`${baseUrl}/api/v1/services/${serviceId}`, { headers });

  check(serviceDetailResponse, {
    'service detail status is 200': (r) => r.status === 200,
    'service detail has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.id === serviceId;
      } catch {
        return false;
      }
    },
  });

  sleep(0.5); // Final think time
}
