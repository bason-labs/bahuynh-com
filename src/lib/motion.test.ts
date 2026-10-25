import { describe, expect, it } from "vitest";
import { parseStored, resolveMotion } from "./motion";

describe("parseStored", () => {
  it("accepts reduce and run only", () => {
    expect(parseStored("reduce")).toBe("reduce");
    expect(parseStored("run")).toBe("run");
    for (const bad of [null, undefined, "", "Reduce", "true", "1", 0, {}]) expect(parseStored(bad)).toBeNull();
  });
});

describe("resolveMotion", () => {
  it("follows the system setting when nothing is stored", () => {
    expect(resolveMotion({ system: true, stored: null })).toEqual({ reduce: true, pressed: true });
    expect(resolveMotion({ system: false, stored: null })).toEqual({ reduce: false, pressed: false });
  });
  it("lets the stored choice win", () => {
    expect(resolveMotion({ system: true, stored: "run" })).toEqual({ reduce: false, pressed: false });
    expect(resolveMotion({ system: false, stored: "reduce" })).toEqual({ reduce: true, pressed: true });
  });
});
