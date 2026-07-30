# ZeroByteMode progress

Updated: 30 July 2026

## Mission

Make ZeroByteMode a genuinely open-source, local-only image compressor: one complete feature set, no account, no paywall and no remote application service.

## Current candidate

Draft PR `#49`, branch `agent/open-source-local-only`, is based on released `main` commit `d6a05a04e3c714860cb9cacffc3496be19eb7085`.

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

## Team decision

- **Jared:** one useful open product is clearer than a crippled free product plus unfinished billing.
- **Richard:** keep the proven static export, Web Worker and WASM codecs; delete the server boundary.
- **Dinesh:** rebuild the main journey rather than scatter `isPro` exceptions through 1,300 lines.
- **Gilfoyle:** no identity or payment data is safer and cheaper than hardening an unnecessary account platform.
- **Jian-Yang:** do not claim local privacy while loading analytics or validating subscriptions remotely.
- **Cave Pony:** files in, smaller files out. Everything else must justify itself.

## Validation state

Initial PR workflow run `#1` stopped at the high-severity dependency audit. It identified outdated Next.js and transitive Babel, glob, YAML, PostCSS and Sharp packages before any application checks ran.

The candidate now uses Next.js `16.2.12`, the matching ESLint configuration and explicit audited transitive overrides. A one-shot branch workflow regenerated `package-lock.json`, committed the reduced lockfile and removed itself.

The next exact-head workflow must prove:

- locked Node 22 installation;
- zero high or critical dependency findings;
- repository architecture invariants;
- patch whitespace, ESLint and TypeScript;
- static export and exact-artifact assertions;
- Chromium browser, codec and mobile tests;
- no external application requests, account cookies or browser identity storage;
- no account, checkout, subscription or paid feature surface.

## Release state

PR `#49` remains a draft. `main` and production are unchanged. The PR must not be marked ready or merged until the exact head passes the complete release gate and responsive evidence is inspected.

## Rollback

Before merge, close the PR or abandon the branch. After a squash merge, revert the one release commit and redeploy the previous static output.

## Next highest-value action

Run the permanent exact-head workflow on the owner-authored handoff commit, fix validated findings only, then inspect the desktop and mobile evidence before marking PR `#49` ready.
