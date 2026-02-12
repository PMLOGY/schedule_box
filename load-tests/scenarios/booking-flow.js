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
    { duration: '2m', target: 100 },   // Ramp up to 100 VUs over 2 minutes
    { duration: '5m', target: 600 },   // Ramp up to 600 VUs over 5 minutes
    { duration: '10m', target: 600 },  // Sustain 600 VUs for 10 minutes
    { duration: '2m', target: 0 },     // Ramp down to 0 VUs
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% < 2s, 99% < 5s
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
  sleep(1 + Math.random() * 2); // Think time: 1-3 seconds

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

  // Parse services and select the first one
  let serviceId;
  try {
    const servicesBody = JSON.parse(servicesResponse.body);
    if (servicesBody.data && servicesBody.data.length > 0) {
      serviceId = servicesBody.data[0].id;
    } else {
      console.error('No services available');
      return;
    }
  } catch (error) {
    console.error(`Failed to parse services response: ${error}`);
    return;
  }

  sleep(1 + Math.random() * 2); // Think time: 1-3 seconds

  // Step 3: Check availability for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const availabilityResponse = http.get(
    `${baseUrl}/api/v1/availability?serviceId=${serviceId}&date=${dateStr}`,
    { headers }
  );

  check(availabilityResponse, {
    'availability status is 200': (r) => r.status === 200,
    'availability has slots': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && Array.isArray(body.data) && body.data.length > 0;
      } catch {
        return false;
      }
    },
  });

  if (availabilityResponse.status !== 200) {
    console.error(`Failed to check availability: ${availabilityResponse.status}`);
    return;
  }

  // Parse availability and select first slot
  let slot;
  try {
    const availabilityBody = JSON.parse(availabilityResponse.body);
    if (availabilityBody.data && availabilityBody.data.length > 0) {
      const dayAvailability = availabilityBody.data[0];
      if (dayAvailability.slots && dayAvailability.slots.length > 0) {
        slot = dayAvailability.slots[0];
      } else {
        console.error('No slots available');
        return;
      }
    } else {
      console.error('No availability data');
      return;
    }
  } catch (error) {
    console.error(`Failed to parse availability response: ${error}`);
    return;
  }

  sleep(1 + Math.random() * 2); // Think time: 1-3 seconds

  // Step 4: Create booking
  const bookingPayload = JSON.stringify({
    serviceId: serviceId,
    employeeId: slot.employeeId,
    startTime: slot.startTime,
    customerName: user.name,
    customerEmail: user.email,
    customerPhone: user.phone,
    notes: 'Load test booking',
  });

  const bookingResponse = http.post(
    `${baseUrl}/api/v1/bookings`,
    bookingPayload,
    { headers }
  );

  check(bookingResponse, {
    'create booking status is 201': (r) => r.status === 201,
    'booking response has id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.id;
      } catch {
        return false;
      }
    },
  });

  if (bookingResponse.status !== 201) {
    console.error(`Failed to create booking: ${bookingResponse.status} ${bookingResponse.body}`);
    return;
  }

  // Parse booking ID
  let bookingId;
  try {
    const bookingBody = JSON.parse(bookingResponse.body);
    bookingId = bookingBody.data.id;
  } catch (error) {
    console.error(`Failed to parse booking response: ${error}`);
    return;
  }

  sleep(1 + Math.random() * 2); // Think time: 1-3 seconds

  // Step 5: Verify booking created
  const verifyResponse = http.get(`${baseUrl}/api/v1/bookings/${bookingId}`, { headers });

  check(verifyResponse, {
    'verify booking status is 200': (r) => r.status === 200,
    'booking status is pending': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.status === 'pending';
      } catch {
        return false;
      }
    },
  });

  sleep(1); // Final think time
}
