import { APP_URL } from "@/lib/site";
import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/messages";
import { MotionToggle } from "./islands/MotionToggle";
import { LangSwitch } from "./LangSwitch";
import styles from "./SiteNav.module.css";

export type NavLink = { href: string; label: string };

export function SiteNav({ locale, links }: { locale: Locale; links: NavLink[] }) {
  const t = getMessages(locale);
  return (
    <nav className={styles.nav} aria-label={t.nav.label}>
      <a className={styles.logo} href="#top">
        <i aria-hidden="true" />
        BS KARA
      </a>
      <ul className={`${styles.links} mono`}>
        {links.map((link, index) => (
          <li key={link.href}>
            <a href={link.href} data-nav-link={link.href.slice(1)} aria-current={index === 0 ? "true" : undefined}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <span className={styles.gap} />
      <LangSwitch locale={locale} />
      <MotionToggle label={t.motion.pause} />
      <a className={`btn solid ${styles.cta}`} href={APP_URL}>
        {t.nav.open}
      </a>
    </nav>
  );
}
