# Drift Register

## 1. Code vs Contracts (Interface Drift)

The following APIs exist in the codebase (`worker/index.js`, `src/app/page.tsx`, `src/app/verify/page.tsx`) but are missing from the declared API contract in `.spec/interface.json`:

*   **`GET /auth/verify`**
    *   **Usage:** `src/app/verify/page.tsx`
    *   **Query params:** `token`
    *   **Response:** `{ success, email, tier, isActive, sessionToken }` or `{ error, detail }`
*   **`GET /stripe/verify-session`**
    *   **Usage:** `src/app/page.tsx`
    *   **Query params:** `session_id`
    *   **Response:** `{ success, email, isActive, sessionToken }` or `{ error, detail }`

## 2. Infrastructure Drift

*   No notable infrastructure drift identified yet. The deployment and worker logic appear to align with `.spec/infra.md`.

## 3. Code vs Intended Behavior

*   No notable behavior drift found. The system is operating securely with WASM-based local computation and serverless auth using a Cloudflare Worker as intended.

*   **`POST /support`**
    *   **Usage:** `src/app/components/SupportModal.tsx`
    *   **Payload:** `{ email, message }`
    *   **Response:** `{ success, error }`
