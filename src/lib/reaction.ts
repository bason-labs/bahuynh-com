export const COUNTER_START = 1248;
/** A reaction word is removed this long after it was created. */
export const WORD_LIFETIME_MS = 2300;

/** How much one reaction raises the counter: 1, 2 or 3. */
export function increment(random: number): number {
  return 1 + Math.floor(random * 3);
}

/** A point inside 20 to 80 % of the width and 35 to 65 % of the height. */
export function pointFor(random1: number, random2: number, width: number, height: number) {
  return { x: width * (0.2 + random1 * 0.6), y: height * (0.35 + random2 * 0.3) };
}

export function formatCount(count: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(count);
}
