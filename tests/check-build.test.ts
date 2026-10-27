import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

const script = resolve("scripts/check-build.mjs");
const marker = (JSON.parse(readFileSync("budget.json", "utf8")) as { threeMarker: string }).threeMarker;
const dirs: string[] = [];

type Files = Record<string, string | Buffer | null>;

const H2S = {
  vi: ["Một đêm hát, 36 giây.", "Chưa biết hát gì? Quay.", "Không ai hát một mình.", "Mọi thứ một đêm hát cần.", "Đêm nay hát gì?"],
  en: ["One night of singing, 36 seconds.", "Nothing to sing? Spin.", "Nobody sings alone.", "Everything a night out needs.", "What are we singing tonight?"],
} as const;

const LINKS = {
  vi: '<link rel="canonical" href="https://bahuynh.com/"/>',
  en: '<link rel="canonical" href="https://bahuynh.com/en/"/>',
} as const;
const ALTERNATES =
  '<link rel="alternate" hrefLang="vi" href="https://bahuynh.com/"/><link rel="alternate" hrefLang="en" href="https://bahuynh.com/en/"/><link rel="alternate" hrefLang="x-default" href="https://bahuynh.com/"/>';

const page = (lang: "vi" | "en", h1: string, head = "", h2s: readonly string[] = H2S[lang]) =>
  `<!DOCTYPE html><html lang="${lang}"><head>${LINKS[lang]}${ALTERNATES}${head}</head><body><h1>${h1}</h1>${h2s.map((h) => `<h2>${h}</h2>`).join("")}</body></html>`;

/** Writes a temporary out/ and runs check-build in it. */
function run(files: Files = {}, heads: { vi?: string; en?: string } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), "check-build-"));
  dirs.push(cwd);
  const all: Files = {
    "out/index.html": page("vi", "Karaoke cho cả nhóm.", heads.vi),
    "out/en/index.html": page("en", "Karaoke for the whole group.", heads.en),
    "out/og/vi.png": "png",
    "out/og/en.png": "png",
    "out/404.html": '<html><body><a href="/">vi</a><a href="/en/">en</a></body></html>',
    "out/_next/static/chunks/a.js": "console.log(1)",
    ...files,
  };
  for (const [path, data] of Object.entries(all)) {
    if (data === null) continue;
    mkdirSync(dirname(join(cwd, path)), { recursive: true });
    writeFileSync(join(cwd, path), data);
  }
  const res = spawnSync("node", [script], { cwd, encoding: "utf8" });
  return { code: res.status, out: res.stderr + res.stdout };
}

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const script1 = '<script src="/_next/static/chunks/a.js" async=""></script>';

