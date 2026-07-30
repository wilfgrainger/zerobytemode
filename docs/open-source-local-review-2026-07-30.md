# ZeroByteMode open-source and local-only review

Date: 30 July 2026

## Verdict

The compression engine was already local and technically useful, but the product wrapped it in an unnecessary commercial control plane: Free/Pro state, a three-file free limit, upgrade email collection, Stripe checkout and billing, magic-link authentication, a D1 database, Resend email and a Cloudflare Worker. Google Analytics also contradicted the strongest privacy message.

The team agreed to preserve the browser compression core and delete the commercial/server boundary.

## Team review

- **Jared:** users came to compress images, not create an account. Make the complete workflow the product.
- **Richard:** the static frontend, Web Worker and WASM codecs are the architecture. Auth and billing were a second product with no technical necessity.
- **Dinesh:** the 1,300-line page mixed queue logic, entitlement state, account state, checkout and modals. Rebuild the page around the actual job.
- **Gilfoyle:** Stripe, Resend, D1, cookies, analytics and a Worker multiplied secrets, failure modes and data obligations.
- **Jian-Yang:** “images stay local” was technically narrow while user identity, subscription and analytics data still travelled remotely.
- **Cave Pony:** files in; smaller files out. Delete the tollbooth.

## Implemented upgrades

1. Remove Free and Pro product states.
2. Remove the three-image free limit.
3. Make batch processing available to everyone.
4. Make quality controls available to everyone.
5. Make format controls available to everyone.
6. Make MozJPEG, OxiPNG, libwebp and libavif available to everyone.
7. Make ZIP export available to everyone.
8. Remove upgrade prompts and email collection.
9. Remove Stripe checkout and billing portal logic.
10. Remove magic-link authentication and the verification route.
11. Remove entitlement cookies and session tokens.
12. Remove the Cloudflare subscription Worker.
13. Remove the D1 subscription and login-token schema.
14. Remove Resend support and magic-link email delivery.
15. Remove Google Analytics and third-party CSP origins.
16. Replace remote support submission with public repository links.
17. Replace the main screen with a smaller job-focused queue and settings UI.
18. Add explicit no-network, no-storage and no-paywall browser tests.
19. Add MIT licensing, privacy documentation and contribution rules.
20. Make the generated static `out/` directory the only deployment boundary.

## Rejected alternatives

- **Hide pricing but retain auth:** rejected because it leaves dead complexity and user-data handling.
- **Keep an optional Pro donation tier:** rejected because donations should not control capability; a future sponsorship link can be separate from product access.
- **Retain analytics for growth:** rejected because it weakens the privacy proposition and is not required for compression.
- **Retain the Worker for future use:** rejected under YAGNI; Git history preserves it if a justified server feature ever appears.
- **Keep encryption marketing:** rejected because the existing raw encrypted archive was not a standard password-protected ZIP and complicated the core job.

## Release acceptance

The conversion is acceptable only when the exact branch head proves:

- no paid, account, checkout or subscription UI;
- no external application requests during normal use;
- no account cookies or browser identity storage;
- batches larger than the former free limit;
- working local compression and ZIP download paths;
- static build, mobile layout and accessible controls;
- no high or critical dependency audit findings.
