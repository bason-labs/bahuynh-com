/** Songs on the reel, and how many times the list repeats in the rows. */
export const SONG_COUNT = 8;
export const REEL_REPEATS = 8;

/** The winner for a draw in [0, 1): every song has the same chance. */
export function pickSong(random: number, n: number = SONG_COUNT): number {
  return Math.floor(random * n);
}

/** The row the spin ends on: near the end of the repeated list, holding song `pick`. */
export function reelTarget(pick: number, repeats: number, n: number): number {
  return n * (repeats - 2) + pick;
}

/** An equivalent row (same song) near the top, where the reel jumps before it spins. */
export function reelStart(target: number, n: number): number {
  return (target % (n * 2)) + n;
}

/** Rows to move up so row `i` sits in the middle of the three visible rows. */
export function rowShift(i: number): number {
  return i - 1;
}

/** The queue with `row` on top, keeping at most `max` rows. */
export function pushQueue<T>(rows: readonly T[], row: T, max = 3): T[] {
  return [row, ...rows].slice(0, max);
}
