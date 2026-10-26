import type { FilmConfig } from "@/lib/film";

/** Stands in for src/features/landing/film.config.ts in the `pnpm build:film-fixture` build only. */
export const filmConfig: FilmConfig | null = {
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
