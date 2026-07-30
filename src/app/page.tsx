"use client";

import Image from "next/image";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type OutputFormat =
  | "auto"
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/avif";

type CompressionEngine =
  | "autopilot"
  | "browser"
  | "mozjpeg"
  | "oxipng"
  | "webp"
  | "avif";

type FileStatus = "staged" | "pending" | "processing" | "done" | "error";

interface ImageItem {
  id: string;
  file: File;
  originalUrl: string;
  outputUrl?: string;
  outputSize?: number;
  outputType?: string;
  engineUsed?: string;
  status: FileStatus;
  error?: string;
}

interface WorkerMessage {
  type?: "log";
  id: string;
  message?: string;
  success?: boolean;
  blob?: Blob;
  size?: number;
  error?: string;
  engineUsed?: string;
}

const FORMAT_OPTIONS: Array<{ value: OutputFormat; label: string; hint: string }> = [
  { value: "auto", label: "Auto", hint: "Best engine for each source" },
  { value: "image/jpeg", label: "JPEG", hint: "Compatible photographic output" },
  { value: "image/webp", label: "WebP", hint: "Small, widely supported output" },
  { value: "image/avif", label: "AVIF", hint: "Smallest modern output" },
  { value: "image/png", label: "PNG", hint: "Lossless output" },
];

const ENGINE_OPTIONS: Array<{ value: CompressionEngine; label: string }> = [
  { value: "autopilot", label: "Auto-pilot" },
  { value: "mozjpeg", label: "MozJPEG" },
  { value: "oxipng", label: "OxiPNG" },
  { value: "webp", label: "libwebp" },
  { value: "avif", label: "libavif" },
  { value: "browser", label: "Browser native" },
];

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
};

const outputExtension = (mimeType: string) => {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/avif") return "avif";
  return "webp";
};

const baseName = (filename: string) => filename.replace(/\.[^.]+$/, "");

