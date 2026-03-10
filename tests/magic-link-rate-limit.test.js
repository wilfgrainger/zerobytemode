import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import worker, { rateLimitMap } from '../worker/index.js';

describe('Magic Link Rate Limiting', () => {
  const env = {
    ALLOWED_ORIGIN: 'http://localhost:3000',
    REQUIRE_ACTIVE_SUBSCRIPTION_FOR_LOGIN: 'false',
    DB: {
      prepare: () => ({
        bind: () => ({
          first: async () => ({ is_active: 1 }),
          run: async () => {}
        })
      })
    }
  };

  const makeRequest = async (email) => {
    const request = new Request('http://localhost/auth/magic-link', {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(email !== undefined ? { email } : {})
    });
    return worker.fetch(request, env);
  };

  beforeEach(() => {
    rateLimitMap.clear();
  });

  test('should allow up to 3 magic link requests for a normal email', async () => {
    const email = 'normal@example.com';

    // First 3 requests should NOT return 429
    for (let i = 0; i < 3; i++) {
      const response = await makeRequest(email);
      assert.notStrictEqual(response.status, 429, `Request ${i + 1} should not be rate limited`);
    }
  });

  test('should block the 4th magic link request for a normal email', async () => {
    const email = 'ratelimit@example.com';

    // First 3 requests
    for (let i = 0; i < 3; i++) {
      await makeRequest(email);
    }

    // 4th request should be rate limited
    const response = await makeRequest(email);
    assert.strictEqual(response.status, 429);

    const body = await response.json();
    assert.strictEqual(body.error, 'Too many requests');
  });

  test('should bypass rate limiting for whitelisted email', async () => {
    const email = 'wjgrainger@gmail.com';

    // 5 requests, none should be rate limited
    for (let i = 0; i < 5; i++) {
      const response = await makeRequest(email);
      assert.notStrictEqual(response.status, 429, `Request ${i + 1} should not be rate limited`);
    }
  });

  test('should return 400 for invalid email', async () => {
    const response = await makeRequest('invalid-email');
    assert.strictEqual(response.status, 400);
    const body = await response.json();
    assert.strictEqual(body.error, 'Invalid email');
  });

  test('should return 400 for missing email', async () => {
    const response = await makeRequest();
    assert.strictEqual(response.status, 400);
    const body = await response.json();
    assert.strictEqual(body.error, 'Missing email');
  });
});
