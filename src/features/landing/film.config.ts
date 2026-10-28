import type { FilmConfig } from "@/lib/film";

/**
 * The real film (REQ-LAND-022): a screen recording of BS Kara in room 7996, TV and phone side by side
 * (D-0016-9), one cut per language with its own song. `null` would play the animatic; the files,
 * posters and WebVTT captions are served from the site's own origin.
 */
export const filmConfig: FilmConfig | null = {
  vi: {
    src: "/film/bs-kara-walkthrough-vi.mp4",
    poster: "/film/bs-kara-walkthrough-vi.jpg",
    chapters: [
      { start: 0, name: "Bật TV" },
      { start: 4, name: "Quét mã" },
      { start: 9, name: "Chọn bài" },
      { start: 21, name: "MC dẫn" },
      { start: 30, name: "Cả phòng hát" },
      { start: 38, name: "Điểm số" },
    ],
    captions: "/film/bs-kara-walkthrough-vi.vtt",
    copy: {
      titleLead: "Một đêm hát,",
      titleAccent: "46 giây.",
      lede: "Quay thật trên BS Kara, từng bước: bật TV, quét mã, chọn bài và ghi tên người hát, MC dẫn, cả phòng hát và chấm điểm.",
      posterLead: "Đêm nay",
      posterAccent: "hát gì?",
    },
  },
  en: {
    src: "/film/bs-kara-walkthrough-en.mp4",
    poster: "/film/bs-kara-walkthrough-en.jpg",
    chapters: [
      { start: 0, name: "TV on" },
      { start: 4, name: "Scan" },
      { start: 9, name: "Pick songs" },
      { start: 21, name: "The host" },
      { start: 33, name: "Everyone sings" },
      { start: 43, name: "Score" },
    ],
    captions: "/film/bs-kara-walkthrough-en.vtt",
    copy: {
      titleLead: "One night of singing,",
      titleAccent: "51 seconds.",
      lede: "Recorded live on BS Kara, step by step: switch on the TV, scan, pick a song and name the singer, the host, the whole room singing, the score.",
      posterLead: "What are we",
      posterAccent: "singing tonight?",
    },
  },
};
