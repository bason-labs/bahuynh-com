import { describe, expect, it } from "vitest";
import { formatCount, increment, pointFor } from "./reaction";

describe("increment", () => {
  it.each([
    [0, 1],
    [0.33, 1],
    [0.34, 2],
    [0.66, 2],
    [0.67, 3],
    [0.999, 3],
  ])("random %f gives %i", (random, expected) => {
    expect(increment(random)).toBe(expected);
  });
});

describe("pointFor", () => {
  it("stays inside 20 to 80 % of the width and 35 to 65 % of the height at the four corner draws", () => {
    const w = 1000;
    const h = 500;
    const corners = [
      [0, 0, 200, 175],
      [1, 0, 800, 175],
      [0, 1, 200, 325],
      [1, 1, 800, 325],
    ] as const;
    for (const [r1, r2, x, y] of corners) {
      const p = pointFor(r1, r2, w, h);
      expect(p.x).toBeCloseTo(x);
      expect(p.y).toBeCloseTo(y);
    }
  });
});

describe("formatCount", () => {
  it.each([
    ["vi", 1248, "1.248"],
    ["en", 1248, "1,248"],
    ["vi", 1254, "1.254"],
    ["en", 1254, "1,254"],
  ])("%s %i reads %s", (locale, count, text) => {
    expect(formatCount(count, locale)).toBe(text);
  });
});
