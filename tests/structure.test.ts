import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { scanDimText, scanSources, walk } from "./rules";

const root = process.cwd();
const rules = (path: string, text: string) =>
  scanSources([{ path, text }]).map((f) => `${f.severity}:${f.rule}`);

describe("tokens.css", () => {
  const css = readFileSync("src/styles/tokens.css", "utf8");
  const expected: Record<string, string> = {
    "--bg": "#09090a",
    "--bg-2": "#0f0f11",
    "--fg": "#f3efe8",
    "--muted": "#8d8b87",
    "--dim": "#55534f",
    "--line": "rgba(255, 255, 255, 0.08)",
    "--line-2": "rgba(255, 255, 255, 0.16)",
    "--air": "#ff4a2b",
    "--spot": "#ffe9c4",
    "--phone": "#bfe6ff",
    "--gut": "clamp(16px, 4vw, 56px)",
    "--max": "1280px",
  };
  const norm = (v: string) => v.replace(/\s+/g, "").replace(/0\./g, ".");

  it("declares each token once on :root", () => {
    expect(css.match(/:root\s*\{/g)).toHaveLength(1);
    for (const [name, value] of Object.entries(expected)) {
      const decls = [...css.matchAll(new RegExp(`^\\s*${name}:\\s*([^;]+);`, "gm"))];
      expect(decls, name).toHaveLength(1);
      expect(norm(decls[0][1]), name).toBe(norm(value));
    }
  });

  it("maps the four font variables", () => {
    for (const [token, font] of [
      ["--display", "--font-archivo"],
      ["--sans", "--font-be-vietnam-pro"],
      ["--mono", "--font-jetbrains-mono"],
      ["--serif", "--font-playfair-display"],
    ]) {
      expect(css).toMatch(new RegExp(`${token}:\\s*var\\(${font}\\)`));
    }
  });
});

describe("dim token", () => {
  it("fails on a color declaration using it", () => {
    expect(scanDimText("a.css", "a {\n  color: var(--dim);\n}")).toHaveLength(1);
    expect(scanDimText("a.css", "a { color: #55534F; }")).toHaveLength(1);
  });
  it("allows borders, and a preceding dim-ok comment", () => {
    expect(scanDimText("a.css", "a { border-color: var(--dim); }")).toHaveLength(0);
    expect(scanDimText("a.css", "a {\n  /* dim-ok: decorative */\n  color: var(--dim);\n}")).toHaveLength(0);
  });
  it("passes on every real css file", () => {
    const found = walk(root, root, /\.css$/).flatMap((f) => scanDimText(f.path, f.text));
    expect(found).toEqual([]);
  });
});

describe("source rules (fixtures)", () => {
  it("flags route.ts and middleware.ts", () => {
    expect(rules("src/app/api/route.ts", "")).toContain("error:no route handlers");
    expect(rules("src/middleware.ts", "")).toContain("error:no middleware");
  });
  it("flags use server and process.env", () => {
    expect(rules("src/a.ts", '"use server";')).toContain("error:no use server");
    expect(rules("src/a.ts", "const x = process.env.FOO;")).toContain("error:no process.env");
  });
  it("flags use client outside islands only", () => {
    expect(rules("src/features/landing/A.tsx", '"use client";')).toContain("error:use client only in islands");
    expect(rules("src/features/landing/islands/A.tsx", '"use client";')).toEqual([]);
  });
  it("flags global css outside the root layouts only", () => {
    const imp = 'import "@/styles/x.css";';
    expect(rules("src/features/A.tsx", imp)).toContain("error:global css only in root layouts");
    expect(rules("src/features/A.tsx", 'import s from "./A.module.css";')).toEqual([]);
    expect(rules("src/app/(vi)/layout.tsx", imp)).toEqual([]);
  });
  it("flags cookies and localStorage", () => {
    expect(rules("src/a.ts", "document.cookie = 'a=1'")).toContain("error:no document.cookie");
    expect(rules("src/a.ts", "localStorage.getItem('a')")).toContain("error:no localStorage");
  });
  it("reports stray hex colours as warn", () => {
    expect(rules("src/a.module.css", "a { background: #123456; }")).toEqual(["warn:hex colour outside tokens"]);
    expect(rules("src/a.module.css", "a { background: #09090a; }")).toEqual([]);
  });
});

describe("real src/", () => {
  const findings = scanSources(walk("src", root, /\.(tsx?|css)$/).map((f) => ({ ...f, path: f.path })));
  it("has no blocking findings", () => {
    expect(findings.filter((f) => f.severity === "error")).toEqual([]);
  });
  it("reports warnings", () => {
    for (const f of findings.filter((f) => f.severity === "warn")) console.warn(`warn: ${f.rule} in ${f.path}`);
  });
});
