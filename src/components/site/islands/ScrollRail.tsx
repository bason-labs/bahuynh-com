"use client";

import { useEffect, useRef } from "react";
import { activeSection, markerTop, navIndex, SECTION_IDS } from "@/lib/sections";
import styles from "./ScrollRail.module.css";

/**
 * The scroll ruler, plus the two other things that read "the last section above half the viewport":
 * the active navigation link and the language switch's hash. The server renders the first state;
 * this island only mutates attributes after mount.
 */
export function ScrollRail() {
  const rail = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLElement>(null);

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id));
    const navLinks = document.querySelectorAll<HTMLElement>("[data-nav-link]");
    const langLink = document.querySelector<HTMLAnchorElement>("[data-lang-link]");
    const langBase = langLink?.getAttribute("href") ?? "";
    let frame = 0;

    function update() {
      frame = 0;
      const tops = sections.map((el) => el?.getBoundingClientRect().top ?? Infinity);
      const active = activeSection(tops, window.innerHeight);
      const current = SECTION_IDS[navIndex(active)];
      navLinks.forEach((link) => {
        if (link.dataset.navLink === current) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
      if (langLink) langLink.setAttribute("href", active === 0 ? langBase : `${langBase}#${SECTION_IDS[active]}`);
      const railEl = rail.current;
      if (railEl && marker.current) {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        marker.current.style.transform = `translateY(${markerTop(window.scrollY, maxScroll, railEl.clientHeight)}px)`;
      }
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={rail} className={styles.rail} aria-hidden="true" data-scroll-rail>
      <i ref={marker} />
    </div>
  );
}
