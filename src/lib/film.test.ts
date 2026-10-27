import { describe, expect, it } from "vitest";
import { filmConfig } from "../features/landing/film.config";
import { type FilmConfig, resolveFilm } from "./film";

/** A configured film, as `film.config.ts` would hold once the real file is swapped in. */
const fixture: FilmConfig = {
  src: "/film/film.webm",
  poster: "/film/poster.jpg",
  chapters: [
    { start: 0, name: { vi: "Mở đầu", en: "Opening" } },
    { start: 5, name: { vi: "Giữa phim", en: "Middle" } },
    { start: 14, name: { vi: "Kết", en: "Ending" } },
  ],
  captions: { vi: "/film/vi.vtt", en: "/film/en.vtt" },
  copy: {
    vi: {
      titleLead: "Phim thật,",
      titleAccent: "một đêm.",
      lede: "Đoạn phim thật thay cho bản dựng nháp.",
      posterLead: "Xem phim",
      posterAccent: "thật.",
    },
    en: {
      titleLead: "The real film,",
      titleAccent: "one night.",
      lede: "The real footage in place of the rough cut.",
      posterLead: "Watch the",
      posterAccent: "real film.",
    },
  },
};

describe("resolveFilm", () => {
  it("ships no film in this build", () => {
    expect(filmConfig).toBeNull();
    expect(resolveFilm(filmConfig, "vi")).toBeNull();
  });

  it.each([
    ["vi", ["Mở đầu", "Giữa phim", "Kết"], "/film/vi.vtt", "Phim thật,"],
    ["en", ["Opening", "Middle", "Ending"], "/film/en.vtt", "The real film,"],
  ] as const)("returns the %s chapters, captions and copy", (locale, names, captions, titleLead) => {
    const film = resolveFilm(fixture, locale)!;
    expect(film.starts).toEqual([0, 5, 14]);
    expect(film.names).toEqual(names);
    expect(film.captions).toBe(captions);
    expect(film.copy.titleLead).toBe(titleLead);
    expect(film.src).toBe("/film/film.webm");
    expect(film.poster).toBe("/film/poster.jpg");
  });
});
