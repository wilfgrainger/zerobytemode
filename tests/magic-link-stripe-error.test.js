import { test, describe } from 'node:test';
import assert from 'node:assert';
import worker from '../worker/index.js';

describe('Magic Link Stripe Error Handling', () => {
  test('should return 500 when subscription check fails', async () => {
    const env = {
      ALLOWED_ORIGIN: 'http://localhost:3000',
      REQUIRE_ACTIVE_SUBSCRIPTION_FOR_LOGIN: 'false',
      DB: {
        prepare: () => {
          throw new Error('Simulated Stripe/DB Error');
        }
      }
    };

    const request = new Request('http://localhost/auth/magic-link', {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: 'error@example.com' })
    });

    // Mock console.error to avoid cluttering test output
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
      const response = await worker.fetch(request, env);
      assert.strictEqual(response.status, 500);

      const body = await response.json();
      assert.strictEqual(body.error, 'Failed to verify subscription status');
      assert.strictEqual(body.detail, 'Simulated Stripe/DB Error');
    } finally {
      console.error = originalConsoleError;
    }
  });
});
