# ZeroByteMode progress

Updated: 1 August 2026

## Current release

- The mobile-first redesign is present on `main` from commit `8f5e722`.
- The production site is a static GitHub Pages deployment at `https://zerobytemode.com`.
- Cloudflare Worker deployment configuration has been removed from the repository.
- Expected live markers: `Private by design`, `Local session`, `Compress images`, and the dark `ZB` brand mark.

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
- Removed unsupported response-header claims and aligned browser tests with static hosting.
- Made CI whitespace validation work for a parentless root commit.
- Removed Cloudflare Worker deployment configuration so hosting matches the agreed GitHub Pages-only architecture.

## Team decision

- **Jared:** one clear product and one clear hosting path.
- **Richard:** static hosting must not be confused with remote image processing; all image work remains in-browser.
- **Dinesh:** validate the complete experience against the generated GitHub Pages artifact.
- **Gilfoyle:** no Worker runtime, backend secret or duplicate deployment system.
- **Jian-Yang:** a second host adds operational ambiguity without improving the product.
- **Cave Pony:** GitHub Pages, one static artifact, done.

## Repository history

The public release began as one parentless commit on `main`. Subsequent product updates are small, reviewable and release-focused; legacy Jules, Copilot, Palette, Sentinel, Bolt, auth and remote-worker branches are not part of the public product architecture.

## Release and rollback

Every push to `main` runs the complete validation suite and deploys the exact static artifact through GitHub Pages. Normal rollback means restoring a known-good tree and redeploying it. The retired account, payment, Cloudflare Worker and remote-processing architecture must not be restored.

## Next highest-value action

Point `zerobytemode.com` exclusively at GitHub Pages, remove any remaining Cloudflare Worker custom-domain route in the Cloudflare dashboard, then verify the redesigned page and compression journey on the live domain.
