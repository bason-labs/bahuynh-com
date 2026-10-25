import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/messages";

export function LandingPage({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  return (
    <main id="top">
      <h1>{t.hero.title}</h1>
    </main>
  );
}
