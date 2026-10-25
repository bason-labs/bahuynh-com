"use client";

import { useEffect } from "react";
import { MOTION_KEY, parseStored, resolveMotion } from "@/lib/motion";
import styles from "./MotionToggle.module.css";
import { useReducedMotion } from "./useReducedMotion";

// Storage can be blocked (private modes, site settings); the toggle then works for this page only.
function readStored(): string | null {
  try {
    return window.sessionStorage.getItem(MOTION_KEY);
  } catch {
    return null;
  }
}

function writeStored(value: string) {
  try {
    window.sessionStorage.setItem(MOTION_KEY, value);
  } catch {
    // not persisted
  }
}

export function MotionToggle({ label }: { label: string }) {
  const pressed = useReducedMotion();

  useEffect(() => {
    const { reduce } = resolveMotion({
      system: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      stored: parseStored(readStored()),
    });
    document.documentElement.dataset.motion = reduce ? "reduce" : "run";
  }, []);

  function toggle() {
    const next = pressed ? "run" : "reduce";
    document.documentElement.dataset.motion = next;
    writeStored(next);
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
