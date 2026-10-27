"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { useReducedMotion } from "@/components/site/islands/useReducedMotion";
import { crowdFrameParams, seedPeople, type Person } from "@/lib/crowd";
import { PALETTE, withAlpha } from "@/lib/palette";
import { makeSparks, stepSpark, type Spark } from "@/lib/sparks";

export type CrowdColors = {
  person: (row: number) => string;
  /** `ph` is the person's phase offset, for crowds that colour phones per person. */
  phone: (row: number, alpha: number, ph: number) => string;
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
  ref?: Ref<CrowdHandle>;
};

export type CrowdHandle = {
  /** Light sparks from (x, y) in canvas pixels. */
  burst: (x: number, y: number, n?: number) => void;
  /** Draws one frame now, for callers that change the heat while no loop runs. */
  redraw: () => void;
};

/** How long a still burst stays on screen when motion is reduced. */
const STILL_BURST_MS = 2300;

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
  const core = colors.phone(p.row, 0.5 + heat * 0.4, p.ph);
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
  ctx.fillStyle = colors.phone(p.row, 0.95, p.ph);
  ctx.fillRect(px - 5 * s, py - 8 * s, 10 * s, 16 * s);
}

/** Backlit silhouettes holding phone lights. Decorative: hidden from assistive tech and never takes pointer events. */
export function CrowdCanvas({ rows, gap, scale, rowLift, colors, heat, glow, className, ref }: CrowdCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparks = useRef<Spark[]>([]);
  const redraw = useRef<() => void>(() => {});
  const stillTimers = useRef(new Set<number>());
  const start = useRef<number | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current!;
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
      if (!reduced) sparks.current = sparks.current.filter((s) => s.life > 0);
      for (const s of sparks.current) {
        if (!reduced) stepSpark(s);
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
        g.addColorStop(0, withAlpha(s.color, Math.max(s.life, 0)));
        g.addColorStop(1, PALETTE.clear);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 7);
        ctx.fill();
      }
      canvas.dataset.sparks = String(sparks.current.length);
    };
    redraw.current = () => draw(performance.now());
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
      redraw.current = () => {};
    };
  }, [rows, gap, scale, rowLift, colors, heat, glow, reduced]);

  useEffect(() => {
    const timers = stillTimers.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      redraw: () => redraw.current(),
      burst(x, y, n = 26) {
        const batch = makeSparks(x, y, n, Math.random);
        sparks.current.push(...batch);
        canvasRef.current!.dataset.sparks = String(sparks.current.length);
        if (!reduced) return;
        // Motion is reduced: no loop runs, so draw the burst once where it was tapped and clear it later.
        redraw.current();
        const timer = window.setTimeout(() => {
          stillTimers.current.delete(timer);
          sparks.current = sparks.current.filter((s) => !batch.includes(s));
          redraw.current();
        }, STILL_BURST_MS);
        stillTimers.current.add(timer);
      },
    }),
    [reduced],
  );

  return <canvas ref={canvasRef} className={className} aria-hidden="true" data-heat="0.00" data-sparks="0" />;
}
