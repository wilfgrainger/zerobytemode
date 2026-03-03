---
description: How to test the WASM compression engines in isolation
---

# Testing WASM Compression Engines

This workflow provides a way to rapidly test the `@jsquash` compression engines (MozJPEG, OxiPNG, AVIF, WebP) in isolation to see if they are throwing errors or failing to initialize.

Because these engines expect a browser environment (specifically `ImageData`, `OffscreenCanvas`, and Web Workers), we run these tests via Playwright rather than pure Node.js.

## 1. Run the Codec Tests

To run the isolated suite of codec tests headlessly:

```bash
npm run test:codecs
```

This will run the Playwright suite located at `tests/engines.spec.ts`.

## 2. Debugging Failures

If an engine fails, you can run the test in headed mode (so you can see the browser console):

```bash
npx playwright test tests/engines.spec.ts --headed --debug
```

## 3. Common Issues

- **AVIF Freezing / Hanging:** The default AVIF encoder uses multithreading (`_mt.wasm`). If the site is not served with Cross-Origin Isolation headers (`Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`), it will hang. Ensure the worker explicitly injects the single-threaded WASM binary (`avif_enc.wasm`).
- **WASM 404 Errors:** Next.js / Turbopack might not serve the `.wasm` files correctly in development. Verify `next.config.ts` has the correct asset routing for WASM files.
