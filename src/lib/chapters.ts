/** Start second of each of the six film chapters. */
export const CHAPTER_STARTS = [0, 6, 12, 18, 24, 30] as const;
export const FILM_DURATION = 36;

/** `M:SS` label of a chapter start. */
export function formatChapterTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/** Index of the chapter that contains second `t`, given the chapters' start seconds. */
export function chapterIndexAt(t: number, starts: readonly number[]): number {
  return starts.filter((start) => start <= t).length - 1;
}

/** First chapter start after `t`, else 0 (wraps to the beginning). */
export function nextStart(t: number, starts: readonly number[]): number {
  return starts.find((start) => start > t) ?? 0;
}

/** Latest chapter start more than 1 s before `t`, else 0. */
export function prevStart(t: number, starts: readonly number[]): number {
  return [...starts].reverse().find((start) => start < t - 1) ?? 0;
}
