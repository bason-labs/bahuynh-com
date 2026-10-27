import type { Locale } from "./i18n";

type Pair<T> = { vi: T; en: T };

/** The words around the film for one language: chapter heading, lede and poster text. */
export type FilmCopy = {
  titleLead: string;
  titleAccent: string;
  lede: string;
  posterLead: string;
  posterAccent: string;
};

/** One configuration entry for a real film file (REQ-LAND-022); all URLs are on the site's own origin. */
export type FilmConfig = {
  src: string;
  poster: string;
  chapters: { start: number; name: Pair<string> }[];
  captions: Pair<string>;
  copy: Pair<FilmCopy>;
};

export type ResolvedFilm = {
  src: string;
  poster: string;
  starts: number[];
  names: string[];
  captions: string;
  copy: FilmCopy;
};

/** The configured film for `locale`, or null where none is configured (the animatic plays). */
export function resolveFilm(config: FilmConfig | null, locale: Locale): ResolvedFilm | null {
  if (!config) return null;
  return {
    src: config.src,
    poster: config.poster,
    starts: config.chapters.map((c) => c.start),
    names: config.chapters.map((c) => c.name[locale]),
    captions: config.captions[locale],
    copy: config.copy[locale],
  };
}
