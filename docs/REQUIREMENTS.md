# ZeroByteMode requirements

## Product requirements

1. The application must process supported images entirely in the browser.
2. Every compression engine, format control, batch feature and ZIP download must be available without payment or identity.
3. Users must be able to add more than three images to one queue.
4. The application must support JPEG, PNG, WebP and AVIF input where the browser can decode it.
5. Auto-pilot must select a sensible codec from the file and requested output.
6. A failed WASM codec should fall back safely where a browser encoder is available.
7. A same-format result larger than the original should retain the original file.
8. Users must be able to preview, compare, remove and download completed items.
9. The interface must work with keyboard navigation and at narrow mobile widths.

## Local-only requirements

The shipped application must not include:

- sign-in, registration or magic links;
- subscription, checkout, billing or feature-entitlement logic;
- Stripe, Resend or analytics scripts;
- an application Worker, database or API;
- remote image processing;
- account cookies or browser identity storage;
- a hidden or disabled paid feature tier.

Ordinary requests for static application assets are allowed. Explicit links to the public source repository are allowed, but the application must not contact third-party services automatically.

## Engineering requirements

- Static export through Next.js `output: "export"`.
- Compression in a dedicated Web Worker.
- Locked npm dependencies and Node.js 22.
- ESLint, TypeScript, static build and Playwright checks.
- Tests for the no-paywall and local-only boundaries.
- No high or critical dependency audit findings at release.

## Open-source requirements

- MIT licence included at repository root.
- README explains local development, architecture and privacy.
- Contributions must preserve the single open edition.
- Brand assets may be replaced by forks; the licence must not be presented as an endorsement of a fork.
