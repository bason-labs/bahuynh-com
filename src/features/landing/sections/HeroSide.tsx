import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/messages";
import styles from "./hero.module.css";

export function HeroSide({ locale }: { locale: Locale }) {
  const t = getMessages(locale).hero;
  return (
    <div className={styles.side}>
      <div className={`${styles.hint} mono`}>
        <b />
        <span>{t.hint}</span>
      </div>
      <div className={styles.lyric} aria-hidden="true" />
    </div>
  );
}
