import { localePath, otherLocale, type Locale } from "@/lib/i18n";
import { getMessages } from "@/messages";
import styles from "./LangSwitch.module.css";

export function LangSwitch({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const options: Locale[] = ["vi", "en"];
  const content = (option: Locale) => (
    <>
      <span aria-hidden="true">{option.toUpperCase()}</span>
      <span className={styles.name}>{t.lang[option]}</span>
    </>
  );
  return (
    <div className={`${styles.lang} mono`} role="group" aria-label={t.lang.group}>
      {options.map((option) =>
        option === locale ? (
          <button key={option} type="button" lang={option} aria-current="true">
            {content(option)}
          </button>
        ) : (
          <a key={option} href={localePath(otherLocale(locale))} lang={option} hrefLang={option} data-lang-link>
            {content(option)}
          </a>
        ),
      )}
    </div>
  );
}
