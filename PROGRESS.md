# ZeroByteMode progress

Updated: 31 July 2026

## Mission

ZeroByteMode is one complete open-source image compressor that runs locally in the browser: no upload service, account, analytics, payment or paid feature tier.

## Product boundary

- Static Next.js export hosted by GitHub Pages at `https://zerobytemode.com`.
- JPEG, PNG, WebP and AVIF processing in a browser Web Worker.
- MozJPEG, OxiPNG, libwebp and libavif WebAssembly codecs, plus browser-native encoding.
- Batch queues, quality controls, previews, individual downloads and ZIP export are available to everyone.
- Image content, filenames and generated files are not sent to an application service.
- `public/CNAME` is the single custom-domain source; `out/` is the deployable application unit.

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
- Removed the unsupported `_headers` configuration and aligned the local validation server with GitHub Pages rather than pretending custom COOP/COEP headers exist in production.
- Made CI whitespace validation work for a parentless root commit.

## Team decision

- **Jared:** release only after the complete user journey and evidence matrix pass.
- **Richard:** codec claims must identify the encoder and the emitted MIME signature, not merely a successful button click.
- **Dinesh:** validate real dimensions, quality behaviour, mixed batches, ZIP contents and corrupt inputs in Chromium.
- **Gilfoyle:** test the same isolation and hosting constraints GitHub Pages actually provides.
- **Jian-Yang:** a WebP fallback is not an AVIF success; fallback reporting must be explicit.
- **Cave Pony:** one verified product tree, one domain source and no dead hosting machinery.

## Repository history

The public release is maintained as one parentless commit on `main`. Before the history cutover, the previous refs are captured in a time-limited GitHub Actions bundle for emergency recovery; legacy Jules, Copilot, Palette, Sentinel, Bolt, auth and worker branches are not part of the public release graph.

## Release and rollback

Every push to `main` runs the complete validation suite and deploys the exact static artifact through GitHub Pages. Normal rollback means restoring a known-good release tree and recreating a single clean root commit; the retired account, payment and remote-worker architecture must not be restored.

## Next highest-value action

Keep the compression matrix green as codecs, browsers and dependencies change. Do not add a format or privacy claim without executable evidence.
