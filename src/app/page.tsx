"use client";

import Image from "next/image";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CompressionEngine,
  CompressionRequest,
  FILE_ACCEPT,
  OutputFormat,
  createCompressionRequest,
  engineLabel,
  formatSizeDelta,
  normaliseImageFile,
  outputFilename,
  uniqueFilename,
} from "../lib/compression";

type FileStatus = "staged" | "pending" | "processing" | "done" | "error";
type WorkerStatus = "starting" | "ready" | "error";

interface ImageItem {
  id: string;
  file: File;
  originalUrl: string;
  outputBlob?: Blob;
  outputUrl?: string;
  outputSize?: number;
  outputType?: string;
  engineUsed?: string;
  request?: CompressionRequest;
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
  { value: "auto", label: "Auto", hint: "Preserve the source format" },
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

const FIXED_ENGINE_FORMAT: Partial<Record<CompressionEngine, OutputFormat>> = {
  mozjpeg: "image/jpeg",
  oxipng: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
};

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M12 3.25 19 6v5.2c0 4.15-2.62 7.95-7 9.55-4.38-1.6-7-5.4-7-9.55V6l7-2.75Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M14 4l-4 16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Home() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [quality, setQuality] = useState(82);
  const [format, setFormat] = useState<OutputFormat>("auto");
  const [engine, setEngine] = useState<CompressionEngine>("autopilot");
  const [processing, setProcessing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>("starting");
  const [workerGeneration, setWorkerGeneration] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const itemsRef = useRef<ImageItem[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    let active = true;
    let worker: Worker | null = null;
    setWorkerStatus("starting");

    try {
      worker = new Worker(new URL("./compressor.worker.ts", import.meta.url));
      workerRef.current = worker;
      setWorkerStatus("ready");

      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        if (!active) return;
        const data = event.data;
        if (data.type === "log") return;

        const currentItem = itemsRef.current.find((item) => item.id === data.id);
        if (!currentItem) return;

        if (!data.success || !data.blob || typeof data.size !== "number") {
          setItems((current) =>
            current.map((item) =>
              item.id === data.id
                ? {
                    ...item,
                    status: "error",
                    error: data.error || "Compression failed",
                  }
                : item,
            ),
          );
          return;
        }

        if (currentItem.outputUrl) URL.revokeObjectURL(currentItem.outputUrl);
        const outputUrl = URL.createObjectURL(data.blob);

        setItems((current) =>
          current.map((item) =>
            item.id === data.id
              ? {
                  ...item,
                  outputBlob: data.blob,
                  outputUrl,
                  outputSize: data.size,
                  outputType: data.blob?.type || item.file.type || "image/webp",
                  engineUsed: data.engineUsed,
                  status: "done",
                  error: undefined,
                }
              : item,
          ),
        );
      };

      worker.onerror = () => {
        if (!active) return;
        setWorkerStatus("error");
        setNotice("The local compression worker stopped. Retry it without reloading the page.");
        setItems((current) =>
          current.map((item) =>
            item.status === "processing" || item.status === "pending"
              ? {
                  ...item,
                  status: "error",
                  error: "Compression worker stopped unexpectedly",
                }
              : item,
          ),
        );
        setProcessing(false);
        workerRef.current = null;
        worker?.terminate();
      };
    } catch {
      setWorkerStatus("error");
      setNotice("This browser could not start the local compression worker.");
    }

    return () => {
      active = false;
      worker?.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
  }, [workerGeneration]);

