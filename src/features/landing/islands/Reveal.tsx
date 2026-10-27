"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/components/site/islands/useReducedMotion";
import styles from "./reveal.module.css";

const THRESHOLD = 0.12;

/** Fraction of the element's area inside the viewport. */
function visibleRatio(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const w = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
  const h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
  return r.width * r.height === 0 ? 1 : (Math.max(w, 0) * Math.max(h, 0)) / (r.width * r.height);
}

/**
 * Fades its children in once, when 12 % of the block first shows. The server HTML is fully visible:
 * only after mount, and only for a block still out of view, does `data-reveal="pending"` hide it.
 */
export function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current!;
    if (reduced || done.current || visibleRatio(el) >= THRESHOLD) {
      done.current = true;
      delete el.dataset.reveal;
      return;
    }
    el.dataset.reveal = "pending";
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        done.current = true;
        el.dataset.reveal = "in";
        observer.disconnect();
      },
      { threshold: THRESHOLD },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <div ref={ref} className={styles.reveal}>
      {children}
    </div>
  );
}
