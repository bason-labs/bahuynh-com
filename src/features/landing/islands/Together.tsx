"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { PALETTE, withAlpha } from "@/lib/palette";
import { formatCount, increment, pointFor, WORD_LIFETIME_MS } from "@/lib/reaction";
import styles from "../sections/together.module.css";
import { CrowdCanvas, type CrowdColors, type CrowdHandle } from "./CrowdCanvas";

type Four = readonly [string, string, string, string];

type TogetherSceneProps = {
  locale: string;
  initial: number;
  strings: { room: string; counterLabel: string; tap: string };
  buttons: Four;
  words: Four;
};

const PERSON = ["#08080a", "#111114", "#18181c"];

const CROWD_COLORS: CrowdColors = {
  person: (row) => PERSON[row],
  phone: (row, alpha, ph) =>
    (ph * 10) % 3 < 1
      ? withAlpha(PALETTE.red, alpha)
      : withAlpha(row % 2 ? PALETTE.cool : PALETTE.warm, alpha),
};

const calmGlow = () => "rgba(255,74,43,.08)";

type Word = { id: number; text: string; x: number; y: number };

export function TogetherScene({ locale, initial, strings, buttons, words }: TogetherSceneProps) {
  const [count, setCount] = useState(initial);
  const [floating, setFloating] = useState<Word[]>([]);
  const scene = useRef<HTMLDivElement>(null);
  const crowd = useRef<CrowdHandle>(null);
  const nextId = useRef(0);
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  /** One reaction at (x, y) in scene pixels, or at a random point; `word` picks the word, else random. */
  const react = useCallback(
    (at: { x: number; y: number } | null, word?: number) => {
      const { clientWidth, clientHeight } = scene.current!;
      const point = at ?? pointFor(Math.random(), Math.random(), clientWidth, clientHeight);
      crowd.current!.burst(point.x, point.y);
      setCount((c) => c + increment(Math.random()));
      const created: Word = {
        id: nextId.current++,
        text: words[word ?? Math.floor(Math.random() * words.length)],
        ...point,
      };
      setFloating((current) => [...current, created]);
      const timer = window.setTimeout(() => {
        timers.current.delete(timer);
        setFloating((current) => current.filter((w) => w !== created));
      }, WORD_LIFETIME_MS);
      timers.current.add(timer);
    },
    [words],
  );

  const onTap = (e: MouseEvent) => {
    // detail 0 is a keyboard activation: no pointer point, so a random one.
    if (e.detail === 0) return react(null);
    // Words and sparks sit in the scene's padding box, inside its 1 px border.
    const el = scene.current!;
    const box = el.getBoundingClientRect();
    react({ x: e.clientX - box.left - el.clientLeft, y: e.clientY - box.top - el.clientTop });
  };

  return (
    <div ref={scene} className={styles.scene} data-scene>
      <CrowdCanvas
        ref={crowd}
        className={styles.people}
        rows={3}
        gap={96}
        scale={1.15}
        rowLift={70}
        colors={CROWD_COLORS}
        heat={0}
        glow={calmGlow}
      />
      <div className={styles.over}>
        <div className="mono" data-room>
          {strings.room}
        </div>
        <div className={styles.count}>
          <span aria-live="polite" data-count>
            {formatCount(count, locale)}
          </span>
          <small>{strings.counterLabel}</small>
        </div>
      </div>
      <button type="button" className={styles.tap} aria-label={strings.tap} onClick={onTap} />
      <div className={`${styles.react} mono`}>
        {buttons.map((label, i) => (
          <button key={label} type="button" onClick={() => react(null, i)}>
            {label}
          </button>
        ))}
      </div>
      {floating.map((w) => (
        <div key={w.id} className={styles.chip} aria-hidden="true" data-word style={{ left: w.x, top: w.y }}>
          {w.text}
        </div>
      ))}
    </div>
  );
}
