"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { CHAPTER_STARTS, chapterIndexAt, FILM_DURATION, nextStart, prevStart } from "@/lib/chapters";
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
    frameLabel: string;
    keys: string;
  };
  chapters: { time: string; name: string; title: string; sub: string }[];
  /** The configured real film (REQ-LAND-022); without it, or when it fails, the animatic plays. */
  film?: {
    src: string;
    poster: string;
    captions: string;
    captionsLang: string;
    captionsLabel: string;
    starts: number[];
    chapters: { time: string; name: string }[];
    posterLead: string;
    posterAccent: string;
  } | null;
};

export function FilmPlayer({ strings, chapters, film }: FilmPlayerProps) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fellBack, setFellBack] = useState(false);
  const [duration, setDuration] = useState(0);
  const elapsed = useRef(0);
  const video = useRef<HTMLVideoElement>(null);
  const pressed = useRef(false);
  const real = fellBack ? null : film;
  const starts = real ? real.starts : CHAPTER_STARTS;
  const total = real ? duration : FILM_DURATION;
  const buttons = real ? real.chapters : chapters;

  useEffect(() => {
    if (!playing || real) return;
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
  }, [playing, real]);

  const fallBack = () => {
    elapsed.current = 0;
    setTime(0);
    setFellBack(true);
    setPlaying(true);
  };
  const play = () => {
    pressed.current = true;
    const el = video.current;
    if (!real || !el) setPlaying(true);
    else if (el.error) fallBack();
    else
      el.play().catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "NotSupportedError") fallBack();
        else throw error;
      });
  };
  const pause = () => (real ? video.current?.pause() : setPlaying(false));
  const toggle = () => (playing ? pause() : play());
  const seek = (t: number) => {
    elapsed.current = t;
    if (real && video.current) video.current.currentTime = t;
    setTime(t);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") seek(nextStart(time, starts));
    else if (e.key === "ArrowLeft") seek(prevStart(time, starts));
    else return;
    e.preventDefault();
  };
  const poster = !playing && time === 0;
  const active = poster ? 0 : 1 + chapterIndexAt(time, starts);

  return (
    <div>
      <div
        className={styles.film}
        data-film
        data-running={String(playing)}
        data-source={real ? "film" : "animatic"}
        role="group"
        aria-label={strings.frameLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {real && (
          <video
            ref={video}
            className={styles.video}
            src={real.src}
            poster={real.poster}
            preload="metadata"
            playsInline
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={(e) => {
              e.currentTarget.currentTime = 0;
              setTime(0);
              setPlaying(false);
            }}
            onTimeUpdate={(e) => {
              setTime(e.currentTarget.currentTime);
              // loadedmetadata can fire before hydration attaches the handler below; the duration must not stay 0
              setDuration(e.currentTarget.duration);
            }}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onError={() => {
              if (pressed.current) fallBack();
            }}
          >
            <track kind="captions" default src={real.captions} srcLang={real.captionsLang} label={real.captionsLabel} />
          </video>
        )}
        <div className={styles.screen}>
          <div className={styles.shot} data-on={String(active === 0)} aria-hidden={active !== 0} inert={active !== 0}>
            {real && (
              // eslint-disable-next-line @next/next/no-img-element -- static export; the poster is the site's own file
              <img className={styles.posterImage} src={real.poster} alt="" loading="lazy" decoding="async" />
            )}
            <div>
              <div className={styles.big}>
                {real ? real.posterLead : strings.posterLead} <em>{real ? real.posterAccent : strings.posterAccent}</em>
              </div>
              <button type="button" className={styles.playBig} aria-label={strings.playVideo} onClick={toggle}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 4l13 8-13 8z" />
                </svg>
              </button>
            </div>
          </div>
          {!real &&
            chapters.map((c, i) => (
              <div key={c.name} className={styles.shot} data-on={String(active === i + 1)} aria-hidden={active !== i + 1} inert={active !== i + 1}>
                <div>
                  <div className={styles.big}>{c.title}</div>
                  <div className={`${styles.sub} mono`}>{c.sub}</div>
                </div>
              </div>
            ))}
        </div>
        {!real && <div className={`${styles.draft} mono`}>{strings.draft}</div>}
        {!real && (
          <div className={`${styles.rec} mono`}>
            <b />
            {strings.rec}
          </div>
        )}
        <div className={`${styles.tbar} mono`}>
          <button type="button" className={styles.toggle} onClick={toggle}>
            <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span> {playing ? strings.pause : strings.play}
          </button>
          <span className={styles.tc} data-timecode>
            {formatTimecode(time)}
          </span>
          <div className={styles.prog} data-progress>
            <i style={{ width: `${total > 0 ? (time / total) * 100 : 0}%` }} />
          </div>
          <span className={styles.keys}>{strings.keys}</span>
        </div>
      </div>
      <div className={`${styles.chapters} mono`}>
        {buttons.map((c, i) => (
          <button
            key={c.name}
            type="button"
            aria-current={active === i + 1 ? "true" : undefined}
            onClick={() => {
              seek(starts[i]);
              play();
            }}
          >
            {c.time}
            <span>{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
