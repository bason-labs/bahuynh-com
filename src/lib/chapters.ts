/** Start second of each of the six film chapters. */
export const CHAPTER_STARTS = [0, 6, 12, 18, 24, 30] as const;
export const FILM_DURATION = 36;

/** `M:SS` label of a chapter start. */
export function formatChapterTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/** Index of the chapter that contains second `t`. */
export function chapterAt(t: number): number {
  return CHAPTER_STARTS.filter((start) => start <= t).length - 1;
}
