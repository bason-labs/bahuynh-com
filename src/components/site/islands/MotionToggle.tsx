"use client";

import { useEffect } from "react";
import { MOTION_KEY, parseStored, resolveMotion } from "@/lib/motion";
import styles from "./MotionToggle.module.css";
import { useReducedMotion } from "./useReducedMotion";

export function MotionToggle({ label }: { label: string }) {
  const pressed = useReducedMotion();

  useEffect(() => {
    const { reduce } = resolveMotion({
      system: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      stored: parseStored(window.sessionStorage.getItem(MOTION_KEY)),
    });
    document.documentElement.dataset.motion = reduce ? "reduce" : "run";
  }, []);

  function toggle() {
    const next = pressed ? "run" : "reduce";
    document.documentElement.dataset.motion = next;
    window.sessionStorage.setItem(MOTION_KEY, next);
  }

  return (
    <button type="button" className={`${styles.toggle} mono`} aria-pressed={pressed} aria-label={label} onClick={toggle}>
      <span aria-hidden="true" className={styles.glyph} />
      <span aria-hidden="true" className={styles.text}>
        {label}
      </span>
    </button>
  );
}
