/** Words sung after `elapsedMs`: one more every `stepMs`, then none again after the last word. */
export function sungCount(elapsedMs: number, wordCount: number, stepMs: number): number {
  return Math.floor(elapsedMs / stepMs) % (wordCount + 1);
}

/** Like `sungCount` for a line that fills once and stays: it holds at `wordCount` instead of wrapping. */
export function sungClamped(elapsedMs: number, wordCount: number, stepMs: number): number {
  return elapsedMs >= wordCount * stepMs ? wordCount : sungCount(elapsedMs, wordCount, stepMs);
}
