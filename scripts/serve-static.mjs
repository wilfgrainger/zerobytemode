import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../out", import.meta.url)));
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "127.0.0.1";

const contentTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".wasm", "application/wasm"],
  [".webp", "image/webp"],
  [".xml", "application/xml; charset=utf-8"],
]);

const securityHeaders = {
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname.split("?")[0]);
  const safePath = normalize(decoded).replace(/^([/\\])+/, "");
  const candidate = resolve(root, safePath || "index.html");

  if (!candidate.startsWith(root)) return null;

  if (await exists(candidate)) {
    const details = await stat(candidate);
    if (details.isFile()) return candidate;
    if (details.isDirectory()) {
      const index = join(candidate, "index.html");
      if (await exists(index)) return index;
    }
  }

  if (!extname(candidate)) {
    const index = join(candidate, "index.html");
    if (await exists(index)) return index;
  }

  const notFound = join(root, "404.html");
  return (await exists(notFound)) ? notFound : null;
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { ...securityHeaders, Allow: "GET, HEAD" });
    response.end();
    return;
  }

  const file = await resolveFile(request.url ?? "/");
  if (!file) {
    response.writeHead(404, securityHeaders);
    response.end("Not found");
    return;
  }

  const isNotFound = file.endsWith("404.html") && !request.url?.startsWith("/404");
  const details = await stat(file);
  response.writeHead(isNotFound ? 404 : 200, {
    ...securityHeaders,
    "Content-Length": details.size,
    "Content-Type": contentTypes.get(extname(file)) ?? "application/octet-stream",
    "Cache-Control": file.endsWith(".html") ? "no-cache" : "public, max-age=31536000, immutable",
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Serving ZeroByteMode static output at http://${host}:${port}`);
});
