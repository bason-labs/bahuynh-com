export type MotionChoice = "reduce" | "run";

export const MOTION_KEY = "bahuynh.motion";

export function parseStored(value: unknown): MotionChoice | null {
  return value === "reduce" || value === "run" ? value : null;
}

/** The stored choice wins over the system setting; `pressed` is the toggle's state. */
export function resolveMotion({ system, stored }: { system: boolean; stored: MotionChoice | null }): {
  reduce: boolean;
  pressed: boolean;
} {
  const reduce = stored === null ? system : stored === "reduce";
  return { reduce, pressed: reduce };
}
