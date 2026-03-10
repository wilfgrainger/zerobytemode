# Infrastructure & Deployment

## Environment Constraints
- Hosted on GitHub Pages (static export via `out/` directory).
- Uses GitHub Actions (`.github/workflows/deploy.yml`) for automated CI/CD.
- Backend consists of a Cloudflare Worker managing auth and subscriptions.
- Database: Cloudflare D1 (`zerobytemode-subscriptions`).

## Anti Gravity & Scalability
- **Static Hosting:** Infinite scale for frontend assets via CDN.
- **WASM Computing:** Infinite horizontal scale because compute is distributed to the client's browser.
- **Worker Isolation:** Auth endpoints are edge-optimized and independent of heavy workloads.
