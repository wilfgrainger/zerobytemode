import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import worker, { rateLimitMap } from '../worker/index.js';

describe('Support Rate Limiting', () => {
  const env = {
    ALLOWED_ORIGIN: 'http://localhost:3000',
    RESEND_API_KEY: 'test-key'
  };

  const makeRequest = async (ip, payload) => {
    const request = new Request('http://localhost/support', {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'CF-Connecting-IP': ip,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Mock fetch for Resend API to always succeed
    const originalFetch = global.fetch;
    global.fetch = async () => new Response(null, { status: 200 });

    try {
      return await worker.fetch(request, env);
    } finally {
      global.fetch = originalFetch;
    }
  };

  beforeEach(() => {
    rateLimitMap.clear();
  });

  test('should allow up to 3 support requests', async () => {
    const ip = '1.2.3.4';
    const payload = { email: 'test@example.com', message: 'Hello' };

    for (let i = 0; i < 3; i++) {
      const response = await makeRequest(ip, payload);
      assert.strictEqual(response.status, 200);
    }

    const response = await makeRequest(ip, payload);
    assert.strictEqual(response.status, 429);
  });

  test('should block message > 5000 chars', async () => {
    const ip = '1.2.3.5';
    const longMessage = 'a'.repeat(5001);
    const payload = { email: 'test@example.com', message: longMessage };

    const response = await makeRequest(ip, payload);
    assert.strictEqual(response.status, 400);
    const data = await response.json();
    assert.strictEqual(data.error, 'Message too long (max 5000 chars)');
  });
});
