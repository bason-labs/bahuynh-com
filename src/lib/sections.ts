/** Ids of the six landing sections, top to bottom. */
export const SECTION_IDS = ["top", "xem", "quay", "cungnhau", "tinhnang", "batdau"] as const;

/** Index of the last section whose top edge is above half the viewport height (0 when none is). */
export function activeSection(tops: readonly number[], viewportHeight: number): number {
  let active = 0;
  tops.forEach((top, index) => {
    if (top < viewportHeight * 0.5) active = index;
  });
  return active;
}

/** The navigation bar has five links; the last section (chapter 05) keeps the fifth one active. */
export function navIndex(sectionIndex: number): number {
  return Math.min(sectionIndex, 4);
}

/** Top offset in px of the 2 px ruler marker for a scroll position. */
export function markerTop(scrollY: number, maxScroll: number, railHeight: number): number {
  const progress = maxScroll > 0 ? scrollY / maxScroll : 0;
  return progress * (railHeight - 2);
}