const resolveOutputType = (
  file: File,
  selectedFormat: OutputFormat,
  selectedEngine: CompressionEngine,
) => {
  if (selectedEngine === "mozjpeg") return "image/jpeg";
  if (selectedEngine === "oxipng") return "image/png";
  if (selectedEngine === "webp") return "image/webp";
  if (selectedEngine === "avif") return "image/avif";
  if (selectedFormat !== "auto") return selectedFormat;
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/jpeg" || file.type === "image/jpg") return "image/jpeg";
  return "image/webp";
};

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function Home() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [quality, setQuality] = useState(82);
  const [format, setFormat] = useState<OutputFormat>("auto");
  const [engine, setEngine] = useState<CompressionEngine>("autopilot");
  const [processing, setProcessing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const itemsRef = useRef<ImageItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const worker = new Worker(new URL("./compressor.worker.ts", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const data = event.data;
      if (data.type === "log") return;

      setItems((current) =>
        current.map((item) => {
          if (item.id !== data.id) return item;

          if (!data.success || !data.blob || typeof data.size !== "number") {
            return {
              ...item,
              status: "error",
              error: data.error || "Compression failed",
            };
          }

          if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
          const outputUrl = URL.createObjectURL(data.blob);

          return {
            ...item,
            outputUrl,
            outputSize: data.size,
            outputType: data.blob.type || item.file.type || "image/webp",
            engineUsed: data.engineUsed,
            status: "done",
            error: undefined,
          };
        }),
      );
    };

    worker.onerror = () => {
      setItems((current) =>
        current.map((item) =>
          item.status === "processing"
            ? { ...item, status: "error", error: "Compression worker stopped unexpectedly" }
            : item,
        ),
      );
    };

    return () => {
      worker.terminate();
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.originalUrl);
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
      }
    };
  }, []);

  useEffect(() => {
    const next = items.find((item) => item.status === "pending");
    if (!next || processing || !workerRef.current) return;

    setProcessing(true);
    setItems((current) =>
      current.map((item) =>
        item.id === next.id ? { ...item, status: "processing", error: undefined } : item,
      ),
    );

    const outputType = resolveOutputType(next.file, format, engine);
    workerRef.current.postMessage({
      file: next.file,
      quality: quality / 100,
      type: outputType,
      engine: engine === "autopilot" ? "browser" : engine,
      autoPilot: engine === "autopilot",
      id: next.id,
    });
  }, [engine, format, items, processing, quality]);

  useEffect(() => {
    if (processing && !items.some((item) => item.status === "processing")) {
      setProcessing(false);
    }
  }, [items, processing]);

  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const completed = items.filter((item) => item.status === "done" && item.outputUrl);
  const totalOriginal = items.reduce((sum, item) => sum + item.file.size, 0);
  const totalOutput = completed.reduce((sum, item) => sum + (item.outputSize ?? 0), 0);
  const completedOriginal = completed.reduce((sum, item) => sum + item.file.size, 0);
  const totalSaving =
    completed.length > 0 && completedOriginal > 0
      ? Math.round((1 - totalOutput / completedOriginal) * 100)
      : 0;

  const summary = [
    { label: "Queued", value: String(items.length) },
    { label: "Completed", value: String(completed.length) },
    { label: "Before", value: formatBytes(totalOriginal) },
    { label: "After", value: completed.length ? formatBytes(totalOutput) : "—" },
  ];

  const addFiles = (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (!images.length) return;

    const nextItems = images.map<ImageItem>((file) => ({
      id: makeId(),
      file,
      originalUrl: URL.createObjectURL(file),
      status: "staged",
    }));

    setItems((current) => [...current, ...nextItems]);
    navigator.vibrate?.(8);
  };

  const onFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(Array.from(event.target.files));
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const startCompression = () => {
    setItems((current) =>
      current.map((item) =>
        item.status === "staged" || item.status === "error"
          ? { ...item, status: "pending", error: undefined }
          : item,
      ),
    );
    navigator.vibrate?.(12);
  };

  const removeItem = (id: string) => {
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.originalUrl);
        if (target.outputUrl) URL.revokeObjectURL(target.outputUrl);
      }
      return current.filter((item) => item.id !== id);
    });
    if (selectedId === id) setSelectedId(null);
  };

  const clearAll = () => {
    for (const item of items) {
      URL.revokeObjectURL(item.originalUrl);
      if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
    }
    setItems([]);
    setSelectedId(null);
  };

  const downloadItem = (item: ImageItem) => {
    if (!item.outputUrl || !item.outputType) return;
    const link = document.createElement("a");
    link.href = item.outputUrl;
    link.download = `${baseName(item.file.name)}.${outputExtension(item.outputType)}`;
    link.click();
  };

  const downloadAll = async () => {
    const ready = items.filter(
      (item): item is ImageItem & { outputUrl: string; outputType: string } =>
        Boolean(item.outputUrl && item.outputType && item.status === "done"),
    );
    if (!ready.length) return;

    const JSZip = (await import("jszip")).default;
    const archive = new JSZip();

    for (const item of ready) {
      const blob = await fetch(item.outputUrl).then((response) => response.blob());
      archive.file(
        `${baseName(item.file.name)}.${outputExtension(item.outputType)}`,
        blob,
      );
    }

    const blob = await archive.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "zerobytemode-images.zip";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-950">
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute -left-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-fuchsia-300/35 blur-3xl" />
        <div className="absolute -right-48 top-20 h-[38rem] w-[38rem] rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="absolute bottom-[-18rem] left-1/4 h-[36rem] w-[36rem] rounded-full bg-violet-300/25 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-5">
          <a href="#compressor" className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-white/70 shadow-sm backdrop-blur">
              <Image src="/logo.svg" alt="" width={34} height={34} priority />
            </span>
            <span>
              <span className="block text-base font-black tracking-tight">ZeroByteMode</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Open source · local only
              </span>
            </span>
          </a>

          <a
            href="https://github.com/wilfgrainger/zerobytemode"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-700"
          >
            View source
          </a>
        </header>

        <section className="grid gap-10 pb-12 pt-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-end lg:pt-24">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Images never leave your device
            </p>
            <h1 className="max-w-4xl text-balance text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Serious image compression.
              <span className="block bg-gradient-to-r from-violet-700 via-fuchsia-600 to-orange-500 bg-clip-text text-transparent">
                No account. No paywall.
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
              Batch-compress JPEG, PNG, WebP and AVIF with open WASM codecs in your
              browser. All controls, engines and ZIP downloads are available to everyone.
            </p>
          </div>

          <dl className="grid grid-cols-2 overflow-hidden rounded-3xl border border-white/80 bg-white/60 shadow-xl shadow-slate-900/5 backdrop-blur-xl">
            {[
              ["Uploads", "None"],
              ["Accounts", "None"],
              ["Paid tier", "None"],
              ["Licence", "Open source"],
            ].map(([term, detail]) => (
              <div key={term} className="border-b border-r border-slate-200/70 p-5 last:border-b-0">
                <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {term}
                </dt>
                <dd className="mt-2 text-xl font-black tracking-tight">{detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          id="compressor"
          className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl"
        >
          <div className="grid gap-px bg-slate-200/70 lg:grid-cols-[0.72fr_1.28fr]">
            <aside className="bg-white/80 p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                    Output
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">Compression settings</h2>
                </div>
                <span className="rounded-full bg-violet-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700">
                  All unlocked
                </span>
              </div>

              <label className="mt-8 block">
                <span className="flex items-center justify-between text-sm font-bold">
                  Quality
                  <output className="font-mono text-violet-700">{quality}%</output>
                </span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={quality}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  className="mt-4 w-full accent-violet-700"
                />
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                  Lower values create smaller files. PNG optimisation remains lossless.
                </span>
              </label>

              <label className="mt-7 block text-sm font-bold">
                Format
                <select
                  value={format}
                  onChange={(event) => setFormat(event.target.value as OutputFormat)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-violet-500 transition focus:ring-2"
                >
                  {FORMAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} — {option.hint}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-5 block text-sm font-bold">
                Engine
                <select
                  value={engine}
                  onChange={(event) => setEngine(event.target.value as CompressionEngine)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-violet-500 transition focus:ring-2"
                >
                  {ENGINE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                Processing happens in a Web Worker on this device. The app has no
                image-upload endpoint, login system or analytics tracker.
              </div>
            </aside>

            <div className="bg-slate-50/70 p-5 sm:p-8">
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDragging(false);
                }}
                onDrop={onDrop}
                className={`flex min-h-64 flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed px-6 py-10 text-center transition ${
                  dragging
                    ? "border-violet-600 bg-violet-100/70"
                    : "border-slate-300 bg-white/70 hover:border-violet-400 hover:bg-white"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onFileInput}
                  className="sr-only"
                />
                <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-3xl text-white shadow-lg">
                  +
                </span>
                <h2 className="mt-5 text-2xl font-black tracking-tight">
                  Drop images here
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Add a single image or a full batch. Your browser memory is the only
                  practical queue limit.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-6 rounded-full bg-violet-700 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-700/20 transition hover:bg-violet-800"
                >
                  Choose images
                </button>
              </div>

              {items.length > 0 && (
                <div className="mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black tracking-tight">Batch queue</h3>
                      <p className="text-xs text-slate-500" aria-live="polite">
                        {completed.length} of {items.length} complete
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={clearAll}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold transition hover:border-slate-400"
                      >
                        Clear
                      </button>
                      {completed.length > 1 && (
                        <button
                          type="button"
                          onClick={downloadAll}
                          className="rounded-full border border-slate-950 bg-white px-4 py-2 text-xs font-bold transition hover:bg-slate-100"
                        >
                          Download ZIP
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={startCompression}
                        disabled={
                          processing ||
                          !items.some(
                            (item) => item.status === "staged" || item.status === "error",
                          )
                        }
                        className="rounded-full bg-slate-950 px-5 py-2 text-xs font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {processing ? "Compressing…" : "Compress batch"}
                      </button>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-3">
                    {items.map((item) => {
                      const saving =
                        item.outputSize && item.file.size
                          ? Math.round((1 - item.outputSize / item.file.size) * 100)
                          : null;

                      return (
                        <li
                          key={item.id}
                          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[56px_1fr_auto] sm:items-center"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedId(item.id)}
                            className="relative h-14 w-14 overflow-hidden rounded-xl bg-slate-100"
                            aria-label={`Preview ${item.file.name}`}
                          >
                            <Image
                              src={item.outputUrl || item.originalUrl}
                              alt=""
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          </button>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{item.file.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatBytes(item.file.size)}
                              {item.outputSize ? ` → ${formatBytes(item.outputSize)}` : ""}
                              {saving !== null ? ` · ${saving}% smaller` : ""}
                            </p>
                            {item.error && (
                              <p className="mt-1 text-xs font-semibold text-red-700">{item.error}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                                item.status === "done"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : item.status === "error"
                                    ? "bg-red-100 text-red-800"
                                    : item.status === "processing"
                                      ? "bg-violet-100 text-violet-800"
                                      : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {item.status}
                            </span>
                            {item.status === "done" && (
                              <button
                                type="button"
                                onClick={() => downloadItem(item)}
                                className="rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white"
                              >
                                Download
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-red-700"
                              aria-label={`Remove ${item.file.name}`}
                            >
                              ×
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 border-t border-slate-200 bg-slate-950 text-white sm:grid-cols-4">
            {summary.map((item) => (
              <div key={item.label} className="border-r border-white/10 p-5">
                <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {item.label}
                </dt>
                <dd className="mt-2 text-xl font-black">{item.value}</dd>
              </div>
            ))}
          </dl>

          {completed.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-emerald-50 px-6 py-5 text-sm text-emerald-950 sm:flex-row sm:items-center sm:justify-between">
              <p>
                <strong>{completed.length} file{completed.length === 1 ? "" : "s"}</strong>{" "}
                ready locally
                {Number.isFinite(totalSaving) ? ` · ${totalSaving}% total reduction` : ""}.
              </p>
              <button type="button" onClick={downloadAll} className="font-black underline underline-offset-4">
                Download completed files as ZIP
              </button>
            </div>
          )}
        </section>

        <section className="grid gap-5 py-14 md:grid-cols-3">
          {[
            [
              "Open codecs",
              "MozJPEG, OxiPNG, libwebp and libavif run through WebAssembly in your browser.",
            ],
            [
              "No artificial limits",
              "Batch processing, codec controls, quality settings and ZIP export are part of the one open edition.",
            ],
            [
              "Auditable privacy",
              "There is no account database, payment provider, analytics script or image-upload service to trust.",
            ],
          ].map(([title, description]) => (
            <article
              key={title}
              className="rounded-3xl border border-white/80 bg-white/60 p-6 shadow-lg shadow-slate-900/5 backdrop-blur"
            >
              <h2 className="text-lg font-black tracking-tight">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </section>

        <footer className="flex flex-col gap-4 border-t border-slate-200 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>ZeroByteMode processes images locally. Source available under the repository licence.</p>
          <div className="flex gap-5">
            <a
              href="https://github.com/wilfgrainger/zerobytemode"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-slate-700 hover:text-violet-700"
            >
              GitHub
            </a>
            <a
              href="https://github.com/wilfgrainger/zerobytemode/blob/main/PRIVACY.md"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-slate-700 hover:text-violet-700"
            >
              Privacy
            </a>
          </div>
        </footer>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${selected.file.name}`}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelectedId(null);
          }}
        >
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-sm font-black">{selected.file.name}</p>
                <p className="text-xs text-slate-500">
                  Original {formatBytes(selected.file.size)}
                  {selected.outputSize ? ` · Output ${formatBytes(selected.outputSize)}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black"
              >
                Close
              </button>
            </div>
            <div className="grid min-h-[60vh] gap-px bg-slate-200 md:grid-cols-2">
              <figure className="relative bg-slate-100">
                <Image
                  src={selected.originalUrl}
                  alt={`Original ${selected.file.name}`}
                  fill
                  unoptimized
                  className="object-contain p-4"
                />
                <figcaption className="absolute left-4 top-4 rounded-full bg-slate-950/85 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                  Original
                </figcaption>
              </figure>
              <figure className="relative bg-slate-100">
                <Image
                  src={selected.outputUrl || selected.originalUrl}
                  alt={`Compressed ${selected.file.name}`}
                  fill
                  unoptimized
                  className="object-contain p-4"
                />
                <figcaption className="absolute left-4 top-4 rounded-full bg-violet-700/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                  {selected.outputUrl ? "Compressed" : "Awaiting compression"}
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
