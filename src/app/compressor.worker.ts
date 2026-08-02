/** ZeroByteMode local compression worker using open @jsquash WASM codecs. */

type SupportedImageType = "image/jpeg" | "image/png" | "image/webp" | "image/avif";
type CompressionEngine = "browser" | "mozjpeg" | "oxipng" | "webp" | "avif";

interface CompressionMessage {
  file: File;
  quality: number;
  type: SupportedImageType;
  id: string;
  engine: CompressionEngine;
  autoPilot: boolean;
}

const SUPPORTED_TYPES = new Set<SupportedImageType>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

function normaliseType(type: string): SupportedImageType | null {
  const canonical = type === "image/jpg" ? "image/jpeg" : type;
  return SUPPORTED_TYPES.has(canonical as SupportedImageType)
    ? (canonical as SupportedImageType)
    : null;
}

function selectAutoPilotEngine(
  inputType: SupportedImageType,
  outputType: SupportedImageType,
): CompressionEngine {
  if (outputType !== inputType) {
    if (outputType === "image/jpeg") return "mozjpeg";
    if (outputType === "image/png") return "oxipng";
    if (outputType === "image/webp") return "webp";
    return "avif";
  }

  if (inputType === "image/png") return "oxipng";
  if (inputType === "image/jpeg") return "mozjpeg";
  if (inputType === "image/avif") return "avif";
  return "browser";
}

async function getImageData(file: File | Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Could not get canvas context");

    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

async function browserEncode(
  file: File | Blob,
  mimeType: SupportedImageType,
  quality: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not get canvas context");

    context.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ type: mimeType, quality });
    if (blob.type !== mimeType) {
      throw new Error(`This browser cannot encode ${mimeType.replace("image/", "").toUpperCase()}`);
    }
    return blob;
  } finally {
    bitmap.close();
  }
}

self.onmessage = async (event: MessageEvent<CompressionMessage>) => {
  const { file, quality, type, id, engine, autoPilot } = event.data;

  const postLog = (message: string) => {
    self.postMessage({ type: "log", id, message });
  };

  try {
    const inputType = normaliseType(file.type);
    const outputType = normaliseType(type);
    if (!inputType) throw new Error("Unsupported input type. Use JPEG, PNG, WebP or AVIF.");
    if (!outputType) throw new Error("Unsupported output type.");

    postLog("Initialising local compression");
    let normalizedQuality = quality > 1 ? quality / 100 : quality;
    normalizedQuality = Math.max(0.01, Math.min(1, normalizedQuality));

    const selectedEngine = autoPilot
      ? selectAutoPilotEngine(inputType, outputType)
      : engine || "browser";
    let engineUsed: string = selectedEngine;

    console.log(
      `[ZeroByteMode] Engine: ${selectedEngine} | Quality: ${Math.round(normalizedQuality * 100)}% | Input: ${inputType} (${file.size} bytes)`,
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
      engineUsed = "browser";
      blob = await browserEncode(file, outputType, normalizedQuality);
    }

    if (blob.size >= file.size && blob.type === inputType) {
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
