import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export type Source = { path: string; text: string };
export type Finding = { path: string; rule: string; severity: "error" | "warn" };

const ROOT_LAYOUTS = new Set([
  "src/app/(vi)/layout.tsx",
  "src/app/(en)/layout.tsx",
  // The 404 page is its own root layout under global-not-found (AD-1, AD-2).
  "src/app/global-not-found.tsx",
]);
const TOKEN_HEXES = new Set(
  ["#09090a", "#0f0f11", "#f3efe8", "#8d8b87", "#55534f", "#ff4a2b", "#ffe9c4", "#bfe6ff"],
);

/** Source rules for src/** (AD-2, AD-3, AD-7, AD-8). */
export function scanSources(files: Source[]): Finding[] {
  const out: Finding[] = [];
  const add = (path: string, rule: string, severity: "error" | "warn" = "error") =>
    out.push({ path, rule, severity });
  for (const { path, text } of files) {
    if (!path.startsWith("src/")) continue;
    if (/(^|\/)route\.(ts|tsx|js)$/.test(path)) add(path, "no route handlers");
    if (path === "src/middleware.ts") add(path, "no middleware");
    if (/["']use server["']/.test(text)) add(path, "no use server");
    if (/process\.env\./.test(text)) add(path, "no process.env");
    if (/["']use client["']/.test(text) && !/(^|\/)islands\//.test(path)) {
      add(path, "use client only in islands");
    }
    if (/document\.cookie/.test(text)) add(path, "no document.cookie");
    if (/localStorage/.test(text)) add(path, "no localStorage");
    if (/\.(tsx?|jsx?)$/.test(path) && !ROOT_LAYOUTS.has(path)) {
      const globalCss = /import\s+(?:[^'"]*from\s+)?["'][^"']+\.css["']/g;
      for (const m of text.match(globalCss) ?? []) {
        if (!/\.module\.css["']/.test(m)) add(path, "global css only in root layouts");
      }
    }
    if (/\.module\.css$|\.tsx$/.test(path)) {
      const hexes = text.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
      if (hexes.some((h) => !TOKEN_HEXES.has(h.toLowerCase()))) {
        add(path, "hex colour outside tokens", "warn");
      }
    }
  }
  return out;
}

/** The dim token is never a text colour (REQ-LAND-002.AC-1, REQ-LAND-044.AC-2). */
export function scanDimText(path: string, css: string): Finding[] {
  const lines = css.split("\n");
  const out: Finding[] = [];
  lines.forEach((line, i) => {
    if (!/(^|[\s;{])color\s*:[^;]*(var\(--dim\)|#55534f)/i.test(line)) return;
    if ((lines[i - 1] ?? "").trim() === "/* dim-ok: decorative */") return;
    out.push({ path, rule: "dim token used for text", severity: "error" });
  });
  return out;
}

export function walk(dir: string, root: string, match: RegExp): Source[] {
  const files: Source[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "out") continue;
      files.push(...walk(full, root, match));
    } else if (match.test(entry.name)) {
      files.push({ path: relative(root, full), text: readFileSync(full, "utf8") });
    }
  }
  return files;
}

const DEV_ALLOWED = [/^typescript$/, /^@types\//, /^eslint$/, /^eslint-config-next$/, /^vitest$/];
const DEPS_ALLOWED = new Set(["next", "react", "react-dom", "three"]);

/** Dependency allowlist (AD-12). Returns the package names that are not allowed. */
export function disallowedDeps(manifest: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}): string[] {
  const bad = Object.keys(manifest.dependencies ?? {}).filter((n) => !DEPS_ALLOWED.has(n));
  for (const n of Object.keys(manifest.devDependencies ?? {})) {
    if (!DEV_ALLOWED.some((re) => re.test(n))) bad.push(n);
  }
  return bad;
}
