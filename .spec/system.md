# Project Constitution: ZeroByteMode Studio

## Architecture
- **Immutable Static Frontend:** Built with Next.js App Router (Static Export).
- **Client-Side Processing:** All heavy lifting (image compression) is done locally in the browser using WASM engines (@jsquash).
- **Zero Server Uploads:** Complete privacy; image data never leaves the user's device.
- **Serverless Commerce:** Cloudflare Worker handles authentication (magic links) and Stripe subscription validation.

## Core Logic
- Free tier: Native browser compression or intelligent fallback (WebP/JPEG).
- Pro tier: Unlocks professional WASM codecs (MozJPEG, OxiPNG, AVIF), batch queueing, and secure ZIP encryption.
- Execution happens on a dedicated Web Worker (`compressor.worker.ts`) to keep the main UI thread responsive.

## Vibe
- "Sovereign Web Architecture"
- High-performance, military-grade, privacy-first, professional tool.
- Clean, fast, and elegant UI with delightful micro-interactions (haptics, glowing accents, instant feedback).
