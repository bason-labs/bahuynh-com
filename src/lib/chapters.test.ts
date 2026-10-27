import { describe, expect, it } from "vitest";
import { CHAPTER_STARTS, chapterIndexAt, FILM_DURATION, formatChapterTime, nextStart, prevStart } from "./chapters";

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
    expect(chapterIndexAt(t, CHAPTER_STARTS)).toBe(expected);
  });

  it.each([
    [0, 0],
    [4.9, 0],
    [5, 1],
    [13.9, 1],
    [14, 2],
    [20, 2],
  ])("second %s is in chapter %i of [0, 5, 14]", (t, expected) => {
    expect(chapterIndexAt(t, [0, 5, 14])).toBe(expected);
  });

  it.each([
    [0, 6],
    [5.99, 6],
    [6, 12],
    [31, 0],
    [36, 0],
  ])("nextStart(%s) is %s", (t, expected) => {
    expect(nextStart(t, CHAPTER_STARTS)).toBe(expected);
  });

  it.each([
    [7.5, 6],
    [6.5, 0],
    [0, 0],
    [6, 0],
    [6.9, 0],
    [12, 6],
  ])("prevStart(%s) is %s", (t, expected) => {
    expect(prevStart(t, CHAPTER_STARTS)).toBe(expected);
  });

  it("works on a three-chapter list [0, 5, 14]", () => {
    const starts = [0, 5, 14];
    expect([nextStart(0, starts), nextStart(5, starts), nextStart(14, starts)]).toEqual([5, 14, 0]);
    expect([prevStart(14, starts), prevStart(6.5, starts), prevStart(5.5, starts), prevStart(0, starts)]).toEqual([
      5, 5, 0, 0,
    ]);
  });
});
