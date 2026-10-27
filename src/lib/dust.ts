// Pure dust maths for the hero mic scene (AD-10): no three, no React, no DOM.
// Positions are a flat [x, y, z, ...] array in scene units; "frame" means one rendered frame.

export const DUST_COUNT = 500;
export const DUST_RISE_PER_FRAME = 0.0025;
const DUST_TOP = 5;
const DUST_BOTTOM = -3;

/** A particle that rises past the top re-enters at the bottom. */
export function wrapDust(y: number): number {
  return y > DUST_TOP ? DUST_BOTTOM : y;
}

/** Spreads `count` particles through the light; `random` returns values in [0, 1). */
export function seedDust(count: number, random: () => number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() - 0.5) * 7;
    positions[i * 3 + 1] = (random() - 0.3) * 8;
    positions[i * 3 + 2] = (random() - 0.5) * 5;
  }
  return positions;
}

/** Moves every particle up by one frame's rise, wrapping at the top. */
export function stepDust(positions: Float32Array): void {
  for (let i = 1; i < positions.length; i += 3) {
    positions[i] = wrapDust(positions[i] + DUST_RISE_PER_FRAME);
  }
}
