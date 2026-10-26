import { describe, expect, it } from "vitest";
import { en } from "./en";
import { vi } from "./vi";

function strings(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => strings(v, `${path}.${k}`));
  }
  return [];
}

describe.each([["vi", vi], ["en", en]])("%s dictionary", (_name, dict) => {
  it("has no empty string and no TODO", () => {
    const all = strings(dict);
    expect(all.length).toBeGreaterThan(0);
    for (const [path, text] of all) {
      expect(text.trim(), path).not.toBe("");
      expect(text, path).not.toMatch(/TODO/);
    }
  });
});
