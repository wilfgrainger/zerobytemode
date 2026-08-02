# ZeroByteMode progress

Updated: 2 August 2026

## Current release

- The production site is a static GitHub Pages deployment at `https://zerobytemode.com`.
- Cloudflare Worker deployment configuration is not part of the repository or product architecture.
- `main` remains the deployed release while reliability candidate PR `#58` is independently validated.
- Expected live markers remain `Private by design`, `Local session`, `Compress images`, and the dark `ZB` brand mark.

## Mission

ZeroByteMode is one complete open-source image compressor that runs locally in the browser: no upload service, account, analytics, payment or paid feature tier.

## Product boundary

- Static Next.js export hosted by GitHub Pages at `https://zerobytemode.com`.
- GitHub Actions validates and deploys the exact generated `out/` artifact.
- JPEG, PNG, WebP and AVIF processing runs in a browser Web Worker.
- MozJPEG, OxiPNG, libwebp and libavif WebAssembly codecs are available alongside browser-native encoding.
- Batch queues, quality controls, previews, individual downloads and ZIP export are available to everyone.
- Image content, filenames and generated files are not sent to an application service.
- `public/CNAME` is the custom-domain source and `out/` is the deployable application unit.
- No Worker runtime, Wrangler configuration, backend, API or remote processing service is part of the product.

## Reliability candidate

PR `#58` hardens the complete local journey without changing the hosting or privacy architecture:

- Explicitly rejects unsupported and MIME-conflicting files instead of silently staging them.
- Captures output settings when a batch starts so later control changes cannot affect in-flight work.
- Keeps fixed codecs aligned with their real output format and preserves AVIF in Auto mode.
- Reports the encoder or fallback that actually produced every result.
- Reports outputs as smaller, larger or unchanged without negative “savings” wording.
- Cancels an active batch safely and restarts the local worker without discarding the queue.
- Creates ZIP files directly from in-memory Blob objects and preserves duplicate names safely.
- Traps and restores keyboard focus in the visual comparison dialog.
- Tightens `connect-src` to the application origin while retaining local Blob image previews.

## Compression validation

Known-good release head `30dff51b3a873fdddc4046ac9687b018a114d974` passed workflow run `#37` (`30622835754`) with 17 Chromium tests and evidence artifact `8790145112`.

The reliability candidate expands the suite to 25 browser and deterministic decision tests. Its release gate covers:

- locked dependency installation and high-severity audit;
- repository architecture invariants and whitespace;
- ESLint, strict TypeScript and static export;
- real MozJPEG, OxiPNG, libwebp, libavif and browser-native output validation;
- Auto-pilot format selection and AVIF round-trip compression;
- quality response, mixed-batch ZIP output and corrupt-input handling;
- unsupported MIME rejection, fixed codec/format coherence and safe duplicate filenames;
- narrow mobile layout, keyboard focus management, no external requests, cookies or identity state.

Real 320×240 fixture results at quality 82 remain:

| Path | Input | Output | Reduction | Result |
| --- | ---: | ---: | ---: | --- |
| MozJPEG | 102,534 B PNG | 18,126 B JPEG | 82% | Valid JPEG, dimensions preserved |
| OxiPNG | 168,070 B PNG | 39,150 B PNG | 77% | Valid PNG, dimensions preserved |
| libwebp | 102,534 B PNG | 10,522 B WebP | 90% | Valid WebP, dimensions preserved |
| libavif | 102,534 B PNG | 10,596 B AVIF | 90% | Valid AVIF, dimensions preserved |
| Browser JPEG | 102,534 B PNG | 15,967 B JPEG | 84% | Valid JPEG, dimensions preserved |

## Team decision

- **Jared:** improve the real completion path, not decorate an already credible interface.
- **Richard:** centralise compression decisions so UI and worker contracts cannot drift.
- **Dinesh:** make every failure, fallback and batch outcome legible to the user.
- **Gilfoyle:** remove unnecessary Blob network permission and keep all output handling in memory.
- **Jian-Yang:** reject disguised unsupported files and duplicate ZIP names before they become user data-loss bugs.
- **Cave Pony:** one local queue, one worker, one honest result path.

## Repository history

The public release began as one parentless commit on `main`. Subsequent product updates are small, reviewable and release-focused; legacy Jules, Copilot, Palette, Sentinel, Bolt, auth and remote-worker branches are not part of the public product architecture.

## Release and rollback

Every push to `main` runs the complete validation suite and deploys the exact static artifact through GitHub Pages. Normal rollback means restoring a known-good tree and redeploying it. The retired account, payment, Cloudflare Worker and remote-processing architecture must not be restored.

## Next highest-value action

Complete the PR `#58` quality gate and independent review. Once explicitly approved, merge it to `main`, allow the existing GitHub Pages workflow to deploy the exact artifact, then verify the live compression journey at `zerobytemode.com`.
