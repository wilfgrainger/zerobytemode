import { test } from 'node:test';
import assert from 'node:assert';
import worker, { rateLimitMap } from '../worker/index.js';

test('Email Bombing Vulnerability: Bypass email rate limit by changing emails from same IP', async () => {
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

  rateLimitMap.clear();

  let successCount = 0;
  let rejectedCount = 0;
  // Send 15 requests with different emails from the same IP (1.1.1.1)
  for (let i = 0; i < 15; i++) {
    const request = new Request('http://localhost/auth/magic-link', {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json',
        'cf-connecting-ip': '1.1.1.1'
      },
      body: JSON.stringify({ email: `target${i}@example.com` })
    });

    const response = await worker.fetch(request, env);
    if (response.status === 200) {
      successCount++;
    } else if (response.status === 429) {
      rejectedCount++;
    }
  }

  console.log(`Successful magic link requests: ${successCount}`);
  console.log(`Rejected magic link requests: ${rejectedCount}`);
  assert.strictEqual(successCount, 10, 'Expected exactly 10 successful requests');
  assert.strictEqual(rejectedCount, 5, 'Expected exactly 5 rejected requests');
});
