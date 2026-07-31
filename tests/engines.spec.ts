import { expect, test, type Page } from "@playwright/test";

const WIDTH = 320;
const HEIGHT = 240;

type ImageFixture = {
  name: string;
  mimeType: string;
  buffer: Buffer;
  width: number;
  height: number;
};

type WorkerResult = {
  success?: boolean;
  size?: number;
  engineUsed?: string;
  blobType?: string;
  error?: string;
};

type CompressionResult = {
  inputName: string;
  inputType: string;
  inputSize: number;
  outputType: string;
  outputSize: number;
  width: number;
  height: number;
  head: number[];
  bytes: number[];
  engineUsed?: string;
};

type CompressionOptions = {
  engine: "autopilot" | "browser" | "mozjpeg" | "oxipng" | "webp" | "avif";
  format: "auto" | "image/jpeg" | "image/png" | "image/webp" | "image/avif";
  quality?: number;
};

async function openTrackedApp(page: Page) {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const results: WorkerResult[] = [];

    Object.defineProperty(window, "__zbmWorkerResults", {
      value: results,
      configurable: false,
      writable: false,
    });

    class TrackingWorker extends NativeWorker {
      constructor(scriptURL: string | URL, options?: WorkerOptions) {
        super(scriptURL, options);
        this.addEventListener("message", (event: MessageEvent) => {
          const data = event.data;
          if (!data || data.type === "log") return;
          results.push({
            success: data.success,
            size: data.size,
            engineUsed: data.engineUsed,
            blobType: data.blob?.type,
            error: data.error,
          });
        });
      }
    }

    window.Worker = TrackingWorker as typeof Worker;
  });

  await page.goto("/");
}

async function makeCanvasFixture(
  page: Page,
  mimeType: "image/png" | "image/jpeg" | "image/webp",
  name: string,
  quality = 0.98,
  paddingBytes = 0,
): Promise<ImageFixture> {
  const encoded = await page.evaluate(
    async ({ requestedType, requestedQuality, width, height }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas 2D context unavailable");

      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#15122e");
      gradient.addColorStop(0.45, "#7c3aed");
      gradient.addColorStop(1, "#f97316");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      for (let row = 0; row < 12; row += 1) {
        for (let column = 0; column < 16; column += 1) {
          const red = (column * 31 + row * 17) % 255;
          const green = (column * 13 + row * 47) % 255;
          const blue = (column * 7 + row * 29) % 255;
          context.fillStyle = `rgba(${red}, ${green}, ${blue}, 0.42)`;
          context.fillRect(column * 20, row * 20, 14, 14);
        }
      }

      context.fillStyle = "rgba(255, 255, 255, 0.92)";
      context.font = "700 30px sans-serif";
      context.fillText("ZeroByteMode", 34, 112);
      context.font = "16px monospace";
      context.fillText("codec validation 2026", 47, 145);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error("Canvas encoding failed"))),
          requestedType,
          requestedQuality,
        );
      });

      if (blob.type !== requestedType) {
        throw new Error(`Browser encoded ${blob.type || "an unknown type"}, not ${requestedType}`);
      }

      return {
        mimeType: blob.type,
        bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
      };
    },
    {
      requestedType: mimeType,
      requestedQuality: quality,
      width: WIDTH,
      height: HEIGHT,
    },
  );

  const original = Buffer.from(encoded.bytes);
  const buffer = paddingBytes
    ? Buffer.concat([original, Buffer.alloc(paddingBytes, 0)])
    : original;

  return {
    name,
    mimeType: encoded.mimeType,
    buffer,
    width: WIDTH,
    height: HEIGHT,
  };
}

async function clearQueue(page: Page) {
  const clear = page.getByRole("button", { name: "Clear", exact: true });
  if (await clear.isVisible()) await clear.click();
}

