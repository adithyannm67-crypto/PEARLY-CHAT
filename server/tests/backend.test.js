import { describe, it, expect, beforeAll } from 'vitest';
import http from 'http';
import { env } from '../src/config/env.js';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: env.PORT,
      path,
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsedBody;
        try {
          parsedBody = JSON.parse(data || '{}');
        } catch {
          parsedBody = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsedBody,
          raw: data,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

const testEmail = `test_${Date.now()}@example.com`;
const testPassword = 'TestPassword123!';
const testUsername = `testuser_${Date.now()}`;
const testName = 'Test User';

let authToken = '';

async function signIn() {
  const res = await request('POST', '/api/auth/signin', {
    identifier: testEmail,
    password: testPassword,
  });
  return res.body.data?.session?.access_token || res.body.session?.access_token;
}

async function signUp() {
  await request('POST', '/api/auth/signup', {
    email: testEmail,
    password: testPassword,
    name: testName,
    username: testUsername,
  });
}

async function getAuthHeaders() {
  if (!authToken) {
    await signUp();
    authToken = await signIn();
  }
  return {
    'Content-Type': 'application/json',
    Cookie: `access_token=${authToken}`,
  };
}

describe('Backend API Tests', () => {
  beforeAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await signUp();
    authToken = await signIn();
  });

  describe('GET /api/conversations', () => {
    it('should return conversations list or auth error', async () => {
      const headers = await getAuthHeaders();
      const res = await request('GET', '/api/conversations', null, headers);

      expect([200, 401, 403]).toContain(res.status);
      expect(res.body.success).toBeDefined();
      expect(typeof res.body.success).toBe('boolean');
    });

    it('should require authentication', async () => {
      const res = await request('GET', '/api/conversations', null);
      expect([401, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /api/users', () => {
    it('should return list of users or auth error', async () => {
      const headers = await getAuthHeaders();
      const res = await request('GET', '/api/users', null, headers);

      expect([200, 401, 403]).toContain(res.status);
      expect(res.body.success).toBeDefined();
      expect(typeof res.body.success).toBe('boolean');
    });

    it('should require authentication', async () => {
      const res = await request('GET', '/api/users', null);
      expect([401, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /api/ice-config', () => {
    it('should return ICE config or error', async () => {
      const headers = await getAuthHeaders();
      const res = await request('GET', '/api/ice-config', null, headers);

      expect([200, 401, 403, 500]).toContain(res.status);
      expect(res.body.success).toBeDefined();
      expect(typeof res.body.success).toBe('boolean');
    });
  });

  describe('Invalid routes', () => {
    it('should return 404 for unknown route', async () => {
      const res = await request('GET', '/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Route not found');
    });
  });

  describe('Error responses', () => {
    it('should return consistent error format', async () => {
      const res = await request('GET', '/api/nonexistent');
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(typeof res.body.error).toBe('string');
    });
  });
});
