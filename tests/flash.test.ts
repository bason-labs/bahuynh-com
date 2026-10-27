import { describe, expect, it } from "vitest";
import { walk } from "./rules";

// WCAG 2.3.1: nothing flashes more than three times in any one second, so no full on/off cycle of
// opacity or colour may be shorter than a third of a second (0.34 s with the margin the spec asks for).
const MIN_CYCLE_S = 0.34;
const FLASHING = /^(opacity|color|background(-color)?|border(-\w+)?-color|outline-color|fill|stroke|filter|box-shadow|text-shadow)$/;

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** `@keyframes` name -> the properties its frames set. */
export function keyframeProperties(css: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    let depth = 1;
    let i = m.index! + m[0].length;
    const start = i;
    for (; i < css.length && depth > 0; i++) depth += css[i] === "{" ? 1 : css[i] === "}" ? -1 : 0;
    const body = css.slice(start, i - 1);
    out.set(m[1], new Set([...body.matchAll(/([\w-]+)\s*:/g)].map((p) => p[1])));
  }
  return out;
}

const seconds = (token: string) => (token.endsWith("ms") ? parseFloat(token) / 1000 : parseFloat(token));

/** Every animation declaration as `{ name, cycle }`, the cycle in seconds (doubled for `alternate`). */
export function animations(css: string): { name: string; cycle: number }[] {
  const out: { name: string; cycle: number }[] = [];
  for (const m of css.matchAll(/(?<![\w-])animation(?:-name|-duration)?\s*:\s*([^;]+);/g)) {
    const value = m[1].trim();
    if (value === "none" || value.startsWith("none ")) continue;
    const tokens = value.split(/\s+(?![^(]*\))/);
    const time = tokens.find((t) => /^[\d.]+m?s$/.test(t));
    const name = tokens.find((t) => /^[A-Za-z_][\w-]*$/.test(t) && !/^(ease|ease-in|ease-out|ease-in-out|linear|infinite|alternate|alternate-reverse|reverse|normal|forwards|backwards|both|none|running|paused)$/.test(t));
    if (!time || !name) throw new Error(`cannot read the animation declaration: ${m[0]}`);
    out.push({ name, cycle: seconds(time) * (tokens.includes("alternate") || tokens.includes("alternate-reverse") ? 2 : 1) });
  }
  return out;
}

/** Names of animations whose keyframes change opacity or colour and whose cycle is under the minimum. */
export function flashes(files: { path: string; text: string }[]): string[] {
  const out: string[] = [];
  for (const { path, text } of files) {
    const css = stripComments(text);
    const frames = keyframeProperties(css);
    for (const { name, cycle } of animations(css)) {
      const props = frames.get(name);
      if (!props) continue;
      const flashing = [...props].filter((p) => FLASHING.test(p));
      if (flashing.length && cycle < MIN_CYCLE_S) out.push(`${path}: ${name} (${flashing.join(", ")}) cycles in ${cycle}s`);
    }
  }
  return out;
}

const files = walk("src", process.cwd(), /\.css$/);

describe("flashing (WCAG 2.3.1)", () => {
  it("scans the stylesheets and finds the five animations", () => {
    const all = files.flatMap((f) => animations(stripComments(f.text)).map((a) => a.name));
    expect(all.sort()).toEqual(["grain", "marq", "ring", "slide", "up", "wave"]);
  });

  it("no animation of opacity or colour cycles in under 0.34 s", () => {
    expect(flashes(files)).toEqual([]);
  });

  it("the grain steps every 0.2 s but only translates", () => {
    const globals = files.find((f) => f.path.endsWith("globals.css"))!;
    const props = keyframeProperties(stripComments(globals.text)).get("grain")!;
    expect([...props].filter((p) => FLASHING.test(p))).toEqual([]);
    expect(props.has("transform")).toBe(true);
  });

  it("fails an opacity keyframe that cycles every 0.3 s and a colour one every 0.2 s", () => {
    const bad = [
      { path: "a.css", text: ".x { animation: blink 0.3s linear infinite; } @keyframes blink { 50% { opacity: 0; } }" },
      { path: "b.css", text: ".y { animation: flick 0.1s infinite alternate; } @keyframes flick { to { color: red; } }" },
      { path: "c.css", text: ".z { animation: ok 0.2s steps(6) infinite; } @keyframes ok { to { transform: translate(1px); } }" },
    ];
    expect(flashes(bad)).toEqual(["a.css: blink (opacity) cycles in 0.3s", "b.css: flick (color) cycles in 0.2s"]);
  });
});
