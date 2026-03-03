# Cloudflare Worker: Auth + Subscription Check

This worker provides:
- Magic-link login (token stored in D1)
- Subscription validation against Stripe (by email)

## Required secrets/vars
- `STRIPE_SECRET_KEY` (restricted key is fine)
- `STRIPE_WEBHOOK_SECRET` (the `whsec_...` from Stripe)
- `BASE_URL` (your Next app URL, used to build the magic link)
- `ALLOWED_ORIGIN` (lock CORS to your site)
- `ENVIRONMENT=production`
- `REQUIRE_ACTIVE_SUBSCRIPTION_FOR_LOGIN=true` (set to `false` to allow non-subs to receive magic links)

Optional (email sending via Resend):
- `RESEND_API_KEY`
- `EMAIL_FROM` (must be a verified sender/domain in Resend; otherwise Resend will reject)

## D1 schema
Run both:
- `auth-schema.sql` (login tokens)
- `schema.sql` (optional subscriptions table; not required for Stripe-only checking)

## API contract (POST)
- `{ "action": "send-magic-link", "email": "user@example.com" }`
- `{ "action": "verify-token", "token": "..." }`
- `{ "action": "check", "email": "user@example.com" }`
- `{ "action": "verify-session", "sessionId": "cs_..." }`

## Webhook relay
Your Stripe endpoint can stay pointed at the Next.js site (`/api/stripe-webhook`); Next will forward the raw webhook payload + signature to the Worker at `/stripe-webhook` for verification and DB updates.
