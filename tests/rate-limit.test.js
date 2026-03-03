
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { checkRateLimit, rateLimitMap, RATE_LIMIT_WINDOW_MS } from '../worker/index.js';

describe('checkRateLimit Unit Tests', () => {

  beforeEach(() => {
    rateLimitMap.clear();
  });

  test('should allow the first request', () => {
    const key = 'test-key';
    const maxAttempts = 3;
    const result = checkRateLimit(key, maxAttempts);
    assert.strictEqual(result, true);
    const record = rateLimitMap.get(key);
    assert.strictEqual(record.count, 1);
  });

  test('should allow multiple requests within the limit', () => {
    const key = 'test-key';
    const maxAttempts = 3;

    assert.strictEqual(checkRateLimit(key, maxAttempts), true);
    assert.strictEqual(checkRateLimit(key, maxAttempts), true);
    assert.strictEqual(checkRateLimit(key, maxAttempts), true);
    assert.strictEqual(rateLimitMap.get(key).count, 3);
  });

  test('should deny requests exceeding the limit', () => {
    const key = 'test-key';
    const maxAttempts = 2;

    assert.strictEqual(checkRateLimit(key, maxAttempts), true);
    assert.strictEqual(checkRateLimit(key, maxAttempts), true);
    assert.strictEqual(checkRateLimit(key, maxAttempts), false);
    assert.strictEqual(rateLimitMap.get(key).count, 2);
  });

  test('should handle different keys independently', () => {
    const key1 = 'key1';
    const key2 = 'key2';
    const maxAttempts = 1;

    assert.strictEqual(checkRateLimit(key1, maxAttempts), true);
    assert.strictEqual(checkRateLimit(key2, maxAttempts), true);
    assert.strictEqual(checkRateLimit(key1, maxAttempts), false);
    assert.strictEqual(checkRateLimit(key2, maxAttempts), false);
  });

  test('should reset the limit after the time window has passed', () => {
    const key = 'test-key';
    const maxAttempts = 1;

    const originalNow = Date.now;
    let mockTime = 1000000;
    Date.now = () => mockTime;

    try {
      // First request
      assert.strictEqual(checkRateLimit(key, maxAttempts), true);
      assert.strictEqual(checkRateLimit(key, maxAttempts), false);

      // Advance time beyond window
      mockTime += RATE_LIMIT_WINDOW_MS + 1;

      assert.strictEqual(checkRateLimit(key, maxAttempts), true);
      assert.strictEqual(rateLimitMap.get(key).count, 1);
    } finally {
      Date.now = originalNow;
    }
  });
});
