/** Heat each reaction adds, and what it falls by per 60 Hz frame. */
const RAISE = 0.3;
const DECAY_PER_FRAME = 0.004;

/** The heat after one reaction, capped at 1. */
export function raiseHeat(heat: number): number {
  return Math.min(1, heat + RAISE);
}

/** The heat after `frames` frames of cooling at 60 Hz, floored at 0. */
export function decayHeat(heat: number, frames = 1): number {
  return Math.max(0, heat - DECAY_PER_FRAME * frames);
}
