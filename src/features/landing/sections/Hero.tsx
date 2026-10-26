import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/messages";
import { HeroStage } from "../islands/HeroStage";
import { HeroCopy } from "./HeroCopy";
import { HeroMic } from "./HeroMic";
import { HeroSide } from "./HeroSide";
import styles from "./hero.module.css";

export function Hero({ locale }: { locale: Locale }) {
  const t = getMessages(locale).hero;
  return (
    <HeroStage micLabel={t.micLabel}>
      <HeroMic locale={locale} />
      <div className={`${styles.copy} wrap`}>
        <HeroCopy locale={locale} />
        <HeroSide locale={locale} />
      </div>
    </HeroStage>
  );
}
