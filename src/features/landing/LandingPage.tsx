import { Footer, Grain, ScrollRail, SiteNav } from "@/components/site";
import type { Locale } from "@/lib/i18n";
import { sectionIds } from "@/lib/sections";
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
  const labels = [t.nav.home, t.nav.film, t.nav.spin, t.nav.together, t.nav.features];
  const links = labels.map((label, index) => ({ href: `#${sectionIds(locale)[index]}`, label }));
  return (
    <>
      <Grain />
      <SiteNav locale={locale} links={links} />
      <ScrollRail locale={locale} />
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
