import { PALETTE } from "./palette";

export type Spark = { x: number; y: number; vx: number; vy: number; r: number; life: number; color: string };

/** `n` sparks from (x, y): about 35 % red, the rest warm and cool. */
export function makeSparks(x: number, y: number, n: number, random: () => number): Spark[] {
  return Array.from({ length: n }, () => {
    const angle = random() * Math.PI * 2;
    const speed = 1 + random() * 3;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      r: 6 + random() * 16,
      life: 1,
      color: random() < 0.35 ? PALETTE.red : random() < 0.5 ? PALETTE.warm : PALETTE.cool,
    };
  });
}

/** One frame: drift by the velocity, curve upward a little and lose life; gone after about 83 frames. */
export function stepSpark(s: Spark): void {
  s.x += s.vx;
  s.y += s.vy;
  s.vy -= 0.02;
  s.life -= 0.012;
}
