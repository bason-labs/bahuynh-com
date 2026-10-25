"use client";

import { Fragment, useEffect, useState } from "react";
import { sungCount } from "@/lib/lyric";
import { useReducedMotion } from "@/components/site/islands/useReducedMotion";
import styles from "../sections/hero.module.css";
import { useHeroStage } from "./HeroStage";

const STEP_MS = 330;

export function HeroLyric({ label, line }: { label: string; line: string }) {
  const { live } = useHeroStage();
  const reduced = useReducedMotion();
  const words = line.split(" ");
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    if (!live || reduced) return;
    const timer = window.setInterval(() => setTicks((n) => n + 1), STEP_MS);
    return () => {
      window.clearInterval(timer);
      setTicks(0);
    };
  }, [live, reduced]);

  const sung = !live ? 0 : reduced ? words.length : sungCount(ticks * STEP_MS, words.length, STEP_MS);

  return (
    <div className={styles.lyric} aria-hidden="true">
      <span className={styles.lyricLabel}>{label}</span>
      {words.map((word, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span className={i < sung ? `${styles.w} ${styles.sung}` : styles.w}>{word}</span>
        </Fragment>
      ))}
    </div>
  );
}
