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

/** One language's cut of the real film; all URLs are on the site's own origin. */
export type FilmVersion = {
  src: string;
  poster: string;
  chapters: { start: number; name: string }[];
  captions: string;
  copy: FilmCopy;
};

/** One configuration entry for the real film (REQ-LAND-022): a cut per language, each with its own file. */
export type FilmConfig = Pair<FilmVersion>;

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
  const film = config[locale];
  return {
    src: film.src,
    poster: film.poster,
    starts: film.chapters.map((c) => c.start),
    names: film.chapters.map((c) => c.name),
    captions: film.captions,
    copy: film.copy,
  };
}
