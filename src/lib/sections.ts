import type { Locale } from "./i18n";

/** Ids of the six landing sections, top to bottom, in each page's own language. */
const SECTION_IDS = {
  vi: ["top", "xem", "quay", "cungnhau", "tinhnang", "batdau"],
  en: ["top", "watch", "spin", "together", "features", "start"],
} as const satisfies Record<Locale, readonly string[]>;

export function sectionIds(locale: Locale): readonly string[] {
  return SECTION_IDS[locale];
}

/** Id of section `index` (0 = hero, 5 = chapter 05) on the page of `locale`. */
export function sectionId(locale: Locale, index: number): string {
  return SECTION_IDS[locale][index];
}

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

/** Where the screen is: the section in view and how far the viewport's top is through it, as a share of its height. */
export type ScrollPosition = { index: number; fraction: number };

export function scrollPosition(tops: readonly number[], heights: readonly number[], viewportHeight: number): ScrollPosition {
  const index = activeSection(tops, viewportHeight);
  const height = heights[index];
  return { index, fraction: height > 0 ? -tops[index] / height : 0 };
}

/** Scroll offset that puts the viewport's top at `position` on a page whose section starts at `sectionTop` (page px). */
export function restoreTop(position: ScrollPosition, sectionTop: number, sectionHeight: number): number {
  return Math.max(0, Math.round(sectionTop + position.fraction * sectionHeight));
}

/** A stored position, or null when the value is not one. */
export function parsePosition(value: unknown): ScrollPosition | null {
  if (typeof value !== "object" || value === null) return null;
  const { index, fraction } = value as Record<string, unknown>;
  if (!Number.isInteger(index) || (index as number) < 0 || (index as number) > 5) return null;
  if (typeof fraction !== "number" || !Number.isFinite(fraction)) return null;
  return { index: index as number, fraction };
}
