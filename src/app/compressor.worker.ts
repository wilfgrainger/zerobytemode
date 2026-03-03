// Web Worker: Studio Compression Core — Powered by real WASM codecs via @jsquash

/** Draw a File/Blob to an OffscreenCanvas and return its ImageData. */
async function getImageData(file: File | Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  bitmap.close();
  return imageData;
}

/** Fallback: use browser-native OffscreenCanvas encode. */
async function browserEncode(
  file: File | Blob,
  mimeType: string,
  quality: number
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.convertToBlob({ type: mimeType, quality });
}

self.onmessage = async (e: MessageEvent) => {
  const { file, quality, type, id, engine, autoPilot } = e.data;

  const postLog = (msg: string) => {
    self.postMessage({ type: "log", id, message: msg });
  };

  try {
    postLog(`Initialized compression queue for image...`);
    // Normalise quality: slider emits 0.0–1.0 floats; guard against UI sending 0–100.
    let q = quality > 1 ? quality / 100 : quality;
    q = Math.max(0.01, Math.min(1.0, q));

    // --- Auto-Pilot routing ---
    let selectedEngine = engine || "browser";

    if (autoPilot) {
      if (type && type !== file.type) {
        // Format conversion requested — route to appropriate WASM encoder
        if (type === "image/webp") selectedEngine = "webp";
        else if (type === "image/avif") selectedEngine = "avif";
        else selectedEngine = "browser";
      } else if (file.type === "image/png") {
        selectedEngine = "oxipng";              // Lossless Rust engine
      } else if (file.type === "image/jpeg" || file.type === "image/jpg") {
        selectedEngine = "mozjpeg";             // Real MozJPEG WASM
      } else {
        selectedEngine = "browser";             // GIF, BMP, etc.
      }
    }

    console.log(`[STUDIO] Engine: ${selectedEngine} | Quality: ${Math.round(q * 100)}% | Input: ${file.type} (${file.size} bytes)`);
    postLog(`Engine selected: ${selectedEngine.toUpperCase()}`);
    postLog(`Input source: ${file.type} (${(file.size / 1024).toFixed(1)} KB)`);

    let blob: Blob;

    // ----------------------------------------------------------------
    // MozJPEG — real WASM encoder, ~15-25% better than browser canvas
    // ----------------------------------------------------------------
    if (selectedEngine === "mozjpeg") {
      postLog("Waking up MozJPEG WASM module...");
      try {
        const { encode } = await import("@jsquash/jpeg");
        postLog("Decoding source image canvas vectors...");
        const imageData = await getImageData(file);
        // MozJPEG quality is 0–100
        postLog(`Executing Trellis quantization (Quality: ${Math.round(q * 100)}%)...`);
        const buffer = await encode(imageData, { quality: Math.round(q * 100) });
        blob = new Blob([buffer], { type: "image/jpeg" });
      } catch (err) {
        postLog(`[WARNING] MozJPEG failed: ${(err as Error).message}. Falling back natively.`);
        console.warn("[STUDIO] MozJPEG WASM failed, falling back to browser:", err);
        blob = await browserEncode(file, "image/jpeg", q);
      }

    // ----------------------------------------------------------------
    // OxiPNG — lossless Rust PNG optimiser (can't use quality param)
    // ----------------------------------------------------------------
    } else if (selectedEngine === "oxipng") {
      postLog("Waking up OxiPNG Rust framework...");
      try {
        const { optimise } = await import("@jsquash/oxipng");
        // optimise accepts ImageData or ArrayBuffer.
        // Use ImageData path — works for any source format.
        postLog("Mapping input data buffers...");
        const imageData = await getImageData(file);
        // level 3 is a good balance (1=fastest, 6=best compression)
        postLog("Running deep DEFLATE optimization passes (Lossless)...");
        const buffer = await optimise(imageData, { level: 3, interlace: false });
        blob = new Blob([buffer], { type: "image/png" });
      } catch (err) {
        postLog(`[WARNING] OxiPNG failed: ${(err as Error).message}. Falling back natively.`);
        console.warn("[STUDIO] OxiPNG WASM failed, falling back to browser:", err);
        blob = await browserEncode(file, "image/png", q);
      }

    // ----------------------------------------------------------------
    // AVIF — real libavif WASM, typically 40-50% smaller than JPEG
    // ----------------------------------------------------------------
    } else if (selectedEngine === "avif") {
      postLog("Waking up libavif AOMedia Video engine...");
      try {
        // Import separate encode submodule to call init() with locateFile,
        // forcing the single-threaded WASM binary. This bypasses the
        // multithreaded path that hangs when crossOriginIsolated=false.
        const avifEncodeModule = await import("@jsquash/avif/encode");
        // init() accepts one argument: moduleOptionOverrides which accepts locateFile
        await avifEncodeModule.init({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          locateFile: (path: string) => {
            // Redirect to the single-threaded wasm binary (no _mt suffix)
            return path.replace("avif_enc_mt.wasm", "avif_enc.wasm");
          },
        } as any);
        postLog("Decoding uncompressed canvas stream...");
        const imageData = await getImageData(file);
        postLog(`Executing structural encoding (Speed: 6, Quality: ${Math.round(q * 100)}%)...`);
        const buffer = await avifEncodeModule.default(imageData, { quality: Math.round(q * 100), speed: 6 });
        blob = new Blob([buffer], { type: "image/avif" });
      } catch (err) {
        postLog(`[WARNING] AVIF syntax failed: ${(err as Error).message}. Cascading to WebP.`);
        console.warn("[STUDIO] AVIF WASM failed, falling back to WebP:", err);
        try {
          const { encode: encodeWebp } = await import("@jsquash/webp");
          const imageData = await getImageData(file);
          const buffer = await encodeWebp(imageData, { quality: Math.round(q * 100) });
          blob = new Blob([buffer], { type: "image/webp" });
        } catch {
          blob = await browserEncode(file, "image/webp", q);
        }
      }

    // ----------------------------------------------------------------
    // WebP — real libwebp WASM
    // ----------------------------------------------------------------
    } else if (selectedEngine === "webp") {
      try {
        const { encode } = await import("@jsquash/webp");
        const imageData = await getImageData(file);
        const buffer = await encode(imageData, { quality: Math.round(q * 100) });
        blob = new Blob([buffer], { type: "image/webp" });
      } catch (err) {
        console.warn("[STUDIO] WebP WASM failed, falling back to browser:", err);
        blob = await browserEncode(file, "image/webp", q);
      }

    // ----------------------------------------------------------------
    // Browser (native canvas fallback / free tier)
    // ----------------------------------------------------------------
    } else {
      postLog("Utilizing browser native codec API...");
      const mimeType = type || file.type || "image/jpeg";
      postLog(`Instructing DOM Canvas to export as ${mimeType}...`);
      blob = await browserEncode(file, mimeType, q);
    }

    // Safeguard: if same format and compressed is larger, use original
    const outputMime = blob.type;
    postLog("Executing payload verification...");
    if (blob.size >= file.size && outputMime === file.type) {
      console.log("[STUDIO] Compressed was larger than original — using original.");
      postLog("Original file was smaller. Discarding output block.");
      blob = file;
    } else {
      postLog(`Optimization verified. Achieved ${Math.round((1 - blob.size / file.size) * 100)}% density reduction.`);
    }

    console.log(`[STUDIO] Done: ${file.size} → ${blob.size} bytes (${Math.round((1 - blob.size / file.size) * 100)}% saving) | Format: ${blob.type}`);
    postLog("Packaging payload for Main Thread handoff...");

    self.postMessage({
      success: true,
      blob,
      size: blob.size,
      id,
      engineUsed: selectedEngine,
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      id,
    });
  }
};
