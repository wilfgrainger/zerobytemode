import packageJson from "../../package.json";

const repository = "https://github.com/wilfgrainger/zerobytemode";
const commit = process.env.NEXT_PUBLIC_RELEASE_COMMIT?.trim() || "development";
const runNumber = process.env.NEXT_PUBLIC_RELEASE_RUN?.trim() || "local";
const runId = process.env.NEXT_PUBLIC_RELEASE_RUN_ID?.trim() || "";
const channel = process.env.NEXT_PUBLIC_RELEASE_CHANNEL?.trim() || "development";
const builtAt = process.env.NEXT_PUBLIC_RELEASE_DATE?.trim() || "";
const hasCommit = /^[0-9a-f]{40}$/i.test(commit);

export const releaseInfo = Object.freeze({
  schemaVersion: 1,
  product: "ZeroByteMode",
  version: packageJson.version,
  status: channel === "production" ? "deployed" : channel,
  channel,
  commit,
  shortCommit: hasCommit ? commit.slice(0, 7) : commit,
  runNumber,
  runId,
  builtAt: builtAt || null,
  repository,
  commitUrl: hasCommit ? `${repository}/commit/${commit}` : repository,
  workflowUrl: runId ? `${repository}/actions/runs/${runId}` : `${repository}/actions`,
  releasesUrl: `${repository}/releases`,
  issuesUrl: `${repository}/issues`,
  manifestUrl: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/release.json`,
  privacy: {
    processing: "local-only",
    imageUploads: false,
    analytics: false,
    accounts: false,
  },
});
