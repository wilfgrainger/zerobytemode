import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import worker, { rateLimitMap } from '../worker/index.js';

describe('Verify Rate Limiting', () => {
  const env = {
    ALLOWED_ORIGIN: 'http://localhost:3000',
    JWT_SECRET: 'test-secret',
    DB: {
      prepare: () => ({
        bind: () => ({
          first: async () => ({ email: 'test@example.com' }),
          run: async () => {}
        })
      })
    }
  };

  const makeRequest = async (ip) => {
    const request = new Request('http://localhost/auth/verify?token=fake-token', {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000',
        'CF-Connecting-IP': ip
      }
    });
    return worker.fetch(request, env);
  };

  beforeEach(() => {
    rateLimitMap.clear();
  });

  test('should block verify requests from same IP after limit', async () => {
    const ip = '1.2.3.4';

    // First 10 requests should pass
    for (let i = 0; i < 10; i++) {
      const response = await makeRequest(ip);
      assert.notStrictEqual(response.status, 429, `Request ${i + 1} should not be rate limited`);
    }

    // 11th request should be blocked
    const response = await makeRequest(ip);
    assert.strictEqual(response.status, 429);
  });
});
