import type { Locale } from "@/lib/i18n";
import { en } from "./en";
import type { Messages } from "./types";
import { vi } from "./vi";

const dictionaries: Record<Locale, Messages> = { vi, en };

/** Server components only (AD-3, AD-6). */
export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}
