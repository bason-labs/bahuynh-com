import { describe, expect, it } from "vitest";
import { CHAPTER_STARTS, chapterAt, FILM_DURATION, formatChapterTime } from "./chapters";

describe("chapters", () => {
  it("has six chapters inside the 36 s film", () => {
    expect(CHAPTER_STARTS).toEqual([0, 6, 12, 18, 24, 30]);
    expect(FILM_DURATION).toBe(36);
  });

  it.each([
    [0, "0:00"],
    [6, "0:06"],
    [12, "0:12"],
    [18, "0:18"],
    [24, "0:24"],
    [30, "0:30"],
    [65, "1:05"],
  ])("labels second %s as %s", (seconds, expected) => {
    expect(formatChapterTime(seconds)).toBe(expected);
  });

  it.each([
    [0, 0],
    [5.99, 0],
    [6, 1],
    [14.3, 2],
    [35.9, 5],
  ])("second %s is in chapter %i", (t, expected) => {
    expect(chapterAt(t)).toBe(expected);
  });
});
