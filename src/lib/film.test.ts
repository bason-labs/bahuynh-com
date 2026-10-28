import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { filmConfig } from "../features/landing/film.config";
import { type FilmConfig, resolveFilm } from "./film";

/** A configured film with a different cut per language. */
const fixture: FilmConfig = {
  vi: {
    src: "/film/vi.webm",
    poster: "/film/vi.jpg",
    chapters: [
      { start: 0, name: "Mở đầu" },
      { start: 5, name: "Giữa phim" },
      { start: 14, name: "Kết" },
    ],
    captions: "/film/vi.vtt",
    copy: {
      titleLead: "Phim thật,",
      titleAccent: "một đêm.",
      lede: "Đoạn phim thật thay cho bản dựng nháp.",
      posterLead: "Xem phim",
      posterAccent: "thật.",
    },
  },
  en: {
    src: "/film/en.webm",
    poster: "/film/en.jpg",
    chapters: [
      { start: 0, name: "Opening" },
      { start: 6, name: "Middle" },
      { start: 15, name: "Ending" },
    ],
    captions: "/film/en.vtt",
    copy: {
      titleLead: "The real film,",
      titleAccent: "one night.",
      lede: "The real footage in place of the rough cut.",
      posterLead: "Watch the",
      posterAccent: "real film.",
    },
  },
};

describe("resolveFilm", () => {
  it("returns null with no film configured", () => {
    expect(resolveFilm(null, "vi")).toBeNull();
  });

  it.each([
    ["vi", [0, 5, 14], ["Mở đầu", "Giữa phim", "Kết"], "/film/vi.webm", "/film/vi.vtt", "Phim thật,"],
    ["en", [0, 6, 15], ["Opening", "Middle", "Ending"], "/film/en.webm", "/film/en.vtt", "The real film,"],
  ] as const)("returns the %s cut: file, chapters, captions and copy", (locale, starts, names, src, captions, titleLead) => {
    const film = resolveFilm(fixture, locale)!;
    expect(film.src).toBe(src);
    expect(film.poster).toBe(`/film/${locale}.jpg`);
    expect(film.starts).toEqual(starts);
    expect(film.names).toEqual(names);
    expect(film.captions).toBe(captions);
    expect(film.copy.titleLead).toBe(titleLead);
  });

  it.each(["vi", "en"] as const)("ships the %s walkthrough cut, its poster and captions from public/", (locale) => {
    const film = filmConfig![locale];
    for (const url of [film.src, film.poster, film.captions]) {
      expect(url.startsWith("/film/")).toBe(true);
      expect(existsSync(join("public", url))).toBe(true);
    }
    expect(film.chapters).toHaveLength(6);
    expect(film.chapters[0].start).toBe(0);
  });
});
