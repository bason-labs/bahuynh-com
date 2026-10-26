import { describe, expect, it } from "vitest";
import { sungClamped, sungCount } from "./lyric";

describe("sungCount", () => {
  it.each([
    [0, 0],
    [329, 0],
    [330, 1],
    [4290, 13],
    [4620, 0],
    [4950, 1],
  ])("at %i ms with 13 words and 330 ms steps, %i are sung", (elapsed, expected) => {
    expect(sungCount(elapsed, 13, 330)).toBe(expected);
  });
});

describe("sungClamped", () => {
  it.each([
    [0, 0],
    [379, 0],
    [380, 1],
    [2659, 6],
    [2660, 7],
    [5000, 7],
  ])("at %i ms with 7 words and 380 ms steps, %i are sung and the line stays", (elapsed, expected) => {
    expect(sungClamped(elapsed, 7, 380)).toBe(expected);
  });
});
