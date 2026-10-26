import { PALETTE } from "./palette";

export type SeedOptions = { rows: number; gap: number; scale: number };

export type Person = {
  x: number;
  row: number;
  /** Scale of this person's row. */
  s: number;
  /** Phase offset of the bob and the sway. */
  ph: number;
  phone: boolean;
  /** Which side the raised arm is on: 1 right, -1 left. */
  arm: 1 | -1;
  /** Height factor, 0.85 to 1.1. */
  h: number;
};

/** Deterministic crowd: back rows first, so front rows paint over them. */
export function seedPeople(width: number, { rows, gap, scale }: SeedOptions): Person[] {
  const people: Person[] = [];
  let id = 0;
  for (let row = 0; row < rows; row++) {
    const n = Math.ceil(width / (gap * (1 + row * 0.25))) + 2;
    const s = scale * (1 - row * 0.22);
    for (let i = 0; i < n; i++) {
      people.push({
        x: ((i + (row % 2) * 0.5) * width) / (n - 1) + Math.sin(id * 12.9) * 14,
        row,
        s,
        ph: id * 1.7,
        phone: Math.sin(id * 7.3) > -0.15,
        arm: Math.sin(id * 3.1) > 0 ? 1 : -1,
        h: 0.85 + ((id * 37) % 10) / 40,
      });
      id++;
    }
  }
  return people.sort((a, b) => b.row - a.row);
}

export type CrowdFrameParams = {
  /** How far the phone is raised, 0 to 1 plus the sway. */
  raise: number;
  /** Vertical bob in px before the row scale; signed. */
  bobPx: number;
  /** Multiplier on the phone glow radius. */
  glowRadiusScale: number;
};

/** One person's frame values at `heat` 0 to 1, time `t` in seconds and phase `ph`. Bob and sway stop when `reduce`. */
export function crowdFrameParams(heat: number, t: number, reduce: boolean, ph = 0): CrowdFrameParams {
  return {
    raise: 0.55 + 0.45 * heat + (reduce ? 0 : Math.sin(t * 1.1 + ph) * 0.08),
    bobPx: reduce ? 0 : Math.sin(t * 1.6 + ph) * (2 + 6 * heat),
    glowRadiusScale: 1 + heat,
  };
}

/** Stage glow behind the crowd: warm while idle, red while live. */
export function heroGlow(heat: number): string {
  return heat > 0 ? PALETTE.glowLive : PALETTE.glowIdle;
}

/** Together scene glow behind the crowd: faint red when calm, stronger with the heat. */
export function togetherGlow(heat: number): string {
  return `rgba(255,74,43,${0.08 + heat * 0.25})`;
}
