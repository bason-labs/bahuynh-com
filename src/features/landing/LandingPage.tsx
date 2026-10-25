import { Footer, Grain, SiteNav } from "@/components/site";
import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/messages";
import { Film } from "./sections/Film";
import { Hero } from "./sections/Hero";
import { Marquee } from "./sections/Marquee";

export function LandingPage({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const links = [
    { href: "#top", label: t.nav.home },
    { href: "#xem", label: t.nav.film },
    { href: "#quay", label: t.nav.spin },
    { href: "#cungnhau", label: t.nav.together },
    { href: "#tinhnang", label: t.nav.features },
  ];
  return (
    <>
      <Grain />
      <SiteNav locale={locale} links={links} />
      <main>
        <Hero locale={locale} />
        <Marquee locale={locale} />
        <Film locale={locale} />
      </main>
      <Footer locale={locale} />
    </>
  );
}
