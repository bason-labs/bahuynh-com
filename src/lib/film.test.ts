import { describe, expect, it } from "vitest";
import { filmConfig as fixture } from "../../e2e/fixtures/film.config";
import { filmConfig } from "../features/landing/film.config";
import { resolveFilm } from "./film";

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
