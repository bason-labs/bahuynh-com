import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

const script = resolve("scripts/check-build.mjs");
const marker = (JSON.parse(readFileSync("budget.json", "utf8")) as { threeMarker: string }).threeMarker;
const dirs: string[] = [];

type Files = Record<string, string | Buffer>;

const page = (lang: string, h1: string, head = "") =>
  `<!DOCTYPE html><html lang="${lang}"><head>${head}</head><body><h1>${h1}</h1></body></html>`;

/** Writes a temporary out/ and runs check-build in it. */
function run(files: Files = {}, heads: { vi?: string; en?: string } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), "check-build-"));
  dirs.push(cwd);
  const all: Files = {
    "out/index.html": page("vi", "Karaoke cho cả nhóm.", heads.vi),
    "out/en/index.html": page("en", "Karaoke for the whole group.", heads.en),
    "out/404.html": '<html><body><a href="/">vi</a><a href="/en/">en</a></body></html>',
    "out/_next/static/chunks/a.js": "console.log(1)",
    ...files,
  };
  for (const [path, data] of Object.entries(all)) {
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
    const head = '<a href="https://kara.bahuynh.com/privacy">p</a><link rel="canonical" href="https://bahuynh.com/"/>';
    expect(run({}, { vi: head }).code).toBe(0);
  });
});
