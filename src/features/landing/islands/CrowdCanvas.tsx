"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/components/site/islands/useReducedMotion";
import { crowdFrameParams, seedPeople, type Person } from "@/lib/crowd";
import { PALETTE } from "@/lib/palette";

export type CrowdColors = {
  person: (row: number) => string;
  phone: (row: number, alpha: number) => string;
};

export type CrowdCanvasProps = {
  rows: number;
  gap: number;
  scale: number;
  rowLift: number;
  colors: CrowdColors;
  /** 0 to 1, or a getter read every frame. */
  heat: number | (() => number);
  glow: (heat: number) => string;
  className?: string;
};

type Ctx = CanvasRenderingContext2D;

/** Phone glow gradients drawn at the origin, keyed by colour and radius, so a frame allocates none. */
type GlowCache = Map<string, CanvasGradient>;

function drawPerson(
  ctx: Ctx,
  p: Person,
  base: number,
  t: number,
  heat: number,
  reduce: boolean,
  colors: CrowdColors,
  glows: GlowCache,
) {
  const { raise, bobPx, glowRadiusScale } = crowdFrameParams(heat, t, reduce, p.ph);
  const s = p.s * p.h;
  const y = base + bobPx * p.s;
  const hx = p.x;
  const hy = y - 118 * s;
  ctx.fillStyle = colors.person(p.row);
  ctx.beginPath();
  ctx.ellipse(hx, hy, 15 * s, 18 * s, 0, 0, 7);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx - 46 * s, y);
  ctx.bezierCurveTo(hx - 46 * s, hy + 40 * s, hx - 30 * s, hy + 24 * s, hx, hy + 24 * s);
  ctx.bezierCurveTo(hx + 30 * s, hy + 24 * s, hx + 46 * s, hy + 40 * s, hx + 46 * s, y);
  ctx.fill();
  if (!p.phone) return;
  const ax = hx + p.arm * 34 * s;
  const ay = hy + 34 * s;
  const px = ax + p.arm * (8 + 12 * raise) * s;
  const py = ay - 62 * raise * s - 10 * s;
  ctx.strokeStyle = colors.person(p.row);
  ctx.lineWidth = 11 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(px, py + 8 * s);
  ctx.stroke();
  const reach = 60 * s * glowRadiusScale;
  const core = colors.phone(p.row, 0.5 + heat * 0.4);
  const radius = 46 * s * glowRadiusScale;
  const key = `${core}|${radius}`;
  let g = glows.get(key);
  if (!g) {
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    g.addColorStop(0, core);
    g.addColorStop(1, PALETTE.clear);
    glows.set(key, g);
  }
  ctx.save();
  ctx.translate(px, py);
  ctx.fillStyle = g;
  ctx.fillRect(-reach, -reach, reach * 2, reach * 2);
  ctx.restore();
  ctx.fillStyle = colors.phone(p.row, 0.95);
  ctx.fillRect(px - 5 * s, py - 8 * s, 10 * s, 16 * s);
}

/** Backlit silhouettes holding phone lights. Decorative: hidden from assistive tech and never takes pointer events. */
export function CrowdCanvas({ rows, gap, scale, rowLift, colors, heat, glow, className }: CrowdCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const start = useRef<number | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    start.current ??= performance.now();
    const t0 = start.current;
    let people: Person[] = [];
    const glows: GlowCache = new Map();
    let raf = 0;
    let onScreen = true;

    const draw = (now: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const level = typeof heat === "function" ? heat() : heat;
      const t = reduced ? 0 : (now - t0) / 1000;
      canvas.dataset.heat = level.toFixed(2);
      ctx.clearRect(0, 0, w, h);
      const wash = ctx.createLinearGradient(0, h, 0, h * 0.2);
      wash.addColorStop(0, glow(level));
      wash.addColorStop(1, PALETTE.clear);
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, w, h);
      for (const p of people) drawPerson(ctx, p, h + 4 - p.row * rowLift, t, level, reduced, colors, glows);
    };
    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    /** Animate only while the canvas is on screen and the tab is visible; otherwise draw nothing. */
    const sync = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (!onScreen || document.hidden) return;
      draw(performance.now());
      if (!reduced) raf = requestAnimationFrame(loop);
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      glows.clear();
      people = seedPeople(canvas.clientWidth, { rows, gap, scale });
      draw(performance.now());
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    visibility.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    resize();
    if (!reduced) raf = requestAnimationFrame(loop);
    return () => {
      observer.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", sync);
      cancelAnimationFrame(raf);
    };
  }, [rows, gap, scale, rowLift, colors, heat, glow, reduced]);

  return <canvas ref={ref} className={className} aria-hidden="true" data-heat="0.00" />;
}
