import { describe, expect, it } from "vitest";
import { activeSection, markerTop, navIndex, SECTION_IDS } from "./sections";

describe("sections", () => {
  it("lists the six section ids", () => {
    expect(SECTION_IDS).toEqual(["top", "xem", "quay", "cungnhau", "tinhnang", "batdau"]);
  });

  it.each([
    [[-1200, -300, 360, 900, 1800, 2700], 900, 2],
    [[0, 700, 1500, 2300, 3100, 3900], 900, 0],
    [[-5000, -4000, -3000, -2000, -1000, -10], 900, 5],
    [[-1, 449, 450, 900, 1800, 2700], 900, 1],
  ])("activeSection(%j, %d) is %d", (tops, height, expected) => {
    expect(activeSection(tops, height)).toBe(expected);
  });

  it("keeps the fifth nav link for the last section", () => {
    expect([0, 1, 2, 3, 4, 5].map(navIndex)).toEqual([0, 1, 2, 3, 4, 4]);
  });

  it("places the marker from the scroll progress", () => {
    expect(markerTop(0, 4000, 844)).toBe(0);
    expect(markerTop(2000, 4000, 844)).toBe(421);
    expect(markerTop(4000, 4000, 844)).toBe(842);
    expect(markerTop(0, 0, 844)).toBe(0);
  });
});
