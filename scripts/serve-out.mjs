import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { gzipSync } from "node:zlib";

const dirArg = process.argv.indexOf("--dir");
const dir = dirArg > 0 ? process.argv[dirArg + 1] : "out";
const root = join(process.cwd(), dir);
const portArg = process.argv.indexOf("--port");
const port = portArg > 0 ? Number(process.argv[portArg + 1]) : 4173;

if (!existsSync(root)) {
  console.error(`serve-out: ${dir}/ is missing, run pnpm ${dir === "out" ? "build" : "build:film-fixture"} first`);
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
  ".webm": "video/webm",
  ".vtt": "text/vtt; charset=utf-8",
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
    // Media elements ask for byte ranges.
    const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
    if (range && status === 200 && !out["Content-Encoding"]) {
      const start = range[1] === "" ? Math.max(body.length - Number(range[2]), 0) : Number(range[1]);
      const end = range[1] === "" || range[2] === "" ? body.length - 1 : Math.min(Number(range[2]), body.length - 1);
      if (start > end) {
        res.writeHead(416, { "Content-Range": `bytes */${body.length}` });
        res.end();
        return;
      }
      out["Content-Range"] = `bytes ${start}-${end}/${body.length}`;
      status = 206;
      body = body.subarray(start, end + 1);
    }
    out["Accept-Ranges"] = "bytes";
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
