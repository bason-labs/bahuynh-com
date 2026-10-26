"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { sungClamped } from "@/lib/lyric";
import { pickSong, pushQueue, REEL_REPEATS, reelStart, reelTarget, rowShift } from "@/lib/reel";
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
    live: string;
    you: string;
    announce: string;
  };
  songs: readonly string[];
  lyrics: readonly string[];
  queue: readonly { song: string; who: string }[];
};

const SPIN_MS = 3300;
const WORD_MS = 380;

type QueueRow = { id: number; song: string; who: string; fresh: boolean };

export function SpinReel({ strings, songs, lyrics, queue }: SpinReelProps) {
  const n = songs.length;
  const reduced = useReducedMotion();
  const [row, setRow] = useState(1);
  const [animate, setAnimate] = useState(false);
  const [hit, setHit] = useState<number | null>(1);
  const [spinning, setSpinning] = useState(false);
  const [landing, setLanding] = useState<{ id: number; pick: number } | null>(null);
  const [ticks, setTicks] = useState(0);
  const [rows, setRows] = useState<QueueRow[]>(() =>
    queue.map((q, id) => ({ id, song: q.song, who: q.who, fresh: false })),
  );
  const busy = useRef(false);
  const landings = useRef(0);
  const timers = useRef<{ raf: number; timeout: number }>({ raf: 0, timeout: 0 });

  useEffect(() => {
    const t = timers.current;
    return () => {
      cancelAnimationFrame(t.raf);
      clearTimeout(t.timeout);
    };
  }, []);

  const landed = landing?.id;
  useEffect(() => {
    if (landed === undefined || reduced) return;
    const timer = window.setInterval(() => setTicks((n) => n + 1), WORD_MS);
    return () => window.clearInterval(timer);
  }, [landed, reduced]);

  function land(pick: number) {
    const id = landings.current++;
    setTicks(0);
    setLanding({ id, pick });
    setRows((r) => pushQueue(r, { id: queue.length + id, song: songs[pick], who: strings.you, fresh: true }));
  }

  function spin() {
    if (busy.current) return;
    const pick = pickSong(Math.random(), n);
    const target = reelTarget(pick, REEL_REPEATS, n);
    setHit(null);
    if (reduced) {
      setAnimate(false);
      setRow(target);
      setHit(target);
      land(pick);
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
      land(pick);
    }, SPIN_MS);
  }

  const words = landing ? lyrics[landing.pick].split(" ") : [];
  const sung = reduced ? words.length : sungClamped(ticks * WORD_MS, words.length, WORD_MS);

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
      <div aria-live="polite" className={styles.announce}>
        {landing && <span key={landing.id}>{strings.announce.replace("{song}", songs[landing.pick])}</span>}
      </div>
      <div className={styles.tv} data-tv>
        <div className={`${styles.label} mono`}>{strings.tv}</div>
        <div className={styles.screen}>
          <div className={`${styles.top} mono`}>
            <span>BS KARA</span>
            {landing ? <span className={styles.live}>● {strings.live}</span> : <span>{strings.room}</span>}
          </div>
          {landing ? (
            <>
              <div className={styles.title} lang="vi">
                {songs[landing.pick]}
              </div>
              <div className={styles.lyric} lang="vi" aria-hidden="true" inert key={landing.id}>
                {words.map((word, i) => (
                  <Fragment key={i}>
                    {i > 0 && " "}
                    <span className={i < sung ? styles.sung : undefined}>{word}</span>
                  </Fragment>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.title}>{strings.empty}</div>
          )}
        </div>
        <div>
          <div className={`${styles.label} ${styles.queueLabel} mono`}>{strings.queueLabel}</div>
          <ul className={styles.queue}>
            {rows.map((q) => (
              <li key={q.id} data-new={q.fresh ? "true" : undefined} data-slide={q.fresh && !reduced ? "true" : undefined}>
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
