import type { Locale } from "@/lib/i18n";
import { sectionId } from "@/lib/sections";
import { APP_URL } from "@/lib/site";
import { getMessages } from "@/messages";
import styles from "./hero.module.css";

export function HeroCopy({ locale }: { locale: Locale }) {
  const t = getMessages(locale).hero;
  return (
    <div>
      <h1>
        {t.titleLead} <em>{t.titleAccent}</em>
      </h1>
      <p>{t.lede}</p>
      <div className={styles.cta}>
        <a className="btn solid" href={APP_URL}>
          {t.open}
        </a>
        <a className="btn" href={`#${sectionId(locale, 1)}`}>
          {t.film}
        </a>
      </div>
      <div className={`${styles.meta} mono`}>
        <span>{t.platforms}</span>
        <span>{t.free}</span>
      </div>
    </div>
  );
}
