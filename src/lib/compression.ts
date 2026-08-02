export type OutputFormat =
  | "auto"
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/avif";

export type CompressionEngine =
  | "autopilot"
  | "browser"
  | "mozjpeg"
  | "oxipng"
  | "webp"
  | "avif";

export type SupportedImageType = Exclude<OutputFormat, "auto">;

export interface CompressionRequest {
  quality: number;
  type: SupportedImageType;
  engine: Exclude<CompressionEngine, "autopilot">;
  autoPilot: boolean;
}

export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const satisfies readonly SupportedImageType[];

export const FILE_ACCEPT = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ...SUPPORTED_IMAGE_TYPES,
].join(",");

const TYPE_BY_EXTENSION: Record<string, SupportedImageType> = {
  avif: "image/avif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const FIXED_ENGINE_TYPE: Partial<Record<CompressionEngine, SupportedImageType>> = {
  avif: "image/avif",
  mozjpeg: "image/jpeg",
  oxipng: "image/png",
  webp: "image/webp",
};

const ENGINE_LABELS: Record<string, string> = {
  avif: "libavif",
  "browser-avif-fallback": "browser AVIF fallback",
  browser: "browser native",
  "browser-jpeg-fallback": "browser JPEG fallback",
  "browser-png-fallback": "browser PNG fallback",
  "browser-webp-fallback": "browser WebP fallback",
  mozjpeg: "MozJPEG",
  "original-retained": "original kept",
  oxipng: "OxiPNG",
  webp: "libwebp",
  "webp-fallback": "libwebp fallback",
};

export function normaliseImageType(type: string, filename = ""): SupportedImageType | null {
  const canonicalType = type.toLowerCase() === "image/jpg" ? "image/jpeg" : type.toLowerCase();
  if ((SUPPORTED_IMAGE_TYPES as readonly string[]).includes(canonicalType)) {
    return canonicalType as SupportedImageType;
  }

  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return TYPE_BY_EXTENSION[extension] ?? null;
}

export function normaliseImageFile(file: File): File | null {
  const type = normaliseImageType(file.type, file.name);
  if (!type) return null;
  if (file.type === type) return file;

  return new File([file], file.name, {
    lastModified: file.lastModified,
    type,
  });
}

export function resolveOutputType(
  inputType: string,
  selectedFormat: OutputFormat,
  selectedEngine: CompressionEngine,
): SupportedImageType {
  const engineType = FIXED_ENGINE_TYPE[selectedEngine];
  if (engineType) return engineType;
  if (selectedFormat !== "auto") return selectedFormat;

  return normaliseImageType(inputType) ?? "image/webp";
}

export function createCompressionRequest(
  inputType: string,
  qualityPercent: number,
  selectedFormat: OutputFormat,
  selectedEngine: CompressionEngine,
): CompressionRequest {
  const type = resolveOutputType(inputType, selectedFormat, selectedEngine);
  return {
    quality: Math.max(1, Math.min(100, qualityPercent)) / 100,
    type,
    engine: selectedEngine === "autopilot" ? "browser" : selectedEngine,
    autoPilot: selectedEngine === "autopilot",
  };
}

export function outputExtension(type: string): string {
  if (type === "image/jpeg" || type === "image/jpg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/avif") return "avif";
  if (type === "image/webp") return "webp";
  return "bin";
}

export function safeFilename(filename: string): string {
  const cleaned = filename
    .replace(/[\\/\u0000-\u001f\u007f]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+|[. ]+$/g, "")
    .trim();
  return cleaned || "image";
}

export function safeStem(filename: string): string {
  const cleaned = safeFilename(filename);
  const stem = cleaned.replace(/\.[^.]+$/, "").replace(/[. ]+$/g, "");
  return stem || "image";
}

export function outputFilename(
  originalName: string,
  outputType: string,
  engineUsed?: string,
): string {
  const original = safeFilename(originalName);
  if (engineUsed === "original-retained") return original;
  return `${safeStem(original)}.${outputExtension(outputType)}`;
}

export function uniqueFilename(filename: string, used: Set<string>): string {
  const safe = safeFilename(filename);
  const key = safe.toLowerCase();
  if (!used.has(key)) {
    used.add(key);
    return safe;
  }

  const dot = safe.lastIndexOf(".");
  const stem = dot > 0 ? safe.slice(0, dot) : safe;
  const extension = dot > 0 ? safe.slice(dot) : "";
  let index = 2;
  let candidate = `${stem}-${index}${extension}`;

  while (used.has(candidate.toLowerCase())) {
    index += 1;
    candidate = `${stem}-${index}${extension}`;
  }

  used.add(candidate.toLowerCase());
  return candidate;
}

export function formatSizeDelta(originalSize: number, outputSize: number): string {
  if (originalSize <= 0 || outputSize < 0) return "Size unavailable";
  const percent = Math.round(Math.abs(1 - outputSize / originalSize) * 100);
  if (percent === 0) return "Same size";
  return outputSize < originalSize ? `${percent}% smaller` : `${percent}% larger`;
}

export function engineLabel(engineUsed?: string): string | null {
  if (!engineUsed) return null;
  return ENGINE_LABELS[engineUsed] ?? engineUsed.replaceAll("-", " ");
}
