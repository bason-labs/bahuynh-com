import { describe, expect, it } from "vitest";
import { decayHeat, raiseHeat } from "./heat";

describe("raiseHeat", () => {
  it("adds 0.3 per reaction and caps at 1: four reactions read 0.3, 0.6, 0.9, 1", () => {
    const steps: number[] = [];
    let h = 0;
    for (let i = 0; i < 4; i++) steps.push((h = raiseHeat(h)));
    expect(steps[0]).toBeCloseTo(0.3, 10);
    expect(steps[1]).toBeCloseTo(0.6, 10);
    expect(steps[2]).toBeCloseTo(0.9, 10);
    expect(steps[3]).toBe(1);
    expect(raiseHeat(1)).toBe(1);
  });
});

describe("decayHeat", () => {
  it("falls 0.004 per frame by default", () => {
    expect(decayHeat(1)).toBeCloseTo(0.996, 10);
  });
  it("goes from 1 to 0 over 250 frames and is about 0.5 after 125", () => {
    expect(decayHeat(1, 250)).toBeCloseTo(0, 10);
    expect(decayHeat(1, 125)).toBeCloseTo(0.5, 10);
  });
  it("never goes below 0, however many frames", () => {
    expect(decayHeat(0.1, 1000)).toBe(0);
    expect(decayHeat(0)).toBe(0);
  });
  it("takes fractional frames, so elapsed time x 60 cools alike at any refresh rate", () => {
    expect(decayHeat(1, 2.5)).toBeCloseTo(0.99, 10);
  });
});
