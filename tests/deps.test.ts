import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { disallowedDeps } from "./rules";

describe("dependency allowlist (AD-12)", () => {
  it("accepts the real package.json", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8"));
    expect(disallowedDeps(manifest)).toEqual([]);
  });
  it("fails on an extra package", () => {
    expect(disallowedDeps({ dependencies: { next: "1", lodash: "1" } })).toEqual(["lodash"]);
    expect(disallowedDeps({ devDependencies: { tailwindcss: "1", vitest: "1" } })).toEqual(["tailwindcss"]);
  });
});
