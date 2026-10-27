import { describe, expect, it } from "vitest";
import { DUST_COUNT, DUST_RISE_PER_FRAME, seedDust, stepDust, wrapDust } from "./dust";

describe("wrapDust", () => {
  it("keeps a particle at or below the top and sends a higher one to the bottom", () => {
    expect(wrapDust(4.99)).toBe(4.99);
    expect(wrapDust(5)).toBe(5);
    expect(wrapDust(5.0025)).toBe(-3);
  });
});

describe("seedDust", () => {
  it("makes 500 particles inside the light volume", () => {
    const p = seedDust(DUST_COUNT, () => 0.5);
    expect(p).toHaveLength(DUST_COUNT * 3);
    expect(p[0]).toBe(0);
    expect(p[1]).toBeCloseTo(1.6);
  });
  it("spans x in [-3.5, 3.5), y in [-2.4, 5.6), z in [-2.5, 2.5)", () => {
    const lo = seedDust(1, () => 0);
    const hi = seedDust(1, () => 0.999999);
    expect([lo[0], lo[1], lo[2]]).toEqual([-3.5, expect.closeTo(-2.4), -2.5]);
    expect(hi[0]).toBeCloseTo(3.5);
    expect(hi[1]).toBeCloseTo(5.6);
    expect(hi[2]).toBeCloseTo(2.5);
  });
});

describe("stepDust", () => {
  it("raises y by 0.0025 and leaves x and z alone", () => {
    const p = new Float32Array([1, 0, 2, -1, 3, -2]);
    stepDust(p);
    expect(Array.from(p)).toEqual([1, expect.closeTo(DUST_RISE_PER_FRAME, 6), 2, -1, expect.closeTo(3.0025, 5), -2]);
  });
  it("wraps a particle that crosses the top", () => {
    const p = new Float32Array([0, 5, 0]);
    stepDust(p);
    expect(p[1]).toBe(-3);
  });
});
