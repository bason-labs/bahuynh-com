import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { gzipSync } from "node:zlib";

const root = join(process.cwd(), "out");
const portArg = process.argv.indexOf("--port");
const port = portArg > 0 ? Number(process.argv[portArg + 1]) : 4173;

if (!existsSync(root)) {
  console.error("serve-out: out/ is missing, run pnpm build first");
  process.exit(1);
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};
const compressible = /^(text\/|application\/json|image\/svg)/;

function resolve(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const path = join(root, clean);
  if (!path.startsWith(root)) return null;
  if (existsSync(path) && statSync(path).isFile()) return path;
  const index = join(path, "index.html");
  return existsSync(index) ? index : null;
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const send = (status, file, headers = {}) => {
    const type = types[extname(file)] ?? "application/octet-stream";
    let body = readFileSync(file);
    const out = { "Content-Type": type, ...headers };
    if (compressible.test(type)) {
      out.Vary = "Accept-Encoding";
      if (/\bgzip\b/.test(req.headers["accept-encoding"] ?? "")) {
        body = gzipSync(body);
        out["Content-Encoding"] = "gzip";
      }
    }
    out["Content-Length"] = body.length;
    res.writeHead(status, out);
    res.end(req.method === "HEAD" ? undefined : body);
  };

  // A directory without its trailing slash redirects, like a static host.
  const bare = join(root, normalize(decodeURIComponent(url.pathname)));
  if (!url.pathname.endsWith("/") && bare.startsWith(root) && existsSync(bare) && statSync(bare).isDirectory()) {
    res.writeHead(301, { Location: `${url.pathname}/${url.search}` });
    res.end();
    return;
  }
  const file = resolve(url.pathname);
  if (file) send(200, file);
  else send(404, join(root, "404.html"));
}).listen(port, () => console.log(`serve-out: http://localhost:${port}`));
