import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/messages";
import { ChapterHead } from "./ChapterHead";
import chapter from "./chapter.module.css";
import styles from "./together.module.css";

export function Together({ locale }: { locale: Locale }) {
  const t = getMessages(locale).together;
  return (
    <section className={chapter.section} id="cungnhau">
      <div className="wrap">
        <ChapterHead number="03" kicker={t.kicker} titleLead={t.titleLead} titleAccent={t.titleAccent} lede={t.lede} />
        <ol className={styles.steps}>
          {t.steps.map((step, i) => (
            <li key={step.title}>
              <b aria-hidden="true">{i + 1}</b>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
