import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/messages";
import { Reveal } from "../islands/Reveal";
import { ChapterHead } from "./ChapterHead";
import chapter from "./chapter.module.css";
import styles from "./features.module.css";

const BARS = Array.from({ length: 28 }, (_, i) => ({
  delay: `${(Math.sin(i * 1.3) * 0.5 + 0.5).toFixed(2)}s`,
  height: `${30 + Math.abs(Math.sin(i * 0.7)) * 60}%`,
}));

type CardProps = { label: string; number: string; title: string; text: string; children: React.ReactNode };

function Card({ label, number, title, text, children }: CardProps) {
  return (
    <article className={styles.card}>
      <div className={`${styles.row} mono`}>
        <span>{label}</span>
        <span>{number}</span>
      </div>
      <div className={styles.vis}>{children}</div>
      <div className={styles.txt}>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}

export function Features({ locale }: { locale: Locale }) {
  const t = getMessages(locale).features;
  return (
    <section className={chapter.section} id="tinhnang">
      <div className="wrap">
        <Reveal>
          <ChapterHead number="04" kicker={t.kicker} titleLead={t.titleLead} titleAccent={t.titleAccent} lede={t.lede} />
        </Reveal>
        <Reveal>
          <div className={styles.grid}>
            <Card label={t.host.label} number="01" title={t.host.title} text={t.host.text}>
              <div className={styles.mc}>
                <span className={styles.quote}>{t.host.quote}</span>
                <small className="mono">{t.host.voice}</small>
              </div>
            </Card>
            <Card label={t.phone.label} number="02" title={t.phone.title} text={t.phone.text}>
              <div className={styles.phone} aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className={styles.qr} aria-hidden="true" />
            </Card>
            <Card label={t.score.label} number="03" title={t.score.title} text={t.score.text}>
              <div className={styles.score}>
                <span>{t.score.value}</span>
                <sup>{t.score.grade}</sup>
              </div>
            </Card>
            <Card label={t.next.label} number="04" title={t.next.title} text={t.next.text}>
              <ul className={styles.next}>
                {t.next.songs.map((song) => (
                  <li key={song}>
                    <span lang="vi">{song}</span>
                    <span className="mono">{t.next.add}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card label={t.reactions.label} number="05" title={t.reactions.title} text={t.reactions.text}>
              <div className={styles.wave} aria-hidden="true" data-bars>
                {BARS.map((bar, i) => (
                  <i key={i} style={{ animationDelay: bar.delay, height: bar.height }} />
                ))}
              </div>
            </Card>
            <Card label={t.screens.label} number="06" title={t.screens.title} text={t.screens.text}>
              <div className={styles.tv}>
                <span className="mono">{t.screens.devices}</span>
              </div>
            </Card>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
