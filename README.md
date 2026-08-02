# ZeroByteMode

**Open-source image compression. No uploads. No account. No paid tier.**

ZeroByteMode batch-compresses JPEG, PNG, WebP and AVIF files directly in a modern browser. Images are decoded and encoded inside a Web Worker using open WebAssembly codecs. The application has no image-upload endpoint, login system, payment provider, analytics tracker or application database.

## What everyone gets

- Unlimited local batch queues, bounded only by the device's available memory.
- Auto-pilot compression plus MozJPEG, OxiPNG, libwebp, libavif and browser-native engines.
- Output quality and format controls captured consistently for each batch.
- Clear unsupported-file errors, truthful encoder and fallback reporting, and honest size results.
- Individual downloads, keyboard-accessible visual comparison and collision-safe ZIP export.
- Batch cancellation and local worker recovery without uploading or losing the queue.
- Static deployment with no runtime application server or secret.

There is one edition. Nothing is unlocked by payment, cookies, query parameters or an account.

## How it works

```text
Local images
    │
    ▼
Browser File API
    │
    ▼
Web Worker ──> @jsquash WASM codec
    │
    ▼
In-memory Blob ──> preview / download / ZIP
```

The application may be hosted anywhere capable of serving static files. Hosting receives ordinary requests for the application assets; selected images are never submitted to it.

## Local development

Use Node.js 22 and npm.

```bash
npm ci
npm run dev
```

Run the complete release gate:

```bash
npm run check
```

Build the static site:

```bash
npm run build
# output: out/
```

## Repository structure

```text
src/app/page.tsx              Browser UI and local batch queue
src/app/compressor.worker.ts  Local Web Worker and WASM codecs
src/lib/compression.ts        File validation, batch decisions and safe output names
public/                       Static brand and application assets
tests/                        Browser, codec and local-boundary checks
docs/                         Architecture and product requirements
AGENTS.md                     Delivery and review contract
PROGRESS.md                   Verified release evidence and next action
```

## Privacy boundary

ZeroByteMode does not require an email address and does not include payment, analytics, authentication or remote image-processing services. ZIP creation consumes completed in-memory Blob objects directly; the content security policy limits network connections to the application origin. See [PRIVACY.md](PRIVACY.md) for the precise boundary.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Changes must preserve the local-only architecture and must not reintroduce feature gating, telemetry or remote file processing.

## Licence

Software in this repository is available under the [MIT licence](LICENSE). The ZeroByteMode name and logo are not granted for misleading endorsement or impersonation; forks should use their own identity.
