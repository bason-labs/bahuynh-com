import type { Locale } from "@/lib/i18n";
import { HeroCopy } from "./HeroCopy";
import { HeroMic } from "./HeroMic";
import { HeroSide } from "./HeroSide";
import styles from "./hero.module.css";

export function Hero({ locale }: { locale: Locale }) {
  return (
    <header className={styles.hero} id="top" data-live="false" data-gl="loading">
      <HeroMic locale={locale} />
      <div className={`${styles.copy} wrap`}>
        <HeroCopy locale={locale} />
        <HeroSide locale={locale} />
      </div>
    </header>
  );
}
