# ZeroByteMode | Architecture Specification

## 1. System Overview
ZeroByteMode is architected as an immutable static web application (SPA) built on Next.js, with serverless backend functionality handled strictly by Cloudflare Workers. It emphasizes local-first processing, ensuring data never leaves the client's device.

## 2. Core Technologies
- **Frontend Framework:** Next.js (Strictly configured for Static Export `output: 'export'`)
- **Styling UI:** Tailwind CSS v4, custom glassmorphism patterns
- **Processor:** Web Workers (`compressor.worker.ts`)
- **Codecs:** WebAssembly (WASM) via `@jsquash` libraries
- **Backend/API:** Cloudflare Workers (handling auth & Stripe)
- **Database:** Cloudflare D1 (for subscriptions)
- **Payments:** Stripe Checkout & Customer Portal
- **Native Wrap (Optional):** Capacitor JS (`@capacitor/core`, `@capacitor/haptics`)

## 3. Storage and State
- **State Management:** React `useState` / `useEffect` for transient state; HTTP-only securely signed cookies / Lax cookies for authentication persistence (`zbm_user_email`, `zbm_session_token`, `zbm_pro_tier`).
- **File System (Client-side):** Encoded buffers converted to Blobs and Object URLs. No intermediate DB storage is utilized.
- **WASM Asset Loading:** Configured via Turbopack/Webpack in `next.config.ts`. The site relies heavily on asynchronous WASM initialization (`asyncWebAssembly: true`).

## 4. Workflows

### 4.1. The Processing Pipeline (Web Worker)
1. User drops an image into the dropzone.
2. The UI queues the `File` object and dispatches a message to `compressor.worker.ts`.
3. Worker translates the file into `ImageData` using an `OffscreenCanvas`.
4. Based on Tier + Quality Settings, the worker instantiates the relevant WASM module (MozJPEG, OxiPNG, AVIF, or native Canvas fallback).
5. Output buffer is wrapped in a `Blob` and dispatched back to the UI thread.
6. Main thread creates an `ObjectURL` and presents it for download.

### 4.2. Auth & Magic Link Architecture
1. Client requests a magic link via `/auth/magic-link` with their email.
2. Cloudflare Worker generates a cryptographic single-use token and dispatches an email via Resend/SendGrid.
3. User clicks the link; Worker validates the token and redirects back to the SPA `/?session_id=...` or generates secure cookies.
4. Client SPA auto-rehydrates Pro tier access upon seeing valid session tokens.

### 4.3. Stripe Subscriptions
1. Free users hit "Upgrade to Pro."
2. Validated request calls Cloudflare Worker to create a Stripe Checkout Session using the user's email.
3. Stripe processes transaction; webhook alerts Cloudflare Worker, syncing subscription state securely into D1.
4. Client accesses billing portal securely verified via `zbm_session_token`.
