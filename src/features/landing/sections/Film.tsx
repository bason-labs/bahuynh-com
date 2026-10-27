import { CHAPTER_STARTS, formatChapterTime } from "@/lib/chapters";
import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/messages";
import { FilmPlayer } from "../islands/FilmPlayer";
import { ChapterHead } from "./ChapterHead";
import chapter from "./chapter.module.css";

export function Film({ locale }: { locale: Locale }) {
  const t = getMessages(locale).film;
  return (
    <section className={chapter.section} id="xem">
      <div className="wrap">
        <ChapterHead
          number="01"
          kicker={t.kicker}
          titleLead={t.titleLead}
          titleAccent={t.titleAccent}
          lede={t.lede}
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
            keys: t.keys,
          }}
          chapters={t.chapters.map((c, i) => ({ ...c, time: formatChapterTime(CHAPTER_STARTS[i]) }))}
        />
      </div>
    </section>
  );
}