async function compressFixture(
  page: Page,
  fixture: ImageFixture,
  options: CompressionOptions,
): Promise<CompressionResult> {
  await page.getByRole("combobox").nth(0).selectOption(options.format);
  await page.getByRole("combobox").nth(1).selectOption(options.engine);
  await page.getByRole("slider").fill(String(options.quality ?? 82));

  const resultCountBefore = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __zbmWorkerResults: WorkerResult[];
        }
      ).__zbmWorkerResults.length,
  );

  await page.locator('input[type="file"]').setInputFiles({
    name: fixture.name,
    mimeType: fixture.mimeType,
    buffer: fixture.buffer,
  });
  await page.getByRole("button", { name: "Compress batch" }).click();

  const preview = page.getByRole("button", { name: `Preview ${fixture.name}` });
  const queueItem = preview.locator("xpath=ancestor::li");
  await expect(queueItem.getByText("done", { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(queueItem.getByRole("button", { name: "Download", exact: true })).toBeVisible();

  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (
              window as typeof window & {
                __zbmWorkerResults: WorkerResult[];
              }
            ).__zbmWorkerResults.length,
        ),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(resultCountBefore);

  const workerResult = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __zbmWorkerResults: WorkerResult[];
        }
      ).__zbmWorkerResults.at(-1),
  );
  expect(workerResult?.success, workerResult?.error).toBe(true);

  const source = await preview.locator("img").getAttribute("src");
  if (!source) throw new Error(`No output preview URL for ${fixture.name}`);

  const output = await page.evaluate(async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const bitmap = await createImageBitmap(blob);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();

    return {
      outputType: blob.type,
      outputSize: blob.size,
      width: dimensions.width,
      height: dimensions.height,
      head: Array.from(bytes.slice(0, 64)),
      bytes: Array.from(bytes),
    };
  }, source);

  const result: CompressionResult = {
    inputName: fixture.name,
    inputType: fixture.mimeType,
    inputSize: fixture.buffer.length,
    ...output,
    engineUsed: workerResult?.engineUsed,
  };

  console.log(
    `COMPRESSION_RESULT ${JSON.stringify({
      inputName: result.inputName,
      inputType: result.inputType,
      inputSize: result.inputSize,
      outputType: result.outputType,
      outputSize: result.outputSize,
      reductionPercent: Math.round((1 - result.outputSize / result.inputSize) * 100),
      width: result.width,
      height: result.height,
      engineUsed: result.engineUsed,
      requestedEngine: options.engine,
      requestedFormat: options.format,
      quality: options.quality ?? 82,
    })}`,
  );

  return result;
}

