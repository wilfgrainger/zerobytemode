# Contributing

Thank you for improving ZeroByteMode.

## Product invariant

ZeroByteMode has one open edition. Contributions must not add accounts, paid tiers, checkout, subscriptions, analytics, remote image processing or hidden feature gates.

## Development

Use Node.js 22 and npm.

```bash
npm ci
npm run dev
npm run check
```

## Pull requests

Keep changes small enough to review and include:

- the user outcome;
- the files and architecture boundaries changed;
- tests run and their result;
- screenshots for material visual changes;
- privacy or compatibility implications;
- rollback instructions.

Codec changes should include a real browser test. Privacy claims must be supported by code and tests rather than marketing copy.

## Brand

The MIT licence covers the software. Forks are encouraged to use their own name and visual identity and must not imply endorsement by ZeroByteMode or its maintainers.
