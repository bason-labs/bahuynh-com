import type { FilmConfig } from "@/lib/film";

/**
 * The real film (REQ-LAND-022): a 46 s screen recording of BS Kara in room 7996, TV and phone side
 * by side (D-0016-9). `null` would play the animatic; the file, poster and WebVTT captions are
 * served from the site's own origin.
 */
export const filmConfig: FilmConfig | null = {
  src: "/film/bs-kara-walkthrough.mp4",
  poster: "/film/bs-kara-walkthrough.jpg",
  chapters: [
    { start: 0, name: { vi: "Bật TV", en: "TV on" } },
    { start: 5, name: { vi: "Quét mã", en: "Scan" } },
    { start: 10, name: { vi: "Chọn bài", en: "Pick songs" } },
    { start: 22, name: { vi: "MC dẫn", en: "The host" } },
    { start: 31, name: { vi: "Cả phòng hát", en: "Everyone sings" } },
    { start: 39, name: { vi: "Điểm số", en: "Score" } },
  ],
  captions: { vi: "/film/bs-kara-walkthrough.vi.vtt", en: "/film/bs-kara-walkthrough.en.vtt" },
  copy: {
    vi: {
      titleLead: "Một đêm hát,",
      titleAccent: "46 giây.",
      lede: "Quay thật trên BS Kara, từng bước: bật TV, quét mã, chọn bài, MC dẫn, cả phòng hát và chấm điểm.",
      posterLead: "Đêm nay",
      posterAccent: "hát gì?",
    },
    en: {
      titleLead: "One night of singing,",
      titleAccent: "46 seconds.",
      lede: "Recorded live on BS Kara, step by step: switch on the TV, scan, pick a song, the host, the whole room singing, the score.",
      posterLead: "What are we",
      posterAccent: "singing tonight?",
    },
  },
};