function ascii(bytes: number[], start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

function expectValidFormat(result: CompressionResult, expectedType: string) {
  expect(result.outputType).toBe(expectedType);
  expect(result.outputSize).toBeGreaterThan(0);
  expect(result.width).toBe(WIDTH);
  expect(result.height).toBe(HEIGHT);

  if (expectedType === "image/png") {
    expect(result.head.slice(0, 8)).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  } else if (expectedType === "image/jpeg") {
    expect(result.head.slice(0, 3)).toEqual([255, 216, 255]);
  } else if (expectedType === "image/webp") {
    expect(ascii(result.head, 0, 4)).toBe("RIFF");
    expect(ascii(result.head, 8, 12)).toBe("WEBP");
  } else if (expectedType === "image/avif") {
    expect(ascii(result.head, 4, 8)).toBe("ftyp");
    expect(ascii(result.head, 8, 64)).toMatch(/avif|avis/);
  }
}

const explicitEngines: Array<{
  label: string;
  engine: CompressionOptions["engine"];
  format: CompressionOptions["format"];
  expectedType: string;
  expectedEngine: string;
}> = [
  {
    label: "MozJPEG",
    engine: "mozjpeg",
    format: "image/jpeg",
    expectedType: "image/jpeg",
    expectedEngine: "mozjpeg",
  },
  {
    label: "OxiPNG",
    engine: "oxipng",
    format: "image/png",
    expectedType: "image/png",
    expectedEngine: "oxipng",
  },
  {
    label: "libwebp",
    engine: "webp",
    format: "image/webp",
    expectedType: "image/webp",
    expectedEngine: "webp",
  },
  {
    label: "libavif",
    engine: "avif",
    format: "image/avif",
    expectedType: "image/avif",
    expectedEngine: "avif",
  },
  {
    label: "Browser native JPEG",
    engine: "browser",
    format: "image/jpeg",
    expectedType: "image/jpeg",
    expectedEngine: "browser",
  },
];

test.describe("local compression engine and format matrix", () => {
  for (const engineCase of explicitEngines) {
    test(`${engineCase.label} emits the requested decodable format`, async ({ page }) => {
      await openTrackedApp(page);
      const fixture = await makeCanvasFixture(
        page,
        "image/png",
        `${engineCase.engine}-source.png`,
        1,
        engineCase.engine === "oxipng" ? 64 * 1024 : 0,
      );

      const result = await compressFixture(page, fixture, {
        engine: engineCase.engine,
        format: engineCase.format,
        quality: 82,
      });

      expectValidFormat(result, engineCase.expectedType);
      expect(result.engineUsed).toBe(engineCase.expectedEngine);
      if (engineCase.engine === "oxipng") expect(result.outputSize).toBeLessThan(result.inputSize);
    });
  }

  test("Auto-pilot selects the correct encoder for PNG, JPEG and WebP", async ({ page }) => {
    await openTrackedApp(page);

    const cases: Array<{
      fixture: ImageFixture;
      expectedType: string;
      expectedEngine: string;
    }> = [
      {
        fixture: await makeCanvasFixture(page, "image/png", "auto-source.png", 1, 64 * 1024),
        expectedType: "image/png",
        expectedEngine: "oxipng",
      },
      {
        fixture: await makeCanvasFixture(page, "image/jpeg", "auto-source.jpg", 1, 64 * 1024),
        expectedType: "image/jpeg",
        expectedEngine: "mozjpeg",
      },
      {
        fixture: await makeCanvasFixture(page, "image/webp", "auto-source.webp", 1, 64 * 1024),
        expectedType: "image/webp",
        expectedEngine: "browser",
      },
    ];

    for (const autoCase of cases) {
      const result = await compressFixture(page, autoCase.fixture, {
        engine: "autopilot",
        format: "auto",
        quality: 82,
      });
      expectValidFormat(result, autoCase.expectedType);
      expect(result.engineUsed).toBe(autoCase.expectedEngine);
      expect(result.outputSize).toBeLessThan(result.inputSize);
      await clearQueue(page);
    }
  });

  test("AVIF can be encoded, decoded and recompressed as AVIF", async ({ page }) => {
    await openTrackedApp(page);
    const png = await makeCanvasFixture(page, "image/png", "avif-seed.png", 1);
    const first = await compressFixture(page, png, {
      engine: "avif",
      format: "image/avif",
      quality: 92,
    });
    expectValidFormat(first, "image/avif");
    expect(first.engineUsed).toBe("avif");

    await clearQueue(page);
    const avif: ImageFixture = {
      name: "round-trip.avif",
      mimeType: "image/avif",
      buffer: Buffer.from(first.bytes),
      width: WIDTH,
      height: HEIGHT,
    };
    const second = await compressFixture(page, avif, {
      engine: "avif",
      format: "image/avif",
      quality: 45,
    });
    expectValidFormat(second, "image/avif");
    expect(second.engineUsed).toBe("avif");
    expect(second.outputSize).toBeLessThan(first.outputSize);
  });

  test("lower MozJPEG quality creates a smaller valid JPEG", async ({ page }) => {
    await openTrackedApp(page);
    const source = await makeCanvasFixture(page, "image/jpeg", "quality-source.jpg", 1, 64 * 1024);

    const high = await compressFixture(page, source, {
      engine: "mozjpeg",
      format: "image/jpeg",
      quality: 92,
    });
    expectValidFormat(high, "image/jpeg");
    expect(high.engineUsed).toBe("mozjpeg");

    await clearQueue(page);
    const low = await compressFixture(page, source, {
      engine: "mozjpeg",
      format: "image/jpeg",
      quality: 35,
    });
    expectValidFormat(low, "image/jpeg");
    expect(low.engineUsed).toBe("mozjpeg");
    expect(low.outputSize).toBeLessThan(high.outputSize);
  });

  test("mixed PNG, JPEG and WebP batches complete and download with correct extensions", async ({ page }) => {
    await openTrackedApp(page);
    const fixtures = [
      await makeCanvasFixture(page, "image/png", "batch-image.png", 1, 32 * 1024),
      await makeCanvasFixture(page, "image/jpeg", "batch-photo.jpg", 1, 32 * 1024),
      await makeCanvasFixture(page, "image/webp", "batch-modern.webp", 1, 32 * 1024),
    ];

    await page.getByRole("combobox").nth(0).selectOption("auto");
    await page.getByRole("combobox").nth(1).selectOption("autopilot");
    await page.locator('input[type="file"]').setInputFiles(
      fixtures.map((fixture) => ({
        name: fixture.name,
        mimeType: fixture.mimeType,
        buffer: fixture.buffer,
      })),
    );
    await page.getByRole("button", { name: "Compress batch" }).click();

    for (const fixture of fixtures) {
      const item = page
        .getByRole("button", { name: `Preview ${fixture.name}` })
        .locator("xpath=ancestor::li");
      await expect(item.getByText("done", { exact: true })).toBeVisible({ timeout: 60_000 });
    }
    await expect(page.getByText("3 of 3 complete")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download ZIP", exact: true }).click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    if (!stream) throw new Error("ZIP download stream unavailable");
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));

    const JSZip = (await import("jszip")).default;
    const archive = await JSZip.loadAsync(Buffer.concat(chunks));
    expect(Object.keys(archive.files).sort()).toEqual(
      ["batch-image.png", "batch-modern.webp", "batch-photo.jpg"].sort(),
    );
    for (const entry of Object.values(archive.files)) {
      expect(entry.dir).toBe(false);
      expect((await entry.async("uint8array")).byteLength).toBeGreaterThan(0);
    }
  });

  test("corrupt image input fails safely without a download", async ({ page }) => {
    await openTrackedApp(page);
    const filename = "corrupt.png";
    await page.getByRole("combobox").nth(1).selectOption("oxipng");
    await page.locator('input[type="file"]').setInputFiles({
      name: filename,
      mimeType: "image/png",
      buffer: Buffer.from("not a valid image"),
    });
    await page.getByRole("button", { name: "Compress batch" }).click();

    const item = page.getByRole("button", { name: `Preview ${filename}` }).locator("xpath=ancestor::li");
    await expect(item.getByText("error", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(item.getByRole("button", { name: "Download", exact: true })).toHaveCount(0);
    await expect(item.getByText(/image|decode|bitmap|source/i)).toBeVisible();
  });
});
