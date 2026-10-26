import { Footer, Grain, SiteNav } from "@/components/site";
import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/messages";
import { Features } from "./sections/Features";
import { Final } from "./sections/Final";
import { Film } from "./sections/Film";
import { Hero } from "./sections/Hero";
import { Marquee } from "./sections/Marquee";
import { Spin } from "./sections/Spin";
import { Together } from "./sections/Together";

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
        <Spin locale={locale} />
        <Together locale={locale} />
        <Features locale={locale} />
        <Final locale={locale} />
      </main>
      <Footer locale={locale} />
    </>
  );
}
