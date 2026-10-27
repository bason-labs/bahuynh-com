import { describe, expect, it } from "vitest";
import { PALETTE } from "./palette";
import { makeSparks, stepSpark } from "./sparks";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("sparks", () => {
  it("makes n sparks at the point with full life", () => {
    const sparks = makeSparks(300, 200, 26, seeded(1));
    expect(sparks).toHaveLength(26);
    for (const s of sparks) expect([s.x, s.y, s.life]).toEqual([300, 200, 1]);
  });

  it("is about 35 % red and the rest warm and cool", () => {
    const sparks = makeSparks(0, 0, 4000, seeded(7));
    const share = (c: string) => sparks.filter((s) => s.color === c).length / sparks.length;
    expect(share(PALETTE.red)).toBeGreaterThan(0.32);
    expect(share(PALETTE.red)).toBeLessThan(0.38);
    expect(share(PALETTE.warm)).toBeGreaterThan(0.28);
    expect(share(PALETTE.cool)).toBeGreaterThan(0.28);
    expect(share(PALETTE.red) + share(PALETTE.warm) + share(PALETTE.cool)).toBe(1);
  });

  it("moves by its velocity and loses life each step", () => {
    const s = { x: 0, y: 0, vx: 2, vy: -1, r: 8, life: 1, color: PALETTE.red };
    stepSpark(s);
    expect(s).toMatchObject({ x: 2, y: -1, vy: -1.02 });
    expect(s.life).toBeCloseTo(0.988);
  });
});
