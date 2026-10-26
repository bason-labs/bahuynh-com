import { describe, expect, it } from "vitest";
import {
  IDLE_SPIN_PER_FRAME,
  decayVelocity,
  dragDelta,
  easeFollow,
  followTarget,
  idleBob,
  isTap,
  motionFlags,
  releaseVelocity,
  sceneParams,
  scrollOffsets,
} from "./micpose";

const run = (target: number, frames: number, start = 0) => {
  let v = start;
  for (let i = 0; i < frames; i++) v = easeFollow(v, target);
  return v;
};

describe("idle", () => {
  it("turns 0.15 rad in 60 frames", () => {
    expect(IDLE_SPIN_PER_FRAME * 60).toBeCloseTo(0.15, 5);
  });
  it("bobs +-0.06 with a 7.85 s period", () => {
    const step = 0.01;
    let max = -Infinity;
    let min = Infinity;
    const crossings: number[] = [];
    let prev = idleBob(0);
    for (let t = step; t <= 16; t += step) {
      const v = idleBob(t);
      max = Math.max(max, v);
      min = Math.min(min, v);
      if (prev < 0 && v >= 0) crossings.push(t);
      prev = v;
    }
    expect(max).toBeCloseTo(0.06, 3);
    expect(min).toBeCloseTo(-0.06, 3);
    expect(crossings.length).toBeGreaterThanOrEqual(2);
    expect(crossings[1] - crossings[0]).toBeGreaterThan(7.85 - 0.78);
    expect(crossings[1] - crossings[0]).toBeLessThan(7.85 + 0.78);
  });
});

describe("follow", () => {
  it("centre target is zero and stays zero", () => {
    expect(followTarget(0, 0)).toEqual({ yaw: 0, pitch: 0 });
    expect(Math.abs(run(0, 60))).toBeLessThan(0.01);
  });
  it("edges give +-0.3 yaw and the offset reaches them", () => {
    expect(followTarget(1, 0).yaw).toBeCloseTo(0.3, 10);
    expect(followTarget(-1, 0).yaw).toBeCloseTo(-0.3, 10);
    expect(Math.abs(run(0.3, 60) - 0.3)).toBeLessThan(0.02);
    expect(Math.abs(run(-0.3, 60) + 0.3)).toBeLessThan(0.02);
  });
  it("edges give +-0.175 pitch and the offset reaches them", () => {
    expect(followTarget(0, 1).pitch).toBeCloseTo(0.175, 10);
    expect(followTarget(0, -1).pitch).toBeCloseTo(-0.175, 10);
    expect(Math.abs(run(0.175, 60) - 0.175)).toBeLessThan(0.02);
    expect(Math.abs(run(-0.175, 60) + 0.175)).toBeLessThan(0.02);
  });
  it("covers 6 % of the remaining distance per frame, 90 % after 38 frames", () => {
    expect(easeFollow(0, 0.3)).toBeCloseTo(0.3 * 0.06, 10);
    expect(run(0.3, 38) / 0.3).toBeGreaterThanOrEqual(0.9);
  });
  it("is frame-rate independent", () => {
    expect(easeFollow(0, 1, 2)).toBeCloseTo(run(1, 2), 10);
  });
  it("holds the last target when the pointer leaves", () => {
    const settled = run(0.3, 200);
    expect(Math.abs(run(0.3, 60, settled) - settled)).toBeLessThan(1e-4);
  });
});

describe("drag", () => {
  it("turns 0.01 rad per px", () => {
    expect(dragDelta(100)).toBeCloseTo(1.0, 2);
    expect(dragDelta(-100)).toBeCloseTo(-1.0, 2);
  });
  it("release velocity decays to rest in 90 frames", () => {
    let v = releaseVelocity(20);
    expect(v).toBeCloseTo(0.2, 10);
    expect(decayVelocity(v)).toBeCloseTo(0.2 * 0.94, 10);
    for (let i = 0; i < 90; i++) v = decayVelocity(v);
    expect(v).toBeLessThan(0.001);
    expect(releaseVelocity(-20)).toBeCloseTo(-0.2, 10);
  });
  it("tells a tap from a drag", () => {
    expect(isTap(5.9)).toBe(true);
    expect(isTap(6)).toBe(false);
    expect(isTap(-6)).toBe(false);
  });
});

describe("scroll", () => {
  it("maps scroll to offsets and clamps at one viewport", () => {
    expect(scrollOffsets(0, 900)).toEqual({ yaw: 0, pitch: 0, lift: 0 });
    const mid = scrollOffsets(450, 900);
    expect(mid.yaw).toBeCloseTo(0.7, 5);
    expect(mid.pitch).toBeCloseTo(0.125, 5);
    expect(mid.lift).toBeCloseTo(0.8, 5);
    for (const y of [900, 1200, 5000]) {
      expect(scrollOffsets(y, 900)).toEqual({ yaw: 1.4, pitch: 0.25, lift: 1.6 });
    }
    expect(scrollOffsets(0, 900)).toEqual({ yaw: 0, pitch: 0, lift: 0 });
  });
});

describe("sceneParams", () => {
  it("switches at 560 px", () => {
    expect(sceneParams(375)).toEqual({ cameraDistance: 23, restHeight: 2.35 });
    expect(sceneParams(560)).toEqual({ cameraDistance: 23, restHeight: 2.35 });
    expect(sceneParams(561)).toEqual({ cameraDistance: 19, restHeight: 1.5 });
    expect(sceneParams(1440)).toEqual({ cameraDistance: 19, restHeight: 1.5 });
  });
});

describe("motionFlags", () => {
  it("reduced motion keeps only drag", () => {
    expect(motionFlags(true)).toEqual({
      idleTurn: false,
      bob: false,
      dust: false,
      follow: false,
      scroll: false,
      drag: true,
    });
  });
  it("normal motion leaves all on", () => {
    expect(Object.values(motionFlags(false)).every(Boolean)).toBe(true);
  });
});
