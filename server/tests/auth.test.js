import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'vitest';
import http from 'http';
import { env } from '../src/config/env.js';

// Helper to make HTTP requests to the running server
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: env.PORT,
      path,
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
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

describe('Authentication API', () => {
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testUsername = `testuser_${Date.now()}`;
  const testName = 'Test User';

  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 3000));
  });

  describe('POST /api/auth/signup', () => {
    it('should register a new user successfully', async () => {
      const res = await request('POST', '/api/auth/signup', {
        email: testEmail,
        password: testPassword,
        name: testName,
        username: testUsername,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.user).toBeDefined();
    });

    it('should reject duplicate registration', async () => {
      const res = await request('POST', '/api/auth/signup', {
        email: testEmail,
        password: testPassword,
        name: testName,
        username: testUsername,
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const res = await request('POST', '/api/auth/signup', {
        email: 'not-an-email',
        password: testPassword,
        name: testName,
        username: `testuser_${Date.now()}`,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject short password', async () => {
      const res = await request('POST', '/api/auth/signup', {
        email: `short_${Date.now()}@example.com`,
        password: 'short',
        name: testName,
        username: `shortuser_${Date.now()}`,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing fields', async () => {
      const res = await request('POST', '/api/auth/signup', {
        email: '',
        password: '',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid HTTP method', async () => {
      const res = await request('GET', '/api/auth/signup');

      expect(res.status).toBe(405);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/signin', () => {
    beforeAll(async () => {
      // Register a user first
      await request('POST', '/api/auth/signup', {
        email: testEmail,
        password: testPassword,
        name: testName,
        username: testUsername,
      });
    });

    it('should sign in successfully', async () => {
      const res = await request('POST', '/api/auth/signin', {
        identifier: testEmail,
        password: testPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const res = await request('POST', '/api/auth/signin', {
        identifier: testEmail,
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing credentials', async () => {
      const res = await request('POST', '/api/auth/signin', {
        identifier: '',
        password: '',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid HTTP method', async () => {
      const res = await request('GET', '/api/auth/signin');

      expect(res.status).toBe(405);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    beforeAll(async () => {
      // Sign in first to get a session
      await request('POST', '/api/auth/signin', {
        identifier: testEmail,
        password: testPassword,
      });
    });

    it('should sign out successfully', async () => {
      const res = await request('POST', '/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid HTTP method', async () => {
      const res = await request('GET', '/api/auth/logout');

      expect(res.status).toBe(405);
      expect(res.body.success).toBe(false);
    });
  });
});

describe('Rate Limiting', () => {
  it('should rate limit repeated requests to signin endpoint', async () => {
    const results = [];
    for (let i = 0; i < 15; i++) {
      const res = await request('POST', '/api/auth/signin', {
        identifier: 'nonexistent@example.com',
        password: 'wrongpassword',
      });
      results.push(res.status);
    }

    // At least one request should be rate limited (429)
    const rateLimited = results.some((status) => status === 429);
    expect(rateLimited).toBe(true);
  });
});
