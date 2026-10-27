"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/components/site/islands/useReducedMotion";
import type { MicHandle } from "../mic/scene";
import { useHeroStage } from "./HeroStage";

const IDLE_TIMEOUT_MS = 1000;

function afterFirstContentfulPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof PerformanceObserver === "undefined") return resolve();
    const observer = new PerformanceObserver((list) => {
      if (list.getEntries().some((e) => e.name === "first-contentful-paint")) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe({ type: "paint", buffered: true });
  });
}

function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    // Safari has no requestIdleCallback.
    if (window.requestIdleCallback) window.requestIdleCallback(() => resolve(), { timeout: IDLE_TIMEOUT_MS });
    else setTimeout(resolve, 200);
  });
}

function whenIntersecting(element: Element): Promise<void> {
  return new Promise((resolve) => {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(element);
  });
}

/** A throwaway canvas: the 3D code is requested only when a WebGL context can be created. */
function canCreateWebGl(): boolean {
  const probe = document.createElement("canvas");
  const context = probe.getContext("webgl2") ?? probe.getContext("webgl");
  context?.getExtension("WEBGL_lose_context")?.loseContext();
  return context !== null;
}

/**
 * Loads the 3D mic after first paint, once the hero is on screen and WebGL exists. Any failure
 * leaves the server-rendered CSS mic in place (REQ-LAND-015); nothing is rethrown or shown.
 */
export function MicCanvas({ className }: { className: string }) {
  const { live, setGl, setGrillePoint, setMic } = useHeroStage();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLCanvasElement>(null);
  const handle = useRef<MicHandle | null>(null);
  const latest = useRef({ live, reduced });

  useEffect(() => {
    latest.current.live = live;
    handle.current?.setLive(live);
  }, [live]);

  useEffect(() => {
    latest.current.reduced = reduced;
    handle.current?.setReduced(reduced);
  }, [reduced]);

  useEffect(() => {
    const canvas = ref.current!;
    let cancelled = false;
    const start = async () => {
      await afterFirstContentfulPaint();
      // The hero's text is the largest paint: let its fonts land before the 3D code competes for the network (REQ-LAND-045.AC-3).
      await document.fonts.ready;
      await whenIdle();
      await whenIntersecting(canvas);
      if (cancelled) return;
      try {
        if (!canCreateWebGl()) throw new Error("WebGL is unavailable");
        const { startMic } = await import("../mic/scene");
        if (cancelled) return;
        const started = startMic(canvas, {
          reduced: latest.current.reduced,
          onFirstFrame: () => setGl("3d"),
        });
        started.setLive(latest.current.live);
        setGrillePoint(started.grillePoint);
        setMic(started);
        handle.current = started;
      } catch {
        if (!cancelled) setGl("fallback");
      }
    };
    void start();
    return () => {
      cancelled = true;
      handle.current?.stop();
      handle.current = null;
      setGrillePoint(null);
      setMic(null);
    };
  }, [setGl, setGrillePoint, setMic]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
