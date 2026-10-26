// Pure pose maths for the hero mic (AD-10): no three, no React, no DOM.
// Angles are radians, heights are scene units, "frame" means one 60 fps frame.

export const IDLE_SPIN_PER_FRAME = 0.0025;

const FOLLOW_YAW_MAX = 0.3;
const FOLLOW_PITCH_MAX = 0.175;
const FOLLOW_EASE = 0.06;
const DRAG_RAD_PER_PX = 0.01;
const VELOCITY_DECAY = 0.94;
const TAP_MAX_PX = 6;
const SCROLL_YAW = 1.4;
const SCROLL_PITCH = 0.25;
const SCROLL_LIFT = 1.6;
const NARROW_MAX_WIDTH = 560;

export type Pose = { yaw: number; pitch: number };
export type ScrollOffsets = { yaw: number; pitch: number; lift: number };
export type SceneParams = { cameraDistance: number; restHeight: number };
export type MotionFlags = {
  idleTurn: boolean;
  bob: boolean;
  dust: boolean;
  follow: boolean;
  scroll: boolean;
  drag: boolean;
};

export function idleBob(tSeconds: number): number {
  return 0.06 * Math.sin(0.8 * tSeconds);
}

/** nx, ny in [-1, 1] from the hero centre to its edge. */
export function followTarget(nx: number, ny: number): Pose {
  return { yaw: FOLLOW_YAW_MAX * nx, pitch: FOLLOW_PITCH_MAX * ny };
}

/** Moves 6 % of the remaining distance per frame; `frames` keeps it frame-rate independent. */
export function easeFollow(current: number, target: number, frames = 1): number {
  return current + (target - current) * (1 - Math.pow(1 - FOLLOW_EASE, frames));
}

export function dragDelta(dxCssPx: number): number {
  return DRAG_RAD_PER_PX * dxCssPx;
}

export function releaseVelocity(lastMoveDx: number): number {
  return DRAG_RAD_PER_PX * lastMoveDx;
}

export function decayVelocity(v: number, frames = 1): number {
  return v * Math.pow(VELOCITY_DECAY, frames);
}

export function isTap(totalDx: number): boolean {
  return Math.abs(totalDx) < TAP_MAX_PX;
}

export function scrollOffsets(scrollY: number, viewportHeight: number): ScrollOffsets {
  const p = Math.min(1, scrollY / viewportHeight);
  return { yaw: SCROLL_YAW * p, pitch: SCROLL_PITCH * p, lift: SCROLL_LIFT * p };
}

export function sceneParams(viewportWidth: number): SceneParams {
  return viewportWidth <= NARROW_MAX_WIDTH
    ? { cameraDistance: 23, restHeight: 2.35 }
    : { cameraDistance: 19, restHeight: 1.5 };
}

/** Reduced motion stops ambient motion; drag stays on (Q-0016-12). */
export function motionFlags(reduce: boolean): MotionFlags {
  return {
    idleTurn: !reduce,
    bob: !reduce,
    dust: !reduce,
    follow: !reduce,
    scroll: !reduce,
    drag: true,
  };
}
