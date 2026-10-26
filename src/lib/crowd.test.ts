import { describe, expect, it } from "vitest";
import { crowdFrameParams, heroGlow, seedPeople, togetherGlow } from "./crowd";

const times = Array.from({ length: 200 }, (_, i) => i * 0.1);
const hero = { rows: 2, gap: 78, scale: 0.62 };

describe("crowdFrameParams", () => {
  it("idle holds the phones near 55 % with a 0.08 sway, a 2 px bob and a 1x glow", () => {
    const frames = times.map((t) => crowdFrameParams(0, t, false));
    for (const f of frames) {
      expect(f.raise).toBeGreaterThanOrEqual(0.55 - 0.08);
      expect(f.raise).toBeLessThanOrEqual(0.55 + 0.08);
      expect(f.glowRadiusScale).toBe(1);
    }
    expect(Math.max(...frames.map((f) => Math.abs(f.bobPx)))).toBeCloseTo(2, 1);
    expect(Math.max(...frames.map((f) => f.raise))).toBeCloseTo(0.63, 1);
  });

  it("live raises fully, bobs 8 px and doubles the glow radius", () => {
    const frames = times.map((t) => crowdFrameParams(1, t, false));
    for (const f of frames) {
      expect(f.raise).toBeGreaterThanOrEqual(1 - 0.08);
      expect(f.raise).toBeLessThanOrEqual(1 + 0.08);
      expect(f.glowRadiusScale).toBe(2);
    }
    expect(Math.max(...frames.map((f) => Math.abs(f.bobPx)))).toBeCloseTo(8, 1);
  });

  it.each([0, 1])("under reduced motion at heat %i there is no bob or sway, height and glow still follow", (heat) => {
    for (const t of times) {
      expect(crowdFrameParams(heat, t, true)).toEqual({
        raise: 0.55 + 0.45 * heat,
        bobPx: 0,
        glowRadiusScale: 1 + heat,
      });
    }
  });
});

describe("heroGlow", () => {
  it("is warm at 0 and red at 1", () => {
    expect(heroGlow(0)).toBe("rgba(255,233,196,.05)");
    expect(heroGlow(1)).toBe("rgba(255,74,43,.16)");
  });
});

describe("seedPeople", () => {
  it("returns identical people for the same width and options", () => {
    expect(seedPeople(1440, hero)).toEqual(seedPeople(1440, hero));
  });

  it("seeds two rows, back row first, within the width", () => {
    const people = seedPeople(1440, hero);
    expect(new Set(people.map((p) => p.row))).toEqual(new Set([0, 1]));
    expect(people[0].row).toBe(1);
    expect(people.at(-1)!.row).toBe(0);
    expect(people.find((p) => p.row === 0)!.s).toBeCloseTo(0.62);
    expect(people.find((p) => p.row === 1)!.s).toBeCloseTo(0.62 * 0.78);
    for (const p of people) {
      expect(p.x).toBeGreaterThan(-100);
      expect(p.x).toBeLessThan(1440 + 100);
    }
  });
});

describe("togetherGlow", () => {
  it("is 0.08 calm and 0.33 at full heat", () => {
    expect(togetherGlow(0)).toBe("rgba(255,74,43,0.08)");
    expect(togetherGlow(1)).toBe("rgba(255,74,43,0.33)");
  });
  it("grows with the heat", () => {
    const alpha = (h: number) => Number(togetherGlow(h).match(/,([\d.]+)\)$/)![1]);
    expect(alpha(0.5)).toBeCloseTo(0.205, 10);
    expect(alpha(0.5)).toBeGreaterThan(alpha(0));
    expect(alpha(1)).toBeGreaterThan(alpha(0.5));
  });
});

describe("crowdFrameParams at the Together scene's heats", () => {
  it("heat 0 raises phones to 0.55 and bobs 2 px; heat 1 raises them fully, doubles the glow and bobs 8 px", () => {
    const calm = crowdFrameParams(0, 0, false);
    expect(calm.raise).toBeCloseTo(0.55, 10);
    expect(Math.max(...times.map((t) => Math.abs(crowdFrameParams(0, t, false).bobPx)))).toBeCloseTo(2, 1);
    const hot = crowdFrameParams(1, 0, true);
    expect(hot).toEqual({ raise: 1, bobPx: 0, glowRadiusScale: 2 });
    expect(Math.max(...times.map((t) => Math.abs(crowdFrameParams(1, t, false).bobPx)))).toBeCloseTo(8, 1);
  });
});
