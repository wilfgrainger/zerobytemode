# ZeroByteMode progress

Updated: 31 July 2026

## Mission

Make ZeroByteMode a genuinely open-source, local-only image compressor: one complete feature set, no account, no paywall and no remote application service.

## Released implementation

PR `#49` was squash-merged to `main` as `82ec4d7d85186314a9807b3b721d6fa43dc0bc9d`.

The release:

- replaces Free/Pro entitlement logic with one unlocked application;
- removes sign-in, email collection, checkout, subscription management and support forms;
- removes Stripe, Resend, D1 and the Cloudflare subscription Worker;
- removes account cookies, magic-link verification and remote application URLs;
- removes Google Analytics and all third-party application origins;
- makes local batching, quality and format controls, all codecs, comparison and ZIP export available to everyone;
- removes the obsolete service worker rather than retain stale remote-service logic;
- adds MIT licensing, contribution guidance and an explicit privacy boundary;
- replaces entitlement tests with open-edition, no-network, no-storage and codec checks;
- keeps `out/` as the only deployable application unit.

## Hosting decision

GitHub Pages is the native host. Cloudflare, Wrangler and the former application Worker are not part of the release architecture.

The repository Pages source was changed to **GitHub Actions** on 31 July 2026. The workflow now:

1. validates the root-domain static export and browser application;
2. builds the custom-domain artefact with no repository sub-path;
3. verifies root asset, logo, manifest and `CNAME` paths;
4. uploads `out/` with the official Pages artefact action;
5. deploys through the `github-pages` environment.

The custom-domain release is configured for `https://zerobytemode.com` and the generated static artefact contains `CNAME` with `zerobytemode.com`.

## Team decision

- **Jared:** one useful open product is clearer than a crippled free product plus unfinished billing.
- **Richard:** keep the proven static export, Web Worker and WASM codecs; delete the server boundary.
- **Dinesh:** rebuild the main journey rather than scatter entitlement exceptions through the interface.
- **Gilfoyle:** no identity or payment data is safer and cheaper than hardening an unnecessary account platform.
- **Jian-Yang:** do not claim local privacy while loading analytics or validating subscriptions remotely.
- **Cave Pony:** files in, smaller files out. Everything else must justify itself.

## Validation evidence

Exact final PR head `28b2bb8e0c813c1ce33c64bcd048ac84cd761c11` passed permanent workflow run `#21` (`30561139015`):

- locked Node 22 installation;
- zero high or critical dependency findings;
- repository one-edition and local-only invariants;
- complete PR whitespace comparison;
- ESLint and TypeScript;
- static Next.js export and exact artefact assertions;
- Chromium tests against the built static product;
- a queue larger than the former free limit;
- Auto-pilot, OxiPNG and AVIF/fallback compression paths;
- all codec, format and quality controls available without entitlement;
- no external application requests, account cookies or application-owned browser identity storage;
- no account, checkout, subscription or paid feature surface.

## Release state

The open-source browser-only implementation is on `main`. DNS and the Pages source setting have been moved to GitHub Pages. Commit `fec63e13946528f0d74e53ecb1ad06944c2cda1c` corrected the deployment to custom-domain root paths. This progress update deliberately triggers a fresh `main` workflow after the Pages source switch.

## Rollback

Revert merge commit `82ec4d7d85186314a9807b3b721d6fa43dc0bc9d` to restore the previous Free/Pro application and Cloudflare control plane. That rollback would intentionally restore the removed remote architecture and is not recommended.

## Next highest-value action

Confirm the fresh `Validate and deploy open local edition` run completes with both `Validate browser application` and `Publish GitHub Pages` green, then verify the public domain shows “Serious image compression” and “No account. No paywall.”
