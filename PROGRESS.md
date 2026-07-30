# ZeroByteMode progress

Updated: 30 July 2026

## Mission

Make ZeroByteMode a genuinely open-source, local-only image compressor: one complete feature set, no account, no paywall and no remote application service.

## Current branch

`agent/open-source-local-only`, based on released `main` commit `d6a05a04e3c714860cb9cacffc3496be19eb7085`.

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

## Team decision

- **Jared:** one useful open product is clearer than a crippled free product plus unfinished billing.
- **Richard:** keep the proven static export, Web Worker and WASM codecs; delete the server boundary.
- **Dinesh:** rebuild the main journey rather than scatter `isPro` exceptions through 1,300 lines.
- **Gilfoyle:** no identity or payment data is safer and cheaper than hardening an unnecessary account platform.
- **Jian-Yang:** do not claim local privacy while loading analytics or validating subscriptions remotely.
- **Cave Pony:** files in, smaller files out. Everything else must justify itself.

## Validation still required

- Normalize `package-lock.json` after dependency removal.
- Run locked install and dependency audit.
- Run ESLint and TypeScript.
- Build the static export.
- Run browser, codec, mobile and local-boundary tests.
- Inspect the generated homepage at desktop and mobile widths.

## Release state

No pull request is open and `main` has not been changed. The branch must not merge until the exact head passes the complete release gate.

## Rollback

Before merge, abandon the branch. After a squash merge, revert the one release commit and redeploy the previous static output.

## Next highest-value action

Finish repository cleanup, normalize the lockfile, run exact-head validation and open a reviewable pull request only if the one-edition browser app passes.
