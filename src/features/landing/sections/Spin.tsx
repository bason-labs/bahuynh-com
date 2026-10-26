import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/messages";
import { SpinReel } from "../islands/SpinReel";
import { ChapterHead } from "./ChapterHead";
import chapter from "./chapter.module.css";

export function Spin({ locale }: { locale: Locale }) {
  const t = getMessages(locale).spin;
  return (
    <section className={chapter.section} id="quay">
      <div className="wrap">
        <ChapterHead number="02" kicker={t.kicker} titleLead={t.titleLead} titleAccent={t.titleAccent} lede={t.lede} />
        <SpinReel
          strings={{
            button: t.button,
            note: t.note,
            tv: t.tv,
            room: t.room,
            empty: t.empty,
            queueLabel: t.queueLabel,
            live: t.live,
            you: t.you,
            announce: t.announce,
          }}
          songs={t.songs}
          lyrics={t.lyrics}
          queue={t.queue}
        />
      </div>
    </section>
  );
}
