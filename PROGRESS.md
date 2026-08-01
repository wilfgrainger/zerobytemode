# ZeroByteMode progress

Updated: 1 August 2026

## Current release

- The mobile-first redesign is present on `main` from commit `8f5e722`.
- `zerobytemode.com` is served by a connected Cloudflare Worker, not directly from the GitHub Pages artifact.
- The original direct API commit did not trigger Cloudflare's Git deployment. A normal pull-request event exposed the real deployment fault: the repository cleanup had removed the Wrangler configuration while the Cloudflare Worker still expected `npx wrangler deploy`.
- `wrangler.jsonc` now deploys the generated `out/` directory as Cloudflare Workers Static Assets.
- Expected live markers after a successful production deployment: `Private by design`, `Local session`, `Compress images`, and the dark `ZB` brand mark.

## Mission

ZeroByteMode is one complete open-source image compressor that runs locally in the browser: no upload service, account, analytics, payment or paid feature tier.

## Product boundary

- Static Next.js export served at `https://zerobytemode.com` through Cloudflare Workers Static Assets.
- GitHub Actions validates the exact same `out/` artifact and retains GitHub Pages as a fallback deployment path.
- JPEG, PNG, WebP and AVIF processing in a browser Web Worker.
- MozJPEG, OxiPNG, libwebp and libavif WebAssembly codecs, plus browser-native encoding.
- Batch queues, quality controls, previews, individual downloads and ZIP export are available to everyone.
- Image content, filenames and generated files are not sent to an application service.
- `out/` is the deployable application unit; `wrangler.jsonc` is the Cloudflare deployment source of truth.

## Compression validation

Exact release head `30dff51b3a873fdddc4046ac9687b018a114d974` passed workflow run `#37` (`30622835754`) with 17 Chromium tests and evidence artifact `8790145112`.

Real 320×240 fixture results at quality 82:

| Path | Input | Output | Reduction | Result |
| --- | ---: | ---: | ---: | --- |
| MozJPEG | 102,534 B PNG | 18,126 B JPEG | 82% | Valid JPEG, dimensions preserved |
| OxiPNG | 168,070 B PNG | 39,150 B PNG | 77% | Valid PNG, dimensions preserved |
| libwebp | 102,534 B PNG | 10,522 B WebP | 90% | Valid WebP, dimensions preserved |
| libavif | 102,534 B PNG | 10,596 B AVIF | 90% | Valid AVIF, dimensions preserved |
| Browser JPEG | 102,534 B PNG | 15,967 B JPEG | 84% | Valid JPEG, dimensions preserved |

Additional evidence:

- Auto-pilot selected OxiPNG for PNG, MozJPEG for JPEG and browser-native WebP for WebP.
- AVIF encoded at quality 92, decoded, then recompressed from 13,850 B to 4,944 B at quality 45.
- MozJPEG quality 35 produced 6,213 B versus 34,555 B at quality 92.
- Mixed PNG, JPEG and WebP batches completed and produced a valid ZIP with correct filenames.
- Corrupt image input failed safely without exposing a download.
- The browser made no external application requests and wrote no identity state.
- Locked install, dependency audit, repository invariants, whitespace, lint, TypeScript and static export all passed.

## Defects fixed during validation

- Removed a broken manual AVIF WASM path override that silently caused WebP fallback while the interface reported libavif.
- Report the encoder that actually produced each file, including fallbacks and original-file retention.
- Allowed local `blob:` reads in the CSP so ZIP generation can read completed in-memory outputs.
- Removed unsupported response-header claims and aligned browser tests with the real static hosting boundary.
- Made CI whitespace validation work for a parentless root commit.
- Restored an explicit Cloudflare Workers Static Assets configuration after the repository cleanup removed the old deployment files.

## Team decision

- **Jared:** release only after the complete user journey and evidence matrix pass.
- **Richard:** codec claims must identify the encoder and the emitted MIME signature, not merely a successful button click.
- **Dinesh:** validate real dimensions, quality behaviour, mixed batches, ZIP contents and corrupt inputs in Chromium.
- **Gilfoyle:** production hosting and repository deployment configuration must describe the same system.
- **Jian-Yang:** a successful source commit is not a release when the connected production builder cannot deploy it.
- **Cave Pony:** one static artifact, one minimal Wrangler file and no runtime Worker code.

## Repository history

The public release began as one parentless commit on `main`. Subsequent product updates are kept small, reviewable and release-focused; legacy Jules, Copilot, Palette, Sentinel, Bolt, auth and remote-worker branches are not part of the public product architecture.

## Release and rollback

Production changes are merged into `main` through ordinary pull requests. Cloudflare Workers Builds runs `npm run build` and deploys `out/` using `wrangler.jsonc`; GitHub Actions independently validates the same artifact. Normal rollback means restoring a known-good tree and redeploying it. The retired account, payment and remote-processing architecture must not be restored.

## Next highest-value action

Confirm the corrected Cloudflare deployment completes and verify the redesigned mobile page at `zerobytemode.com`, then keep the compression matrix green as codecs, browsers and dependencies change.
