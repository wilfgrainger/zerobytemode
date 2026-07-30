# ZeroByteMode progress

Updated: 30 July 2026

## Mission

Make ZeroByteMode a genuinely open-source, local-only image compressor: one complete feature set, no account, no paywall and no remote application service.

## Current candidate

PR `#49`, branch `agent/open-source-local-only`, is based on released `main` commit `d6a05a04e3c714860cb9cacffc3496be19eb7085`.

## Delivered in the candidate

- Replaced Free/Pro entitlement logic with one unlocked application.
- Removed sign-in, email collection, checkout, subscription management and support forms.
- Removed Stripe, Resend, D1 and the Cloudflare subscription Worker.
- Removed account cookies, magic-link verification and remote application URLs.
- Removed Google Analytics and all third-party CSP application origins.
- Made unlimited local batching, quality/format controls, all codecs, comparison and ZIP export available to everyone.
- Removed the obsolete service worker rather than retain stale remote-service logic.
- Added MIT licensing, contribution guidance and an explicit privacy boundary.
- Replaced architecture and requirements documents with the local-only model.
- Replaced entitlement tests with open-edition, no-network, no-storage and codec checks.
- Added a permanent CI gate and repository invariant validator.
- Added deployable static security headers and production-artifact browser testing.

## Team decision

- **Jared:** one useful open product is clearer than a crippled free product plus unfinished billing.
- **Richard:** keep the proven static export, Web Worker and WASM codecs; delete the server boundary.
- **Dinesh:** rebuild the main journey rather than scatter `isPro` exceptions through 1,300 lines.
- **Gilfoyle:** no identity or payment data is safer and cheaper than hardening an unnecessary account platform.
- **Jian-Yang:** do not claim local privacy while loading analytics or validating subscriptions remotely.
- **Cave Pony:** files in, smaller files out. Everything else must justify itself.

## Validation evidence

Exact candidate `0038c59be90e12a23b8f099c051059ac3ace04b3` passed permanent workflow run `#15` (`30554440964`):

- locked Node 22 installation;
- zero high or critical dependency findings;
- repository one-edition and local-only invariants;
- complete PR whitespace comparison;
- ESLint and TypeScript;
- static Next.js export;
- exact HTML and `_headers` assertions;
- production static-server Chromium tests;
- a queue larger than the former free limit;
- Auto-pilot, OxiPNG and AVIF/fallback compression paths;
- all codec, format and quality controls available without entitlement;
- no external application requests, account cookies or application-owned browser identity storage;
- no account, checkout, subscription or paid feature surface;
- mobile overflow and desktop/mobile screenshot evidence.

The review artefact `open-local-release-evidence` has digest `sha256:252658f702b57d50059a1f35d0d6f19f7a8dd2902f2fa9b435a6f2276a59a999`.

Desktop and 390px mobile screenshots were manually inspected. The product hierarchy is clear, no development overlay is present, and no clipping, horizontal overflow, inaccessible control or misleading paid-state residue was found.

## Release state

`main` and production are unchanged. This documentation-only handoff commit must pass the same permanent workflow before PR `#49` is marked ready. The PR remains unmerged unless the owner explicitly approves release.

## Rollback

Before merge, close the PR or abandon the branch. After a squash merge, revert the one release commit and redeploy the previous static output.

## Next highest-value action

Confirm the final documentation-only exact-head workflow is green, update PR `#49` with the final evidence and mark it ready for owner review.
