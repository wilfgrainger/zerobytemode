import { expect, test } from "@playwright/test";
import {
  createCompressionRequest,
  formatSizeDelta,
  normaliseImageType,
  outputFilename,
  resolveOutputType,
  safeFilename,
  uniqueFilename,
} from "../src/lib/compression";

test.describe("compression decision helpers", () => {
  test("normalises supported MIME types and file extensions", () => {
    expect(normaliseImageType("image/jpg")).toBe("image/jpeg");
    expect(normaliseImageType("", "holiday.AVIF")).toBe("image/avif");
    expect(normaliseImageType("image/svg+xml", "vector.svg")).toBeNull();
  });

  test("preserves AVIF in auto mode and lets fixed codecs own their format", () => {
    expect(resolveOutputType("image/avif", "auto", "autopilot")).toBe("image/avif");
    expect(resolveOutputType("image/png", "image/webp", "mozjpeg")).toBe("image/jpeg");

    expect(createCompressionRequest("image/avif", 82, "auto", "autopilot")).toEqual({
      quality: 0.82,
      type: "image/avif",
      engine: "browser",
      autoPilot: true,
    });
  });

  test("creates safe, collision-free ZIP filenames", () => {
    const used = new Set<string>();
    expect(uniqueFilename("photo.jpg", used)).toBe("photo.jpg");
    expect(uniqueFilename("PHOTO.jpg", used)).toBe("PHOTO-2.jpg");
    expect(uniqueFilename("photo.jpg", used)).toBe("photo-3.jpg");
    expect(safeFilename("../unsafe/name.png")).toBe("-unsafe-name.png");
  });

  test("keeps original names when the original file wins", () => {
    expect(outputFilename("already-small.jpeg", "image/jpeg", "original-retained")).toBe(
      "already-small.jpeg",
    );
    expect(outputFilename("large.photo.png", "image/webp", "webp")).toBe(
      "large.photo.webp",
    );
  });

  test("reports larger outputs honestly", () => {
    expect(formatSizeDelta(1_000, 500)).toBe("50% smaller");
    expect(formatSizeDelta(1_000, 1_250)).toBe("25% larger");
    expect(formatSizeDelta(1_000, 1_000)).toBe("Same size");
  });
});
