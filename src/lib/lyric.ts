/** Words sung after `elapsedMs`: one more every `stepMs`, then none again after the last word. */
export function sungCount(elapsedMs: number, wordCount: number, stepMs: number): number {
  return Math.floor(elapsedMs / stepMs) % (wordCount + 1);
}
