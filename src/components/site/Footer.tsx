import { PRIVACY_URL } from "@/lib/site";
import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/messages";
import styles from "./Footer.module.css";

export function Footer({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  return (
    <footer className={`${styles.footer} mono`}>
      <span>{t.footer.copyright}</span>
      <span>{t.footer.made}</span>
      <a href={PRIVACY_URL}>{t.footer.privacy}</a>
    </footer>
  );
}