  useEffect(
    () => () => {
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.originalUrl);
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
      }
    },
    [],
  );

  useEffect(() => {
    const next = items.find((item) => item.status === "pending");
    if (!next || processing || workerStatus !== "ready" || !workerRef.current) return;

    if (!next.request) {
      setItems((current) =>
        current.map((item) =>
          item.id === next.id
            ? { ...item, status: "error", error: "Compression settings were not captured" }
            : item,
        ),
      );
      return;
    }

    setProcessing(true);
    setItems((current) =>
      current.map((item) =>
        item.id === next.id ? { ...item, status: "processing", error: undefined } : item,
      ),
    );

    try {
      workerRef.current.postMessage({
        file: next.file,
        ...next.request,
        id: next.id,
      });
    } catch {
      setItems((current) =>
        current.map((item) =>
          item.id === next.id
            ? { ...item, status: "error", error: "Could not send this file to the local worker" }
            : item,
        ),
      );
      setProcessing(false);
    }
  }, [items, processing, workerStatus]);

  useEffect(() => {
    if (processing && !items.some((item) => item.status === "processing")) {
      setProcessing(false);
    }
  }, [items, processing]);

  useEffect(() => {
    if (!selectedId) return;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [selectedId]);

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const completed = items.filter(
    (item): item is ImageItem & {
      outputBlob: Blob;
      outputUrl: string;
      outputType: string;
      outputSize: number;
    } =>
      item.status === "done" &&
      Boolean(item.outputBlob && item.outputUrl && item.outputType) &&
      typeof item.outputSize === "number",
  );
  const completedOriginal = completed.reduce((sum, item) => sum + item.file.size, 0);
  const totalOutput = completed.reduce((sum, item) => sum + item.outputSize, 0);
  const hasCompressible = items.some(
    (item) => item.status === "staged" || item.status === "error",
  );

  const summary = [
    { label: "Queued", value: String(items.length) },
    { label: "Ready", value: String(completed.length) },
    {
      label: "Processed input",
      value: completed.length ? formatBytes(completedOriginal) : "—",
    },
    { label: "Output", value: completed.length ? formatBytes(totalOutput) : "—" },
  ];

  const addFiles = (files: File[]) => {
    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const file of files) {
      const normalised = normaliseImageFile(file);
      if (normalised) accepted.push(normalised);
      else rejected.push(file.name || "unnamed file");
    }

    if (rejected.length) {
      const preview = rejected.slice(0, 2).join(", ");
      const remainder = rejected.length > 2 ? ` and ${rejected.length - 2} more` : "";
      setNotice(`Skipped unsupported file${rejected.length === 1 ? "" : "s"}: ${preview}${remainder}. Use JPEG, PNG, WebP or AVIF.`);
    } else {
      setNotice(null);
    }

    if (!accepted.length) return;

    const nextItems = accepted.map<ImageItem>((file) => ({
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
    if (workerStatus !== "ready") {
      setNotice("The local worker is not ready. Retry it, then start the batch again.");
      return;
    }

    setNotice(null);
    setItems((current) =>
      current.map((item) =>
        item.status === "staged" || item.status === "error"
          ? {
              ...item,
              request: createCompressionRequest(item.file.type, quality, format, engine),
              status: "pending",
              error: undefined,
            }
          : item,
      ),
    );
    navigator.vibrate?.(12);
  };

  const cancelCompression = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setWorkerStatus("starting");
    setProcessing(false);
    setItems((current) =>
      current.map((item) =>
        item.status === "pending" || item.status === "processing"
          ? { ...item, status: "staged", request: undefined, error: undefined }
          : item,
      ),
    );
    setNotice("Batch cancelled. Your files remain in the local queue.");
    setWorkerGeneration((current) => current + 1);
  };

  const retryWorker = () => {
    setNotice(null);
    setWorkerGeneration((current) => current + 1);
  };

  const removeItem = (id: string) => {
    const target = itemsRef.current.find((item) => item.id === id);
    if (!target || target.status === "processing") return;
    URL.revokeObjectURL(target.originalUrl);
    if (target.outputUrl) URL.revokeObjectURL(target.outputUrl);
    setItems((current) => current.filter((item) => item.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const clearAll = () => {
    if (processing || items.some((item) => item.status === "pending")) {
      workerRef.current?.terminate();
      workerRef.current = null;
      setProcessing(false);
      setWorkerGeneration((current) => current + 1);
    }

    for (const item of itemsRef.current) {
      URL.revokeObjectURL(item.originalUrl);
      if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
    }
    setItems([]);
    setSelectedId(null);
    setNotice(null);
  };

  const triggerDownload = (href: string, filename: string) => {
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadItem = (item: ImageItem) => {
    if (!item.outputUrl || !item.outputType) return;
    triggerDownload(
      item.outputUrl,
      outputFilename(item.file.name, item.outputType, item.engineUsed),
    );
  };

  const downloadAll = async () => {
    if (!completed.length) return;

    const JSZip = (await import("jszip")).default;
    const archive = new JSZip();
    const usedNames = new Set<string>();

    for (const item of completed) {
      const filename = uniqueFilename(
        outputFilename(item.file.name, item.outputType, item.engineUsed),
        usedNames,
      );
      archive.file(filename, item.outputBlob);
    }

    const blob = await archive.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, "zerobytemode-images.zip");
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  const onFormatChange = (nextFormat: OutputFormat) => {
    setFormat(nextFormat);
    const fixedFormat = FIXED_ENGINE_FORMAT[engine];
    if (fixedFormat && fixedFormat !== nextFormat) setEngine("autopilot");
  };

  const onEngineChange = (nextEngine: CompressionEngine) => {
    setEngine(nextEngine);
    const fixedFormat = FIXED_ENGINE_FORMAT[nextEngine];
    if (fixedFormat) setFormat(fixedFormat);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f7f4] text-slate-950">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-22rem] h-[44rem] w-[44rem] -translate-x-1/2 rounded-full bg-violet-200/55 blur-3xl" />
        <div className="absolute right-[-24rem] top-72 h-[42rem] w-[42rem] rounded-full bg-cyan-100/70 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-10">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-900/10">
          <a
            href="#compressor"
            className="group flex min-w-0 items-center gap-3"
            aria-label="ZeroByteMode compressor"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-[11px] font-black tracking-[-0.08em] text-white shadow-sm transition group-hover:-translate-y-0.5">
              ZB
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-black tracking-[-0.025em]">
                ZeroByteMode
              </span>
              <span className="block truncate text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Open source · local only
              </span>
            </span>
          </a>

          <a
            href="https://github.com/wilfgrainger/zerobytemode"
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-900/10 bg-white/75 px-3.5 py-2.5 text-xs font-black shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-slate-900/25 hover:bg-white"
          >
            <CodeIcon />
            <span>View source</span>
          </a>
        </header>

        <section className="grid gap-12 pb-10 pt-14 sm:pt-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-16 lg:pb-16 lg:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-700/15 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 shadow-sm">
              <ShieldIcon />
              Images never leave your device
            </p>

            <h1 className="mt-7 max-w-4xl text-[3.45rem] font-black leading-[0.91] tracking-[-0.065em] sm:text-7xl lg:text-[5.25rem]">
              Serious image compression.
              <span className="mt-2 block text-violet-700">Private by design.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">
              Batch-compress JPEG, PNG, WebP and AVIF in your browser with open codecs,
              honest results and full controls.
            </p>

            <p className="mt-5 text-xl font-black tracking-[-0.025em] text-slate-950 sm:text-2xl">
              No account. No paywall.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#compressor"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-violet-700"
              >
                Compress images
              </a>
              <a
                href="#how-it-works"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-900/15 bg-white/65 px-6 py-3 text-sm font-black backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
              >
                See how it works
              </a>
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-500">
              Nothing to install. Your queue disappears when this tab closes.
            </p>
          </div>

          <div className="relative lg:pl-4">
            <div className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-gradient-to-br from-violet-300/45 via-transparent to-cyan-200/55 blur-2xl" />
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 text-white shadow-2xl shadow-slate-950/20">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Local session
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  No image upload path
                </span>
              </div>

              <div className="p-5 sm:p-7">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
                  The whole journey
                </p>
                <div className="mt-5 grid gap-3">
                  {[
                    ["01", "Choose", "Read from your device"],
                    ["02", "Compress", "Process inside a Web Worker"],
                    ["03", "Download", "Save the result or a ZIP"],
                  ].map(([number, title, detail]) => (
                    <div
                      key={number}
                      className="grid grid-cols-[2.5rem_1fr] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3.5"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 font-mono text-[11px] font-bold text-violet-200">
                        {number}
                      </span>
                      <span>
                        <span className="block text-sm font-black">{title}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-slate-400">
                          {detail}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {["MozJPEG", "OxiPNG", "libwebp", "libavif"].map((codec) => (
                    <span
                      key={codec}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] text-slate-300"
                    >
                      {codec}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-900/10 bg-white/70 shadow-sm backdrop-blur sm:grid-cols-4">
          {[
            ["Uploads", "None"],
            ["Accounts", "None"],
            ["Paid tier", "None"],
            ["Licence", "Open source"],
          ].map(([term, detail], index) => (
            <div
              key={term}
              className={`p-4 sm:p-5 ${index % 2 === 0 ? "border-r border-slate-900/10" : ""} ${index < 2 ? "border-b border-slate-900/10 sm:border-b-0" : ""} ${index > 0 ? "sm:border-l sm:border-slate-900/10" : ""}`}
            >
              <dt className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                {term}
              </dt>
              <dd className="mt-1.5 text-lg font-black tracking-[-0.025em]">{detail}</dd>
            </div>
          ))}
        </dl>

        <section
          id="compressor"
          className="mt-16 scroll-mt-6 overflow-hidden rounded-[2rem] border border-slate-900/10 bg-white shadow-2xl shadow-slate-950/10 sm:mt-24"
        >
          <div className="flex flex-col gap-3 bg-slate-950 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
                Local compressor
              </p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.025em]">
                Turn large images into useful files
              </h2>
            </div>
            <span className="w-fit rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white">
              All unlocked
            </span>
          </div>

          <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
            <aside className="border-b border-slate-900/10 bg-[#fafaf8] p-5 sm:p-8 lg:border-b-0 lg:border-r">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">
                  Output
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.035em]">
                  Compression settings
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Choose the balance you need, or leave Auto-pilot to decide.
                </p>
              </div>

              <label className="mt-8 block rounded-2xl border border-slate-900/10 bg-white p-4">
                <span className="flex items-center justify-between text-sm font-black">
                  Quality
                  <output className="rounded-lg bg-violet-50 px-2 py-1 font-mono text-xs text-violet-700">
                    {quality}%
                  </output>
                </span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={quality}
                  disabled={processing}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  className="mt-4 w-full accent-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                  Lower values create smaller files. PNG optimisation stays lossless.
                </span>
              </label>

              <label className="mt-4 block text-sm font-black">
                Format
                <select
                  value={format}
                  disabled={processing}
                  onChange={(event) => onFormatChange(event.target.value as OutputFormat)}
                  className="mt-2 w-full rounded-xl border border-slate-900/10 bg-white px-4 py-3.5 text-sm font-semibold outline-none ring-violet-500 transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {FORMAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} — {option.hint}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block text-sm font-black">
                Engine
                <select
                  value={engine}
                  disabled={processing}
                  onChange={(event) => onEngineChange(event.target.value as CompressionEngine)}
                  className="mt-2 w-full rounded-xl border border-slate-900/10 bg-white px-4 py-3.5 text-sm font-semibold outline-none ring-violet-500 transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ENGINE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Settings are captured when a batch starts, so every file in that batch is consistent.
              </p>

              <div className="mt-6 flex gap-3 rounded-2xl border border-emerald-700/15 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
                <span className="mt-1 text-emerald-700">
                  <ShieldIcon />
                </span>
                <p>
                  Processing happens on this device. There is no image-upload endpoint, login
                  system or analytics tracker.
                </p>
              </div>
            </aside>

            <div className="bg-white p-5 sm:p-8">
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  if (event.currentTarget === event.target) setDragging(false);
                }}
                onDrop={onDrop}
                className={`group flex min-h-72 flex-col items-center justify-center rounded-[1.5rem] border px-6 py-10 text-center transition ${
                  dragging
                    ? "border-violet-500 bg-violet-50"
                    : "border-dashed border-slate-300 bg-[#fafaf8] hover:border-violet-400 hover:bg-violet-50/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={FILE_ACCEPT}
                  multiple
                  onChange={onFileInput}
                  className="sr-only"
                />
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-950 text-2xl font-light text-white shadow-lg transition group-hover:-translate-y-1 group-hover:bg-violet-700">
                  +
                </span>
                <h2 className="mt-5 text-2xl font-black tracking-[-0.035em]">Drop images here</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  One image or a full batch. Files stay in this tab and are processed one at a time.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-6 min-h-12 rounded-xl bg-violet-700 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-700/20 transition hover:-translate-y-0.5 hover:bg-violet-800"
                >
                  Choose images
                </button>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  JPEG · PNG · WebP · AVIF
                </p>
              </div>

              {notice && (
                <div
                  className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-amber-700/15 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
                  role="status"
                  aria-live="polite"
                >
                  <p>{notice}</p>
                  {workerStatus === "error" && (
                    <button
                      type="button"
                      onClick={retryWorker}
                      className="shrink-0 rounded-lg bg-amber-950 px-3 py-2 text-xs font-black text-white"
                    >
                      Retry worker
                    </button>
                  )}
                </div>
              )}

              {items.length > 0 && (
                <div className="mt-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-black tracking-[-0.025em]">Batch queue</h3>
                      <p className="text-xs text-slate-500" aria-live="polite">
                        {completed.length} of {items.length} ready
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={clearAll}
                        className="rounded-xl border border-slate-900/10 bg-white px-4 py-2.5 text-xs font-black transition hover:border-slate-900/30"
                      >
                        Clear
                      </button>
                      {completed.length > 1 && (
                        <button
                          type="button"
                          onClick={downloadAll}
                          className="rounded-xl border border-slate-950 bg-white px-4 py-2.5 text-xs font-black transition hover:bg-slate-50"
                        >
                          Download ZIP
                        </button>
                      )}
                      {processing ? (
                        <button
                          type="button"
                          onClick={cancelCompression}
                          className="rounded-xl bg-red-700 px-5 py-2.5 text-xs font-black text-white transition hover:bg-red-800"
                        >
                          Cancel batch
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startCompression}
                          disabled={!hasCompressible || workerStatus !== "ready"}
                          className="rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Compress batch
                        </button>
                      )}
                    </div>
                  </div>

                  <ul className="mt-4 space-y-3">
                    {items.map((item) => {
                      const delta = typeof item.outputSize === "number"
                        ? formatSizeDelta(item.file.size, item.outputSize)
                        : null;
                      const encoder = engineLabel(item.engineUsed);

                      return (
                        <li
                          key={item.id}
                          className="grid gap-4 rounded-2xl border border-slate-900/10 bg-white p-3 sm:grid-cols-[56px_1fr_auto] sm:items-center"
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
                            <p className="truncate text-sm font-black">{item.file.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatBytes(item.file.size)}
                              {typeof item.outputSize === "number"
                                ? ` → ${formatBytes(item.outputSize)}`
                                : ""}
                              {delta ? ` · ${delta}` : ""}
                            </p>
                            {encoder && (
                              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-violet-700">
                                {encoder}
                              </p>
                            )}
                            {item.error && (
                              <p className="mt-1 text-xs font-bold text-red-700">{item.error}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
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
                                className="rounded-lg bg-slate-950 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-white"
                              >
                                Download
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              disabled={item.status === "processing"}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
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

          <dl className="grid grid-cols-2 border-t border-slate-900/10 bg-[#fafaf8] sm:grid-cols-4">
            {summary.map((item, index) => (
              <div
                key={item.label}
                className={`p-5 ${index % 2 === 0 ? "border-r border-slate-900/10" : ""} ${index < 2 ? "border-b border-slate-900/10 sm:border-b-0" : ""} ${index > 0 ? "sm:border-l sm:border-slate-900/10" : ""}`}
              >
                <dt className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {item.label}
                </dt>
                <dd className="mt-1.5 text-xl font-black tracking-[-0.025em]">{item.value}</dd>
              </div>
            ))}
          </dl>

          {completed.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-emerald-700/15 bg-emerald-50 px-6 py-5 text-sm text-emerald-950 sm:flex-row sm:items-center sm:justify-between">
              <p>
                <strong>
                  {completed.length} file{completed.length === 1 ? "" : "s"}
                </strong>{" "}
                ready locally · {formatSizeDelta(completedOriginal, totalOutput)} overall.
              </p>
              <button
                type="button"
                onClick={downloadAll}
                className="text-left font-black underline underline-offset-4"
              >
                Download completed files as ZIP
              </button>
            </div>
          )}
        </section>

        <section id="how-it-works" className="scroll-mt-8 py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">
              Why it is different
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
              A useful tool, not a funnel.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              The product is the compressor. There is no registration journey, artificial quota
              or hidden edition behind it.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              [
                "Open codecs",
                "MozJPEG, OxiPNG, libwebp and libavif run through WebAssembly in your browser.",
              ],
              [
                "Honest batch results",
                "Each file reports its real encoder and size change. Duplicate ZIP names are kept safely.",
              ],
              [
                "Auditable privacy",
                "No account database, analytics script or image-upload service is present in the application.",
              ],
            ].map(([title, description], index) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-900/10 bg-white/70 p-6 shadow-sm backdrop-blur"
              >
                <span className="font-mono text-[10px] font-bold text-violet-700">0{index + 1}</span>
                <h3 className="mt-6 text-lg font-black tracking-[-0.025em]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-5 border-t border-slate-900/10 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>ZeroByteMode processes images locally. Source available under the repository licence.</p>
          <div className="flex gap-5">
            <a
              href="https://github.com/wilfgrainger/zerobytemode"
              target="_blank"
              rel="noreferrer"
              className="font-black text-slate-700 hover:text-violet-700"
            >
              GitHub
            </a>
            <a
              href="https://github.com/wilfgrainger/zerobytemode/blob/main/PRIVACY.md"
              target="_blank"
              rel="noreferrer"
              className="font-black text-slate-700 hover:text-violet-700"
            >
              Privacy
            </a>
          </div>
        </footer>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-title"
          aria-describedby="preview-description"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelectedId(null);
          }}
        >
          <div
            ref={dialogRef}
            className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-900/10 px-5 py-4">
              <div className="min-w-0 pr-4">
                <p id="preview-title" className="truncate text-sm font-black">
                  {selected.file.name}
                </p>
                <p id="preview-description" className="text-xs text-slate-500">
                  Original {formatBytes(selected.file.size)}
                  {typeof selected.outputSize === "number"
                    ? ` · Output ${formatBytes(selected.outputSize)} · ${formatSizeDelta(selected.file.size, selected.outputSize)}`
                    : ""}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black"
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
                <figcaption className="absolute left-4 top-4 rounded-full bg-slate-950/85 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white">
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
                <figcaption className="absolute left-4 top-4 rounded-full bg-violet-700/90 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white">
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
