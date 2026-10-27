import type { FilmConfig } from "@/lib/film";

/**
 * The real film (REQ-LAND-022). `null` plays the animatic. To use a file, replace `null` with
 * `{ src, poster, chapters, captions, copy }`; the file, poster and WebVTT captions are served
 * from the site's own origin.
 */
export const filmConfig: FilmConfig | null = null;
