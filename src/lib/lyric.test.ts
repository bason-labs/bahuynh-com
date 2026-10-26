import { describe, expect, it } from "vitest";
import { sungCount } from "./lyric";

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
