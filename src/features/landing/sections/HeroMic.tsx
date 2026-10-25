import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/messages";
import styles from "./hero.module.css";

const BS = "BS";
const KARA = "KARA";

export function HeroMic({ locale }: { locale: Locale }) {
  const t = getMessages(locale).hero;
  return (
    <>
      <div className={styles.cone} aria-hidden="true" />
      <div className={styles.word} aria-hidden="true">
        <span>{BS}</span> <span className={styles.k}>{KARA}</span>
      </div>
      <div className={styles.fallback} aria-hidden="true" data-mic="css" />
      <div className={`${styles.onair} mono`} aria-live="polite">
        <span>{t.onAir}</span>
      </div>
    </>
  );
}
