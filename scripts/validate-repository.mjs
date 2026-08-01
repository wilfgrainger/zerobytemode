import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "LICENSE",
  "PRIVACY.md",
  "CONTRIBUTING.md",
  "AGENTS.md",
  "PROGRESS.md",
  "src/app/page.tsx",
  "src/app/compressor.worker.ts",
  "docs/ARCHITECTURE.md",
  "public/CNAME",
  "package-lock.json",
  "wrangler.jsonc",
];

const removedFiles = [
  ".Jules",
  ".jules",
  ".agents",
  ".cursorrules",
  ".spec",
  "tasks",
  "src/app/verify/page.tsx",
  "src/lib/constants.ts",
  "src/lib/cookies.ts",
  "src/app/components/SignInModal.tsx",
  "src/app/components/UpgradeEmailModal.tsx",
  "src/app/components/SupportModal.tsx",
  "worker",
  "wrangler.toml",
  "pnpm-lock.yaml",
  "build.log",
  "CNAME",
  "public/_headers",
  "public/sw.js",
];

const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const failures = [];

for (const path of requiredFiles) {
  if (!(await exists(path))) failures.push(`Missing required file: ${path}`);
}

for (const path of removedFiles) {
  if (await exists(path)) failures.push(`Legacy release residue returned: ${path}`);
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const allDependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};

for (const dependency of [
  "stripe",
  "@stripe/stripe-js",
  "wrangler",
  "@capacitor/core",
  "@capacitor/preferences",
]) {
  if (dependency in allDependencies) failures.push(`Forbidden dependency: ${dependency}`);
}

const sourceFiles = [
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "src/app/robots.ts",
  "src/app/sitemap.ts",
  "src/app/compressor.worker.ts",
  "public/manifest.json",
  "package.json",
];
const source = (
  await Promise.all(sourceFiles.map((path) => readFile(path, "utf8")))
).join("\n");

for (const [label, pattern] of [
  ["Pro entitlement state", /\bisPro\b|zbm_pro_tier/i],
  ["checkout or billing integration", /create-checkout|billing portal|stripe\.com/i],
  ["magic-link authentication", /magic[- ]link|validate-session|session_token/i],
  ["remote email service", /resend\.com|RESEND_API_KEY/i],
  ["analytics", /googletagmanager|google-analytics|gtag\(/i],
  ["subscription Worker", /zerobytemode-subscriptions|NEXT_PUBLIC_WORKER_URL/i],
  ["stale www canonical origin", /https:\/\/www\.zerobytemode\.com/i],
  ["unsupported frame-ancestors meta claim", /frame-ancestors/i],
  ["missing social preview asset", /opengraph-image\.png/i],
]) {
  if (pattern.test(source)) failures.push(`Forbidden ${label} found in shipped source`);
}

const page = await readFile("src/app/page.tsx", "utf8");
for (const marker of [
  "No account. No paywall.",
  "All unlocked",
  "Download ZIP",
  "View source",
]) {
  if (!page.includes(marker)) failures.push(`Missing product marker: ${marker}`);
}

const layout = await readFile("src/app/layout.tsx", "utf8");
if (!layout.includes("connect-src 'self' blob:")) {
  failures.push("CSP must permit only same-origin and local Blob connections");
}
if (!layout.includes("form-action 'none'")) failures.push("CSP must block form submission");
if (!layout.includes("object-src 'none'")) failures.push("CSP must block embedded objects");

const cname = (await readFile("public/CNAME", "utf8")).trim();
if (cname !== "zerobytemode.com") failures.push("public/CNAME must contain zerobytemode.com");

const wrangler = JSON.parse(await readFile("wrangler.jsonc", "utf8"));
if (wrangler.name !== "zerobytemode") {
  failures.push("wrangler.jsonc name must match the Cloudflare Worker name");
}
if (wrangler.assets?.directory !== "./out") {
  failures.push("wrangler.jsonc must deploy the static Next.js output from ./out");
}
if (wrangler.assets?.not_found_handling !== "404-page") {
  failures.push("wrangler.jsonc must preserve the generated static 404 page");
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Repository matches the one-edition, local-only architecture.");
