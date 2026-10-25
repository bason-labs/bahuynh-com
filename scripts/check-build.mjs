import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

// `out/` is read from the working directory; budget.json and site.ts from this repo.
const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const budget = JSON.parse(readFileSync(join(repo, "budget.json"), "utf8"));
const allowedHosts = new Set(
  [...readFileSync(join(repo, "src/lib/site.ts"), "utf8").matchAll(/https?:\/\/([^/"'\s]+)/g)].map((m) => m[1]),
);
const bannedHosts = ["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net"];
const kb = (bytes) => bytes / 1024;
const fmt = (bytes) => `${kb(bytes).toFixed(1)} kB`;
const gz = (buf) => gzipSync(buf).length;

const pages = [
  { route: "/", file: "out/index.html", lang: "vi", h1: "Karaoke cho cả nhóm." },
  { route: "/en/", file: "out/en/index.html", lang: "en", h1: "Karaoke for the whole group." },
];
const errors = [];

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const baseline = { initialJsGzKb: {}, htmlGzKb: {}, preloadFontKb: {}, micChunkGzKb: null };

/** Scripts and fonts a page's HTML references, as out/ paths. */
function references(html) {
  const scripts = new Set();
  const fonts = new Set();
  for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/g)) {
    const url = attr(tag, tag.startsWith("<script") ? "src" : "href");
    if (!url?.startsWith("/")) continue;
    if (/\snomodule\b/i.test(tag)) continue; // module-capable browsers never fetch it (Q-0001-7a)
    const rel = attr(tag, "rel");
    if (tag.startsWith("<script") || (rel === "preload" && attr(tag, "as") === "script") || rel === "modulepreload") {
      scripts.add(url);
    } else if (rel === "preload" && attr(tag, "as") === "font") fonts.add(url);
  }
  return { scripts, fonts };
}
const outFile = (url) => join("out", decodeURIComponent(url.split(/[?#]/)[0]));

for (const { route, file, lang, h1 } of pages) {
  if (!existsSync(file)) {
    errors.push(`${file} is missing`);
    continue;
  }
  const html = readFileSync(file, "utf8");
  if (!html.includes(`<html lang="${lang}"`)) errors.push(`${file} lacks <html lang="${lang}"`);
  if (!html.includes(h1)) errors.push(`${file} lacks the h1 "${h1}"`);

  const htmlGz = gz(Buffer.from(html));
  baseline.htmlGzKb[route] = +kb(htmlGz).toFixed(1);
  if (kb(htmlGz) > budget.htmlGzKb) errors.push(`${route} HTML ${fmt(htmlGz)} gz exceeds ${budget.htmlGzKb} kB`);

  const { scripts, fonts } = references(html);
  let jsGz = 0;
  for (const url of scripts) {
    const path = outFile(url);
    if (!existsSync(path)) {
      errors.push(`${route} references ${url} but ${path} is missing`);
      continue;
    }
    const buf = readFileSync(path);
    jsGz += gz(buf);
    if (buf.includes(budget.threeMarker)) errors.push(`${route} loads three.js up front through ${url}`);
  }
  baseline.initialJsGzKb[route] = +kb(jsGz).toFixed(1);
  if (kb(jsGz) > budget.initialJsGzKb) errors.push(`${route} initial JS ${fmt(jsGz)} gz exceeds ${budget.initialJsGzKb} kB`);

  let fontBytes = 0;
  for (const url of fonts) {
    if (existsSync(outFile(url))) fontBytes += statSync(outFile(url)).size;
    else errors.push(`${route} preloads ${url} but ${outFile(url)} is missing`);
  }
  baseline.preloadFontKb[route] = +kb(fontBytes).toFixed(1);
  if (kb(fontBytes) > budget.preloadFontKb) errors.push(`${route} preloaded fonts ${fmt(fontBytes)} exceed ${budget.preloadFontKb} kB`);
}

const chunks = "out/_next/static/chunks";
if (existsSync(chunks)) {
  for (const name of readdirSync(chunks).filter((n) => n.endsWith(".js"))) {
    const buf = readFileSync(join(chunks, name));
    if (!buf.includes(budget.threeMarker)) continue;
    baseline.micChunkGzKb = +kb(gz(buf)).toFixed(1);
    if (kb(gz(buf)) > budget.micChunkGzKb) errors.push(`mic chunk ${name} ${fmt(gz(buf))} gz exceeds ${budget.micChunkGzKb} kB`);
  }
}

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? htmlFiles(join(dir, e.name)) : e.name.endsWith(".html") ? [join(dir, e.name)] : [],
  );
}
if (existsSync("out")) {
  for (const file of htmlFiles("out")) {
    const html = readFileSync(file, "utf8");
    for (const host of bannedHosts) if (html.includes(host)) errors.push(`${file} references ${host}`);
    for (const [tag] of html.matchAll(/<[a-z]+\b[^>]*>/g)) {
      for (const name of ["src", "href"]) {
        const m = attr(tag, name)?.match(/^(?:https?:)?\/\/([^/?#:]+)/);
        if (m && !allowedHosts.has(m[1])) errors.push(`${file} loads ${name}="${attr(tag, name)}" from a third-party origin`);
      }
    }
  }
}

if (!existsSync("out/404.html")) {
  errors.push("out/404.html is missing");
} else {
  const html = readFileSync("out/404.html", "utf8");
  for (const href of ["/", "/en/"]) {
    if (!html.includes(`href="${href}"`)) errors.push(`out/404.html lacks a link to ${href}`);
  }
}

if (errors.length > 0) {
  for (const e of errors) console.error(`check-build: ${e}`);
  process.exit(1);
}
console.log(`check-build: ok ${JSON.stringify(baseline)}`);
