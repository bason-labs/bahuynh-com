"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/i18n";
import { activeSection, markerTop, navIndex, parsePosition, restoreTop, scrollPosition, sectionIds } from "@/lib/sections";
import styles from "./ScrollRail.module.css";

/** sessionStorage key for the place on screen carried across the language switch. */
const POSITION_KEY = "bs-kara:lang-position";

/**
 * The scroll ruler, plus the other things that read "the last section above half the viewport":
 * the active navigation link, the language switch's hash, and the exact place on screen carried to the
 * other language's page. The server renders the first state; this island only mutates attributes after
 * mount. Smooth scrolling (`html[data-smooth]`) starts only once the page has been placed, so opening a
 * page never animates down from the top.
 */
export function ScrollRail({ locale }: { locale: Locale }) {
  const rail = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLElement>(null);

  useEffect(() => {
    const ids = sectionIds(locale);
    const otherIds = sectionIds(locale === "vi" ? "en" : "vi");
    const sections = ids.map((id) => document.getElementById(id));
    const navLinks = document.querySelectorAll<HTMLElement>("[data-nav-link]");
    const langLink = document.querySelector<HTMLAnchorElement>("[data-lang-link]");
    const langBase = langLink?.getAttribute("href") ?? "";
    const html = document.documentElement;
    let frame = 0;

    function tops() {
      return sections.map((el) => el?.getBoundingClientRect().top ?? Infinity);
    }

    function restore() {
      let stored: unknown = null;
      try {
        const raw = sessionStorage.getItem(POSITION_KEY);
        sessionStorage.removeItem(POSITION_KEY);
        stored = raw ? JSON.parse(raw) : null;
      } catch {
        return;
      }
      const position = parsePosition(stored);
      if (!position) return;
      const hash = position.index === 0 ? "" : `#${ids[position.index]}`;
      if (window.location.hash !== hash) return;
      const section = sections[position.index];
      if (!section) return;
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: restoreTop(position, sectionTop, section.offsetHeight), behavior: "instant" });
    }

    function langHref(active: number) {
      return active === 0 ? langBase : `${langBase}#${otherIds[active]}`;
    }

    function remember() {
      const position = scrollPosition(tops(), sections.map((el) => el?.offsetHeight ?? 0), window.innerHeight);
      // Set the hash here too: the scroll frame that updates it may not have run yet.
      langLink?.setAttribute("href", langHref(position.index));
      try {
        sessionStorage.setItem(POSITION_KEY, JSON.stringify(position));
      } catch {
        // No storage: the hash alone still opens the same section.
      }
    }

    function update() {
      frame = 0;
      const active = activeSection(tops(), window.innerHeight);
      const current = ids[navIndex(active)];
      navLinks.forEach((link) => {
        if (link.dataset.navLink === current) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
      if (langLink) langLink.setAttribute("href", langHref(active));
      const railEl = rail.current;
      if (railEl && marker.current) {
        const maxScroll = html.scrollHeight - window.innerHeight;
        marker.current.style.transform = `translateY(${markerTop(window.scrollY, maxScroll, railEl.clientHeight)}px)`;
      }
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    restore();
    update();
    const smooth = requestAnimationFrame(() => html.setAttribute("data-smooth", ""));
    langLink?.addEventListener("click", remember);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      langLink?.removeEventListener("click", remember);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(smooth);
      if (frame) cancelAnimationFrame(frame);
      html.removeAttribute("data-smooth");
    };
  }, [locale]);

  return (
    <div ref={rail} className={styles.rail} aria-hidden="true" data-scroll-rail>
      <i ref={marker} />
    </div>
  );
}
