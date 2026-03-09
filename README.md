# ZeroByteMode | Web Engineering
**Sovereign Web Architecture**

We replace vulnerable CMS stacks (WordPress) with high-performance, immutable static architecture.
Zero servers to hack. Zero plugins to update. Zero monthly hosting fees.

## Stack
- **GitHub Pro:** Source Control
- **GitHub Pages:** Hosting & CDN
- **HTML5/JS:** Immutable Frontend
- **Stripe/Snipcart:** Serverless Commerce

## Deploy
This repository is configured for automatic deployment via **GitHub Actions** and **GitHub Pages**.
Pushing to the `main` branch automatically triggers the `.github/workflows/deploy.yml` pipeline, which builds the Next.js static export and deploys the Cloudflare Worker API.

## Docs
- `docs/ARCHITECTURE.md`
- `docs/DIAGRAMS.md`

## Local Dev: Magic Link Login
The login flow uses a Cloudflare Worker (magic link + Stripe subscription validation).

Create `.env.local` (see `.env.example`) and set:
- `NEXT_PUBLIC_BASE_URL` (e.g. `http://localhost:3000`)
- `NEXT_PUBLIC_WORKER_URL` (your Worker endpoint URL)

Stripe links can be configured via:
- `NEXT_PUBLIC_STRIPE_CHECKOUT_URL`
- `NEXT_PUBLIC_STRIPE_PORTAL_URL`

## Android Readiness Path
To support both desktop browser and future Android app delivery, this project is already in a good place because it uses client-side processing and static export (`next export` via `output: "export"`).

Recommended path:
1. Keep web app quality high (PWA manifest + responsive UI).
2. Add Capacitor CLI + Android platform when ready: `npm i -D @capacitor/cli && npm i @capacitor/android` then `npx cap init` and `npx cap add android`.
3. Use the Next static output (`out/`) as the Capacitor web asset directory.
4. Validate camera/filesystem permissions for Android-specific UX if native integrations are needed.
5. Keep auth and billing endpoints on HTTPS (current Worker approach is compatible).

This gives one core codebase for desktop web + Android shell with minimal divergence.
