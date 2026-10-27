import type { Locale } from "@/lib/i18n";
import { COUNTER_START } from "@/lib/reaction";
import { getMessages } from "@/messages";
import { Reveal } from "../islands/Reveal";
import { TogetherScene } from "../islands/Together";
import { ChapterHead } from "./ChapterHead";
import chapter from "./chapter.module.css";
import styles from "./together.module.css";

export function Together({ locale }: { locale: Locale }) {
  const t = getMessages(locale).together;
  return (
    <section className={chapter.section} id="cungnhau">
      <div className="wrap">
        <Reveal>
          <ChapterHead number="03" kicker={t.kicker} titleLead={t.titleLead} titleAccent={t.titleAccent} lede={t.lede} />
        </Reveal>
        <Reveal>
          <TogetherScene
            locale={locale}
            initial={COUNTER_START}
            strings={{ room: t.room, counterLabel: t.counterLabel, tap: t.tap }}
            buttons={t.buttons}
            words={t.words}
          />
          <ol className={styles.steps}>
            {t.steps.map((step, i) => (
              <li key={step.title}>
                <b aria-hidden="true">{i + 1}</b>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
