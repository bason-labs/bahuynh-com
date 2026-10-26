"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useReducedMotion } from "@/components/site/islands/useReducedMotion";
import { heroGlow } from "@/lib/crowd";
import { PALETTE, withAlpha } from "@/lib/palette";
import styles from "../sections/hero.module.css";
import { CrowdCanvas, type CrowdColors } from "./CrowdCanvas";

export type Point = { x: number; y: number };

type HeroStageValue = {
  live: boolean;
  /** Ring origin in hero coordinates; the 3D mic replaces it with its projected grille. */
  getGrillePoint: MutableRefObject<() => Point>;
};

const HeroStageContext = createContext<HeroStageValue | null>(null);

export function useHeroStage(): HeroStageValue {
  const value = useContext(HeroStageContext);
  if (!value) throw new Error("useHeroStage must be used inside HeroStage");
  return value;
}

const TAP_SLOP_PX = 6;
const RING_DELAYS = [0, 0.25, 0.5];
const RING_LIFETIME_MS = 2400;
/** The CSS mic's grille: a 100 px ball at the top of the 120 px wide mic. */
const GRILLE = { x: 60, y: 50 };

const HERO_CROWD_COLORS: CrowdColors = {
  person: (row) => (row ? PALETTE.inkBack : PALETTE.inkFront),
  phone: (row, alpha) => (row ? withAlpha(PALETTE.cool, alpha * 0.7) : withAlpha(PALETTE.warm, alpha)),
};

type Ring = { id: number; x: number; y: number; delay: number };

export function HeroStage({ micLabel, children }: { micLabel: string; children: ReactNode }) {
  const [live, setLive] = useState(false);
  const [rings, setRings] = useState<Ring[]>([]);
  const reduced = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const downX = useRef<number | null>(null);
  const nextId = useRef(0);
  const timers = useRef(new Set<number>());
  const getGrillePoint = useRef<() => Point>(() => {
    const hero = heroRef.current!.getBoundingClientRect();
    const mic = heroRef.current!.querySelector("[data-mic]")!.getBoundingClientRect();
    return { x: mic.left - hero.left + GRILLE.x, y: mic.top - hero.top + GRILLE.y };
  });

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const toggle = useCallback(() => {
    setLive((was) => !was);
    if (reduced) return;
    const origin = getGrillePoint.current();
    const added = RING_DELAYS.map((delay) => ({ id: nextId.current++, delay, ...origin }));
    setRings((current) => [...current, ...added]);
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      setRings((current) => current.filter((r) => !added.includes(r)));
    }, RING_LIFETIME_MS);
    timers.current.add(timer);
  }, [reduced]);

  const onPointerDown = (e: PointerEvent) => {
    downX.current = e.clientX;
  };
  const onClick = (e: React.MouseEvent) => {
    const moved = downX.current === null ? 0 : Math.abs(e.clientX - downX.current);
    downX.current = null;
    // detail 0 is a keyboard activation; a pointer press that moved 6 px or more is a drag.
    if (e.detail !== 0 && moved >= TAP_SLOP_PX) return;
    toggle();
  };

  return (
    <HeroStageContext.Provider value={{ live, getGrillePoint }}>
      <header
        ref={heroRef}
        className={styles.hero}
        id="top"
        data-live={String(live)}
        data-gl="loading"
      >
        <CrowdCanvas
          className={styles.crowd}
          rows={2}
          gap={78}
          scale={0.62}
          rowLift={20}
          colors={HERO_CROWD_COLORS}
          heat={live ? 1 : 0}
          glow={heroGlow}
        />
        {children}
        <button
          type="button"
          className={styles.micControl}
          aria-label={micLabel}
          aria-pressed={live}
          onPointerDown={onPointerDown}
          onClick={onClick}
        />
        {rings.map((r) => (
          <i
            key={r.id}
            className={styles.ring}
            aria-hidden="true"
            style={{ left: r.x, top: r.y, animationDelay: `${r.delay}s` }}
          />
        ))}
      </header>
    </HeroStageContext.Provider>
  );
}
