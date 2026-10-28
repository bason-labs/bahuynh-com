import type { Locale } from "@/lib/i18n";
import { sectionId } from "@/lib/sections";
import { APP_URL } from "@/lib/site";
import { getMessages } from "@/messages";
import { Reveal } from "../islands/Reveal";
import { ChapterHead } from "./ChapterHead";
import styles from "./final.module.css";

export function Final({ locale }: { locale: Locale }) {
  const t = getMessages(locale).final;
  return (
    <section className={styles.final} id={sectionId(locale, 5)}>
      <div className="wrap">
        <Reveal>
          <ChapterHead number="05" kicker={t.kicker} titleLead={t.titleLead} titleAccent={t.titleAccent} lede={t.lede} centered />
        </Reveal>
        <Reveal>
          <div className={styles.cta}>
            <a className="btn solid" href={APP_URL}>
              {t.open}
            </a>
            <a className="btn" href={`#${sectionId(locale, 1)}`}>
              {t.film}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
