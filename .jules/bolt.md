
## 2025-03-02 - [Fix React Re-renders from Unnecessary object URL recreation]
**Learning:** Found an issue where `URL.createObjectURL(selectedFile.file)` in the main `Home` component would trigger on *any* update to the `files` state array (such as individual worker logs). This caused excessive creation and destruction of object URLs.
**Action:** When working with objects derived from state arrays, ensure the `useEffect` dependency is explicitly tied to the primitive reference or specific field (e.g., `[selectedFile?.file]`) rather than the overarching list dependency `[files]`.

## 2025-03-05 - [Optimize Canvas Pixel Extraction for WASM Codecs]
**Learning:** Found a severe performance bottleneck when converting user-uploaded images to `ImageData` buffers for WASM encoders (MozJPEG, OxiPNG, AVIF). Calling `ctx.getImageData()` on a hardware-accelerated `OffscreenCanvas` forces a costly GPU-to-CPU memory readback, significantly slowing down the pre-processing phase before WASM execution.
**Action:** Always instantiate canvas contexts with `getContext("2d", { willReadFrequently: true })` when the primary goal is pixel extraction (`getImageData`) rather than rendering. This forces a software-backed canvas, avoiding the GPU readback penalty and making extraction measurably faster.
