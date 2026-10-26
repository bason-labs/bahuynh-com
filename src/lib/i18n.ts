export type Locale = "vi" | "en";

export const locales: readonly Locale[] = ["vi", "en"];

export function otherLocale(locale: Locale): Locale {
  return locale === "vi" ? "en" : "vi";
}

export function localePath(locale: Locale): string {
  return locale === "vi" ? "/" : "/en/";
}

export function otherLocaleUrl(locale: Locale): string {
  return localePath(otherLocale(locale));
}
