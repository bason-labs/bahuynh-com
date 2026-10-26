import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/messages";
import styles from "./marquee.module.css";

export function Marquee({ locale }: { locale: Locale }) {
  const names = getMessages(locale).marquee;
  return (
    <div className={styles.marq} aria-hidden="true" data-marquee>
      <div className={styles.row}>
        {[0, 1].flatMap((set) =>
          names.flatMap((name, i) => [
            <span key={`${set}-${i}`}>{name}</span>,
            <span key={`${set}-${i}-s`} className={styles.s}>
              ■
            </span>,
          ]),
        )}
      </div>
    </div>
  );
}
