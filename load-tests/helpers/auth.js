import http from 'k6/http';
import { check } from 'k6';

/**
 * Authenticates a test user and returns access/refresh tokens
 * @param {string} baseUrl - Base URL for the API (e.g., https://staging.schedulebox.cz)
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {{ accessToken: string, refreshToken: string } | null} - Tokens or null on failure
 */
export function login(baseUrl, email, password) {
  const url = `${baseUrl}/api/v1/auth/login`;
  const payload = JSON.stringify({ email, password });
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(url, payload, params);

  const success = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login returns access token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.accessToken;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    console.error(`Login failed for ${email}: ${response.status} ${response.body}`);
    return null;
  }

  try {
    const body = JSON.parse(response.body);
    return {
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken,
    };
  } catch (error) {
    console.error(`Failed to parse login response: ${error}`);
    return null;
  }
}

/**
 * Returns HTTP headers with Authorization token
 * @param {string} token - JWT access token
 * @returns {Object} - Headers object with Authorization and Content-Type
 */
export function getAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
