/** ZeroByteMode local compression worker using open @jsquash WASM codecs. */

async function getImageData(file: File | Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Could not get canvas context");

  context.drawImage(bitmap, 0, 0);
  const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height);
  bitmap.close();
  return imageData;
}

async function browserEncode(
  file: File | Blob,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get canvas context");

  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.convertToBlob({ type: mimeType, quality });
}

self.onmessage = async (event: MessageEvent) => {
  const { file, quality, type, id, engine, autoPilot } = event.data;

  const postLog = (message: string) => {
    self.postMessage({ type: "log", id, message });
  };

  try {
    postLog("Initialising local compression");
    let normalizedQuality = quality > 1 ? quality / 100 : quality;
    normalizedQuality = Math.max(0.01, Math.min(1, normalizedQuality));

    let selectedEngine = engine || "browser";

    if (autoPilot) {
      if (type && type !== file.type) {
        if (type === "image/webp") selectedEngine = "webp";
        else if (type === "image/avif") selectedEngine = "avif";
        else selectedEngine = "browser";
      } else if (file.type === "image/png") {
        selectedEngine = "oxipng";
      } else if (file.type === "image/jpeg" || file.type === "image/jpg") {
        selectedEngine = "mozjpeg";
      } else {
        selectedEngine = "browser";
      }
    }

    let engineUsed = selectedEngine;

    console.log(
      `[ZeroByteMode] Engine: ${selectedEngine} | Quality: ${Math.round(normalizedQuality * 100)}% | Input: ${file.type} (${file.size} bytes)`,
    );
    postLog(`Engine selected: ${selectedEngine.toUpperCase()}`);

    let blob: Blob;

    if (selectedEngine === "mozjpeg") {
      try {
        const [{ encode }, imageData] = await Promise.all([
          import("@jsquash/jpeg"),
          getImageData(file),
        ]);
        const buffer = await encode(imageData, {
          quality: Math.round(normalizedQuality * 100),
        });
        blob = new Blob([buffer], { type: "image/jpeg" });
      } catch (error) {
        console.warn("[ZeroByteMode] MozJPEG failed; using browser JPEG encoder", error);
        engineUsed = "browser-jpeg-fallback";
        blob = await browserEncode(file, "image/jpeg", normalizedQuality);
      }
    } else if (selectedEngine === "oxipng") {
      try {
        const [{ optimise }, imageData] = await Promise.all([
          import("@jsquash/oxipng"),
          getImageData(file),
        ]);
        const buffer = await optimise(imageData, { level: 3, interlace: false });
        blob = new Blob([buffer], { type: "image/png" });
      } catch (error) {
        console.warn("[ZeroByteMode] OxiPNG failed; using browser PNG encoder", error);
        engineUsed = "browser-png-fallback";
        blob = await browserEncode(file, "image/png", normalizedQuality);
      }
    } else if (selectedEngine === "avif") {
      try {
        const [{ default: encode }, imageData] = await Promise.all([
          import("@jsquash/avif/encode"),
          getImageData(file),
        ]);
        const buffer = await encode(imageData, {
          quality: Math.round(normalizedQuality * 100),
          speed: 6,
        });
        blob = new Blob([buffer], { type: "image/avif" });
      } catch (error) {
        console.warn("[ZeroByteMode] AVIF failed; falling back to WebP", error);
        try {
          const [{ encode }, imageData] = await Promise.all([
            import("@jsquash/webp"),
            getImageData(file),
          ]);
          const buffer = await encode(imageData, {
            quality: Math.round(normalizedQuality * 100),
          });
          engineUsed = "webp-fallback";
          blob = new Blob([buffer], { type: "image/webp" });
        } catch {
          engineUsed = "browser-webp-fallback";
          blob = await browserEncode(file, "image/webp", normalizedQuality);
        }
      }
    } else if (selectedEngine === "webp") {
      try {
        const [{ encode }, imageData] = await Promise.all([
          import("@jsquash/webp"),
          getImageData(file),
        ]);
        const buffer = await encode(imageData, {
          quality: Math.round(normalizedQuality * 100),
        });
        blob = new Blob([buffer], { type: "image/webp" });
      } catch (error) {
        console.warn("[ZeroByteMode] WebP failed; using browser WebP encoder", error);
        engineUsed = "browser-webp-fallback";
        blob = await browserEncode(file, "image/webp", normalizedQuality);
      }
    } else {
      const mimeType = type || file.type || "image/jpeg";
      engineUsed = "browser";
      blob = await browserEncode(file, mimeType, normalizedQuality);
    }

    if (blob.size >= file.size && blob.type === file.type) {
      console.log("[ZeroByteMode] Original file is smaller; retaining it");
      engineUsed = "original-retained";
      blob = file;
    }

    console.log(
      `[ZeroByteMode] Complete: ${file.size} → ${blob.size} bytes | Format: ${blob.type} | Encoder: ${engineUsed}`,
    );

    self.postMessage({
      success: true,
      blob,
      size: blob.size,
      id,
      engineUsed,
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : "Unknown compression error",
      id,
    });
  }
};
