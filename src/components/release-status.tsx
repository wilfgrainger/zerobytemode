import { releaseInfo } from "../lib/release";

const formatBuiltAt = (value: string | null) => {
  if (!value) return "Local build";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date)} UTC`;
};

export function ReleaseStatus() {
  const isProduction = releaseInfo.channel === "production";
  const statusLabel = isProduction
    ? "Live on production"
    : releaseInfo.channel === "validation"
      ? "Validation build"
      : "Development build";

  return (
    <section
      aria-labelledby="release-status-title"
      className="border-t border-white/10 bg-slate-950 text-white"
    >
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
              Release provenance
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 id="release-status-title" className="text-2xl font-black tracking-[-0.035em]">
                Deployed release v{releaseInfo.version}
              </h2>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                {statusLabel}
              </span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              This information is embedded during the GitHub Pages build. The site makes no runtime GitHub API request and adds no tracking.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs font-black">
            <a
              href={releaseInfo.releasesUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/15 px-4 py-2.5 transition hover:border-violet-300 hover:text-violet-200"
            >
              GitHub releases
            </a>
            <a
              href={releaseInfo.manifestUrl}
              className="rounded-xl bg-white px-4 py-2.5 text-slate-950 transition hover:bg-violet-100"
            >
              Release manifest
            </a>
          </div>
        </div>

        <dl className="mt-7 grid overflow-hidden rounded-2xl border border-white/10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-b border-white/10 p-4 sm:border-r lg:border-b-0">
            <dt className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Version</dt>
            <dd className="mt-1.5 font-mono text-sm font-bold text-white">v{releaseInfo.version}</dd>
          </div>
          <div className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
            <dt className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Commit</dt>
            <dd className="mt-1.5">
              <a
                href={releaseInfo.commitUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-sm font-bold text-violet-200 underline decoration-white/20 underline-offset-4 hover:text-white"
              >
                {releaseInfo.shortCommit}
              </a>
            </dd>
          </div>
          <div className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r">
            <dt className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">GitHub workflow</dt>
            <dd className="mt-1.5">
              <a
                href={releaseInfo.workflowUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-sm font-bold text-violet-200 underline decoration-white/20 underline-offset-4 hover:text-white"
              >
                Run #{releaseInfo.runNumber}
              </a>
            </dd>
          </div>
          <div className="p-4">
            <dt className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Built</dt>
            <dd className="mt-1.5 text-sm font-bold text-white">{formatBuiltAt(releaseInfo.builtAt)}</dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
          <span>Local-only processing</span>
          <span>No image uploads</span>
          <span>No analytics</span>
          <a href={releaseInfo.issuesUrl} target="_blank" rel="noreferrer" className="font-bold text-slate-300 hover:text-white">
            Report an issue
          </a>
        </div>
      </div>
    </section>
  );
}
