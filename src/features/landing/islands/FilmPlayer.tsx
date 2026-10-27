"use client";

import { useEffect, useRef, useState } from "react";
import { chapterAt, FILM_DURATION } from "@/lib/chapters";
import { formatTimecode } from "@/lib/timecode";
import styles from "../sections/film.module.css";

type FilmPlayerProps = {
  strings: {
    posterLead: string;
    posterAccent: string;
    draft: string;
    rec: string;
    playVideo: string;
    play: string;
    pause: string;
    keys: string;
  };
  chapters: { time: string; name: string; title: string; sub: string }[];
};

export function FilmPlayer({ strings, chapters }: FilmPlayerProps) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const elapsed = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      elapsed.current += (now - last) / 1000;
      last = now;
      if (elapsed.current >= FILM_DURATION) {
        elapsed.current = 0;
        setTime(0);
        setPlaying(false);
        return;
      }
      setTime(elapsed.current);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const toggle = () => setPlaying((was) => !was);
  const poster = !playing && time === 0;
  const active = poster ? 0 : 1 + chapterAt(time);

  return (
    <div>
      <div className={styles.film} data-film data-running={String(playing)}>
        <div className={styles.screen}>
          <div className={styles.shot} data-on={String(active === 0)} inert={active !== 0}>
            <div>
              <div className={styles.big}>
                {strings.posterLead} <em>{strings.posterAccent}</em>
              </div>
              <button type="button" className={styles.playBig} aria-label={strings.playVideo} onClick={toggle}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 4l13 8-13 8z" />
                </svg>
              </button>
            </div>
          </div>
          {chapters.map((c, i) => (
            <div key={c.name} className={styles.shot} data-on={String(active === i + 1)} inert={active !== i + 1}>
              <div>
                <div className={styles.big}>{c.title}</div>
                <div className={`${styles.sub} mono`}>{c.sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div className={`${styles.draft} mono`}>{strings.draft}</div>
        <div className={`${styles.rec} mono`}>
          <b />
          {strings.rec}
        </div>
        <div className={`${styles.tbar} mono`}>
          <button type="button" className={styles.toggle} onClick={toggle}>
            <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span> {playing ? strings.pause : strings.play}
          </button>
          <span className={styles.tc} data-timecode>
            {formatTimecode(time)}
          </span>
          <div className={styles.prog} data-progress>
            <i style={{ width: `${(time / FILM_DURATION) * 100}%` }} />
          </div>
          <span className={styles.keys}>{strings.keys}</span>
        </div>
      </div>
      <div className={`${styles.chapters} mono`}>
        {chapters.map((c) => (
          <button key={c.name} type="button">
            {c.time}
            <span>{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
