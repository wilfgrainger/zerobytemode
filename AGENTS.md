# ZeroByteMode delivery contract

This public repository is an inspectable open-source product. Changes must be understandable to users, contributors and security reviewers.

## Product authority

The owner sets product direction. For substantial delivery work, use the reconciled Silicon Valley and Cave Pony review loop:

1. **Jared** — user outcome, priority, acceptance and release decision.
2. **Richard** — architecture, performance and technical truth.
3. **Dinesh** — browser implementation, accessibility and end-to-end tests.
4. **Gilfoyle** — privacy, dependencies, CI, recovery and attack surface.
5. **Jian-Yang** — adversarial review of claims, incentives and feature gating.
6. **Cave Pony** — final simplification: remove machinery that does not improve the local compression job.

## Permanent invariants

- One complete open edition; no paid or hidden feature tier.
- Images remain in the browser and are never submitted to an application service.
- No account, email, subscription, checkout, analytics, database or application API.
- Static output is the deployable product boundary.
- All privacy and capability claims need code or test evidence.
- Do not add artificial queue limits for monetisation.

## Handoff

Read `PROGRESS.md` before editing. Update it after substantial work with the outcome, evidence, remaining risks and next highest-value action.

## Release gate

A release requires a locked install, zero high or critical audit findings, lint, TypeScript, static export, browser checks, codec evidence, mobile review, no external application requests, no entitlement surface and a documented recovery procedure.