describe("check-build", () => {
  it("fails when a share image is missing or over 300 kB", () => {
    const missing = run({ "out/og/en.png": null });
    expect(missing.code).not.toBe(0);
    expect(missing.out).toContain("out/og/en.png is missing");
    const r = run({ "out/og/vi.png": Buffer.alloc(300 * 1024 + 1), "out/og/en.png": "png" });
    expect(r.code).not.toBe(0);
    expect(r.out).toContain("out/og/vi.png 300.0 kB exceeds 300 kB");
  });

  it("fails when a page lacks its canonical or an alternate", () => {
    const r = run({
      "out/index.html": "<!DOCTYPE html><html lang=\"vi\"><head></head><body><h1>Karaoke cho cả nhóm.</h1>" + H2S.vi.map((h) => `<h2>${h}</h2>`).join("") + "</body></html>",
    });
    expect(r.code).not.toBe(0);
    expect(r.out).toContain("out/index.html has 0 canonical links, expected 1");
    expect(r.out).toContain("out/index.html has 0 hreflang x-default links, expected 1");
  });

  it("fails when an alternate is duplicated or points elsewhere", () => {
    const r = run({}, { en: '<link rel="alternate" hreflang="en" href="https://bahuynh.com/en/"/>' });
    expect(r.out).toContain("out/en/index.html has 2 hreflang en links, expected 1");
    const w = run({
      "out/en/index.html": page("en", "Karaoke for the whole group.").replace('rel="canonical" href="https://bahuynh.com/en/"', 'rel="canonical" href="https://bahuynh.com/"'),
    });
    expect(w.out).toContain("out/en/index.html canonical link points to https://bahuynh.com/, expected https://bahuynh.com/en/");
  });

  it("fails when a chapter h2 is missing from the raw HTML", () => {
    const r = run({ "out/en/index.html": page("en", "Karaoke for the whole group.", "", H2S.en.slice(0, 4)) });
    expect(r.code).not.toBe(0);
    expect(r.out).toContain('out/en/index.html lacks the h2 "What are we singing tonight?"');
  });

  it("passes on a small valid output", () => {
    const r = run({}, { vi: script1, en: script1 });
    expect(r.out).toContain("check-build: ok");
    expect(r.code).toBe(0);
  });

  it("fails and names the page and total when first-view JS is over the cap", () => {
    const big = randomBytes(190 * 1024);
    const r = run({ "out/_next/static/chunks/a.js": big }, { vi: script1, en: script1 });
    expect(r.code).not.toBe(0);
    expect(r.out).toMatch(/\/ initial JS 19\d\.\d kB gz exceeds 180 kB/);
    expect(r.out).toMatch(/\/en\/ initial JS 19\d\.\d kB gz exceeds 180 kB/);
  });

  it("counts preload and modulepreload scripts and skips nomodule ones", () => {
    const big = randomBytes(190 * 1024);
    const files = { "out/_next/static/chunks/b.js": big };
    const skipped = run(files, { vi: '<script src="/_next/static/chunks/b.js" noModule=""></script>' });
    expect(skipped.code).toBe(0);
    const pre = run(files, { vi: '<link rel="preload" as="script" href="/_next/static/chunks/b.js"/>' });
    expect(pre.out).toMatch(/\/ initial JS/);
    const mod = run(files, { en: '<link rel="modulepreload" href="/_next/static/chunks/b.js"/>' });
    expect(mod.out).toMatch(/\/en\/ initial JS/);
  });

  it("fails when the film fixture is in the output", () => {
    const files = run({ "out/film/film.webm": "x" });
    expect(files.out).toContain("out/film exists");
    const code = run({ "out/_next/static/chunks/a.js": 'f("/film/film.webm")' });
    expect(code.out).toContain("a.js contains the film fixture config");
  });

  it("fails when HTML is over the cap", () => {
    const r = run({ "out/index.html": page("vi", "Karaoke cho cả nhóm.", `<!--${randomBytes(60 * 1024).toString("hex")}-->`) });
    expect(r.out).toMatch(/\/ HTML \d+\.\d kB gz exceeds 50 kB/);
  });

  it("fails when preloaded fonts are over the cap", () => {
    const head = '<link rel="preload" href="/f.woff2" as="font" type="font/woff2"/>';
    const r = run({ "out/f.woff2": randomBytes(210 * 1024) }, { vi: head });
    expect(r.out).toMatch(/\/ preloaded fonts \d+\.\d kB exceed 200 kB/);
  });

  it("fails when a referenced script contains the three marker", () => {
    const files = { "out/_next/static/chunks/a.js": `window.${marker}="1"` };
    for (const [kind, head] of [
      ["blocking script", script1],
      ["preload", '<link rel="preload" as="script" href="/_next/static/chunks/a.js"/>'],
      ["modulepreload", '<link rel="modulepreload" href="/_next/static/chunks/a.js"/>'],
    ]) {
      const r = run(files, { vi: head });
      expect(r.code, kind).not.toBe(0);
      expect(r.out, kind).toContain("loads three.js up front");
    }
  });

  it("allows the mic chunk when no page references it, and caps it", () => {
    const ok = run({ "out/_next/static/chunks/mic.js": `window.${marker}="1"` });
    expect(ok.code).toBe(0);
    const big = run({ "out/_next/static/chunks/mic.js": Buffer.concat([Buffer.from(marker), randomBytes(175 * 1024)]) });
    expect(big.out).toMatch(/mic chunk mic\.js \d+\.\d kB gz exceeds 170 kB/);
  });

  it.each([
    ["fonts.googleapis.com", '<link rel="stylesheet" href="https://fonts.googleapis.com/css2"/>'],
    ["fonts.gstatic.com", '<link rel="preconnect" href="https://fonts.gstatic.com"/>'],
    ["cdn.jsdelivr.net", '<script src="https://cdn.jsdelivr.net/x.js"></script>'],
    ["example.com", '<a href="https://example.com/x">x</a>'],
    ["example.org", '<img src="//example.org/a.png"/>'],
  ])("fails on a reference to %s", (host, head) => {
    const r = run({ "out/deep/page.html": `<html><head>${head}</head></html>` });
    expect(r.code).not.toBe(0);
    expect(r.out).toContain(host);
  });

  it("allows kara.bahuynh.com and the site origin", () => {
    const head = '<a href="https://kara.bahuynh.com/privacy">p</a><a href="https://bahuynh.com/x">x</a>';
    expect(run({}, { vi: head }).code).toBe(0);
  });
});
