/** Canvas colours mirroring the design tokens; the only place canvas colours live (AD-7). */
export const PALETTE = {
  inkFront: "#0b0b0c",
  inkBack: "#121214",
  warm: "#ffe9c4",
  cool: "#bfe6ff",
  red: "#ff4a2b",
  glowIdle: "rgba(255,233,196,.05)",
  glowLive: "rgba(255,74,43,.16)",
  clear: "rgba(0,0,0,0)",
} as const;

/** `#rrggbb` as an `rgba(...)` string with the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}
