import { CHAPTER_STARTS, formatChapterTime } from "@/lib/chapters";
import { resolveFilm } from "@/lib/film";
import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/messages";
import { filmConfig } from "../film.config";
import { FilmPlayer } from "../islands/FilmPlayer";
import { ChapterHead } from "./ChapterHead";
import chapter from "./chapter.module.css";

export function Film({ locale }: { locale: Locale }) {
  const t = getMessages(locale).film;
  const film = resolveFilm(filmConfig, locale);
  const head = film?.copy ?? t;
  return (
    <section className={chapter.section} id="xem">
      <div className="wrap">
        <ChapterHead
          number="01"
          kicker={t.kicker}
          titleLead={head.titleLead}
          titleAccent={head.titleAccent}
          lede={head.lede}
        />
        <FilmPlayer
          strings={{
            posterLead: t.posterLead,
            posterAccent: t.posterAccent,
            draft: t.draft,
            rec: t.rec,
            playVideo: t.playVideo,
            play: t.play,
            pause: t.pause,
            frameLabel: t.frameLabel,
            keys: t.keys,
          }}
          chapters={t.chapters.map((c, i) => ({ ...c, time: formatChapterTime(CHAPTER_STARTS[i]) }))}
          film={
            film && {
              src: film.src,
              poster: film.poster,
              captions: film.captions,
              captionsLang: locale,
              captionsLabel: t.captionsLabel,
              starts: film.starts,
              chapters: film.names.map((name, i) => ({ name, time: formatChapterTime(film.starts[i]) })),
              posterLead: film.copy.posterLead,
              posterAccent: film.copy.posterAccent,
            }
          }
        />
      </div>
    </section>
  );
}
