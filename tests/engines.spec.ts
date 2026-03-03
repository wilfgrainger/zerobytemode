import { test, expect } from '@playwright/test';

test.describe('Compression Codecs', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the local build to ensure the web worker is served properly
    // This requires the dev server to be running (e.g., `npm run dev`)
    await page.goto('http://localhost:3000');
    // Ensure the page and worker are loaded
    await page.waitForLoadState('networkidle');
  });

  test('MozJPEG WASM initializes and compresses an image', async ({ page }) => {
    const result = await page.evaluate(async () => {
      return new Promise<{ success: boolean; error?: string; engineUsed?: string }>((resolve) => {
        const worker = new Worker(new URL('/_next/static/chunks/app/compressor.worker.js', window.location.origin), { type: 'module' });
        
        // Generate a simple 10x10 dummy image Blob to test the pipeline
        const canvas = document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 10, 10);
        
        canvas.toBlob((blob) => {
          if (!blob) return resolve({ success: false, error: 'Failed to create dummy blob' });
          
          worker.onmessage = (e) => resolve(e.data);
          worker.onerror = (e) => resolve({ success: false, error: e.message });
          
          worker.postMessage({
            file: new File([blob], 'dummy.png', { type: 'image/png' }),
            quality: 0.8,
            type: 'image/jpeg',
            engine: 'mozjpeg',
            id: 'test-1'
          });
        }, 'image/png');
      });
    });

    expect(result.success).toBeTruthy();
    expect(result.engineUsed).toBe('mozjpeg');
  });

  test('OxiPNG WASM initializes and compresses an image', async ({ page }) => {
    const result = await page.evaluate(async () => {
      return new Promise<{ success: boolean; error?: string; engineUsed?: string }>((resolve) => {
        const worker = new Worker(new URL('/_next/static/chunks/app/compressor.worker.js', window.location.origin), { type: 'module' });
        
        const canvas = document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'blue';
        ctx.fillRect(0, 0, 10, 10);
        
        canvas.toBlob((blob) => {
          if (!blob) return resolve({ success: false, error: 'Failed to create dummy blob' });
          
          worker.onmessage = (e) => resolve(e.data);
          worker.onerror = (e) => resolve({ success: false, error: e.message });
          
          worker.postMessage({
            file: new File([blob], 'dummy.png', { type: 'image/png' }),
            quality: 0.8,
            type: 'image/png',
            engine: 'oxipng',
            id: 'test-2'
          });
        }, 'image/png');
      });
    });

    expect(result.success).toBeTruthy();
    expect(result.engineUsed).toBe('oxipng');
  });

  test('AVIF WASM initializes and compresses an image (Single-thread bypass)', async ({ page }) => {
    const result = await page.evaluate(async () => {
      return new Promise<{ success: boolean; error?: string; engineUsed?: string }>((resolve) => {
        const worker = new Worker(new URL('/_next/static/chunks/app/compressor.worker.js', window.location.origin), { type: 'module' });
        
        const canvas = document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'green';
        ctx.fillRect(0, 0, 10, 10);
        
        canvas.toBlob((blob) => {
          if (!blob) return resolve({ success: false, error: 'Failed to create dummy blob' });
          
          worker.onmessage = (e) => resolve(e.data);
          worker.onerror = (e) => resolve({ success: false, error: e.message });
          
          worker.postMessage({
            file: new File([blob], 'dummy.png', { type: 'image/png' }),
            quality: 0.8,
            type: 'image/avif',
            engine: 'avif',
            id: 'test-3'
          });
        }, 'image/png');
      });
    });

    expect(result.success).toBeTruthy();
    expect(result.engineUsed).toBe('avif');
  });

});
