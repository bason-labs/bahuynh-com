import { describe, expect, it } from "vitest";
import { formatTimecode } from "./timecode";

describe("formatTimecode", () => {
  it.each([
    [0, "0:00:00"],
    [8.9, "0:00:08"],
    [14.3, "0:00:14"],
    [36, "0:00:36"],
    [59.99, "0:00:59"],
    [61, "0:01:01"],
    [3600, "1:00:00"],
  ])("%s s reads %s", (seconds, expected) => {
    expect(formatTimecode(seconds)).toBe(expected);
  });
});
