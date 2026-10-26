import { describe, expect, it } from "vitest";
import { pickSong, REEL_REPEATS, reelStart, reelTarget, rowShift, SONG_COUNT } from "./reel";

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("pickSong", () => {
  it("maps the draw to floor(random * 8)", () => {
    expect(pickSong(0)).toBe(0);
    expect(pickSong(0.124)).toBe(0);
    expect(pickSong(0.125)).toBe(1);
    expect(pickSong(0.999999)).toBe(7);
  });

  it("lands on each of the eight songs in 200 seeded spins", () => {
    const next = seeded(7);
    const seen = new Set(Array.from({ length: 200 }, () => pickSong(next())));
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("lands on each of the eight songs in 200 spins of Math.random", () => {
    const seen = new Set(Array.from({ length: 200 }, () => pickSong(Math.random())));
    expect(seen.size).toBe(SONG_COUNT);
  });
});

describe("reelTarget and reelStart", () => {
  it("ends six lists down on the picked song", () => {
    expect(reelTarget(0, REEL_REPEATS, SONG_COUNT)).toBe(48);
    expect(reelTarget(5, REEL_REPEATS, SONG_COUNT)).toBe(53);
  });

  it("starts on an equivalent row in the second list, so the same song can win twice", () => {
    for (let pick = 0; pick < SONG_COUNT; pick++) {
      const target = reelTarget(pick, REEL_REPEATS, SONG_COUNT);
      const start = reelStart(target, SONG_COUNT);
      expect(start % SONG_COUNT).toBe(pick);
      expect(start).toBeGreaterThanOrEqual(SONG_COUNT);
      expect(start).toBeLessThan(target);
    }
  });

  it("shifts so row i is the middle one", () => {
    expect(rowShift(1)).toBe(0);
    expect(rowShift(48)).toBe(47);
  });
});
