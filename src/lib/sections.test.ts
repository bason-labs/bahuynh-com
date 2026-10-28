import { describe, expect, it } from "vitest";
import { activeSection, markerTop, navIndex, parsePosition, restoreTop, scrollPosition, sectionId, sectionIds } from "./sections";

describe("sections", () => {
  it("lists the six section ids in each language", () => {
    expect(sectionIds("vi")).toEqual(["top", "xem", "quay", "cungnhau", "tinhnang", "batdau"]);
    expect(sectionIds("en")).toEqual(["top", "watch", "spin", "together", "features", "start"]);
  });

  it("maps a section to the same section on the other page", () => {
    expect(sectionId("en", 2)).toBe("spin");
    expect(sectionId("vi", 5)).toBe("batdau");
    expect(sectionId("en", 3)).toBe("together");
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

  it("reads how far through the section in view the screen is", () => {
    // Section 3 starts 400 px above the viewport and is 1000 px tall: 40 % through.
    expect(scrollPosition([-3000, -2000, -1200, -400, 600, 1600], [1000, 800, 800, 1000, 1000, 600], 900)).toEqual({ index: 3, fraction: 0.4 });
    expect(scrollPosition([0, 900, 1700, 2500, 3500, 4500], [900, 800, 800, 1000, 1000, 600], 900)).toEqual({ index: 0, fraction: -0 });
    // The section's top is below the viewport's top but above its middle: a negative share.
    expect(scrollPosition([-1000, -100, 300, 1100, 2000, 3000], [900, 400, 800, 900, 1000, 600], 900).index).toBe(2);
    expect(scrollPosition([-1000, -100, 300, 1100, 2000, 3000], [900, 400, 800, 900, 1000, 600], 900).fraction).toBeCloseTo(-0.375);
  });

  it("puts the screen at the same share of the matching section", () => {
    expect(restoreTop({ index: 3, fraction: 0.4 }, 2600, 1100)).toBe(3040);
    expect(restoreTop({ index: 2, fraction: -0.375 }, 1700, 800)).toBe(1400);
    expect(restoreTop({ index: 0, fraction: 0 }, 0, 900)).toBe(0);
    expect(restoreTop({ index: 0, fraction: -0.2 }, 0, 900)).toBe(0);
  });

  it("accepts only a well-formed stored position", () => {
    expect(parsePosition({ index: 3, fraction: 0.4 })).toEqual({ index: 3, fraction: 0.4 });
    expect(parsePosition({ index: 6, fraction: 0.4 })).toBeNull();
    expect(parsePosition({ index: 1.5, fraction: 0 })).toBeNull();
    expect(parsePosition({ index: 2, fraction: "0.4" })).toBeNull();
    expect(parsePosition({ index: 2, fraction: Number.NaN })).toBeNull();
    expect(parsePosition(null)).toBeNull();
    expect(parsePosition("x")).toBeNull();
  });
});
