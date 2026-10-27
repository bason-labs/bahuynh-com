import type { Metadata } from "next";
import { localePath, otherLocale, type Locale } from "@/lib/i18n";
import { SITE_ORIGIN } from "@/lib/site";
import { getMessages } from "@/messages";

const OG_LOCALE: Record<Locale, string> = { vi: "vi_VN", en: "en_US" };
const url = (locale: Locale) => `${SITE_ORIGIN}${localePath(locale)}`;

/** The per-language head: canonical, hreflang alternates, title, description, Open Graph, Twitter (REQ-LAND-035, 036). */
export function buildMetadata(locale: Locale): Metadata {
  const { title, description, imageAlt } = getMessages(locale).meta;
  const image = `${SITE_ORIGIN}/og/${locale}.png`;
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title,
    description,
    alternates: {
      canonical: url(locale),
      languages: { vi: url("vi"), en: url("en"), "x-default": url("vi") },
    },
    openGraph: {
      type: "website",
      siteName: "BS Kara",
      title,
      description,
      url: url(locale),
      locale: OG_LOCALE[locale],
      alternateLocale: OG_LOCALE[otherLocale(locale)],
      images: [{ url: image, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: { card: "summary_large_image", title, description, images: [{ url: image, alt: imageAlt }] },
  };
}
