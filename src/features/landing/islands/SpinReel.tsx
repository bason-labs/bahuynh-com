"use client";

import { useEffect, useRef, useState } from "react";
import { pickSong, REEL_REPEATS, reelStart, reelTarget, rowShift } from "@/lib/reel";
import { useReducedMotion } from "@/components/site/islands/useReducedMotion";
import styles from "../sections/spin.module.css";

type SpinReelProps = {
  strings: {
    button: string;
    note: string;
    tv: string;
    room: string;
    empty: string;
    queueLabel: string;
  };
  songs: readonly string[];
  queue: readonly { song: string; who: string }[];
};

const SPIN_MS = 3300;

export function SpinReel({ strings, songs, queue }: SpinReelProps) {
  const n = songs.length;
  const reduced = useReducedMotion();
  const [row, setRow] = useState(1);
  const [animate, setAnimate] = useState(false);
  const [hit, setHit] = useState<number | null>(1);
  const [spinning, setSpinning] = useState(false);
  const busy = useRef(false);
  const timers = useRef<{ raf: number; timeout: number }>({ raf: 0, timeout: 0 });

  useEffect(() => {
    const t = timers.current;
    return () => {
      cancelAnimationFrame(t.raf);
      clearTimeout(t.timeout);
    };
  }, []);

  function spin() {
    if (busy.current) return;
    const target = reelTarget(pickSong(Math.random(), n), REEL_REPEATS, n);
    setHit(null);
    if (reduced) {
      setAnimate(false);
      setRow(target);
      setHit(target);
      return;
    }
    busy.current = true;
    setSpinning(true);
    setAnimate(false);
    setRow(reelStart(target, n));
    timers.current.raf = requestAnimationFrame(() => {
      timers.current.raf = requestAnimationFrame(() => {
        setAnimate(true);
        setRow(target);
      });
    });
    timers.current.timeout = window.setTimeout(() => {
      busy.current = false;
      setSpinning(false);
      setHit(target);
    }, SPIN_MS);
  }

  return (
    <div className={styles.spin}>
      <div className={styles.reelbox}>
        <div className={styles.reel} data-reel>
          <ul
            aria-hidden="true"
            inert
            className={styles.list}
            data-animate={animate}
            style={{ transform: `translateY(calc(var(--row) * ${-rowShift(row)}))` }}
          >
            {Array.from({ length: n * REEL_REPEATS }, (_, i) => (
              <li key={i} lang="vi" data-hit={hit === i ? "true" : undefined}>
                {songs[i % n]}
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.reelfoot}>
          <button type="button" className="btn solid" aria-disabled={spinning} onClick={spin}>
            {strings.button}
          </button>
          <span className={`${styles.note} mono`}>{strings.note}</span>
        </div>
      </div>
      <div className={styles.tv} data-tv>
        <div className={`${styles.label} mono`}>{strings.tv}</div>
        <div className={styles.screen}>
          <div className={`${styles.top} mono`}>
            <span>BS KARA</span>
            <span>{strings.room}</span>
          </div>
          <div className={styles.title}>{strings.empty}</div>
        </div>
        <div>
          <div className={`${styles.label} ${styles.queueLabel} mono`}>{strings.queueLabel}</div>
          <ul className={styles.queue}>
            {queue.map((q) => (
              <li key={q.song}>
                <span lang="vi">{q.song}</span>
                <span className="mono">{q.who}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
