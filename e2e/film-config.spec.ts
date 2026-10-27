// Runs against out-film/ (pnpm build:film-fixture, pnpm e2e:film): a build with a film configured,
// 16 s long, chapters at 0, 5 and 14 s. The default build never has a film (film.spec.ts).
import { expect as baseExpect, test as baseTest, type Page } from "@playwright/test";
import { checkAxe, collectErrors, expect, gotoPage, test } from "./support";

const SRC = "/film/film.webm";
const copy = {
  vi: {
    h2: "Phim thật, một đêm.",
    lede: "Đoạn phim thật thay cho bản dựng nháp.",
    poster: "Xem phim thật.",
    chapters: ["0:00Mở đầu", "0:05Giữa phim", "0:14Kết"],
    play: "Phát",
    playVideo: "Phát video",
    pause: "Dừng",
    draft: "Bản dựng nháp",
    thirtySix: "36 giây",
    firstShot: "Bật TV",
  },
  en: {
    h2: "The real film, one night.",
    lede: "The real footage in place of the rough cut.",
    poster: "Watch the real film.",
    chapters: ["0:00Opening", "0:05Middle", "0:14Ending"],
    play: "Play",
    playVideo: "Play video",
    pause: "Pause",
    draft: "Rough cut",
    thirtySix: "36 seconds",
    firstShot: "TV on",
  },
} as const;

// Real media on a loaded runner is slow: every wait on the <video> gets a generous end-state timeout.
const LONG = { timeout: 30_000 };
const clock = (t: number) => `0:00:${String(Math.floor(t)).padStart(2, "0")}`;

const film = (page: Page) => page.locator("[data-film]");
const timecode = (page: Page) => page.locator("[data-timecode]");
const chapterButtons = (page: Page) => page.locator("section#xem [data-film] + div button");
const video = (page: Page) => page.locator("video");
const state = (page: Page) =>
  video(page).evaluate((v: HTMLVideoElement) => ({
    paused: v.paused,
    muted: v.muted,
    volume: v.volume,
    time: v.currentTime,
    duration: v.duration,
  }));

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];

  test.describe(`configured film on ${lang}`, () => {
    test("shows the poster and the configured copy, and no film bytes before play", async ({ page }) => {
      const requests: { range: string | undefined }[] = [];
      page.on("request", (r) => {
        if (new URL(r.url()).pathname === SRC) requests.push({ range: r.headers().range });
      });
      await gotoPage(page, lang);
      await expect(video(page)).toHaveCount(1);
      await expect(video(page)).toHaveAttribute("preload", "metadata");
      await expect(video(page)).toHaveAttribute("poster", "/film/poster.jpg");
      await expect
        .poll(() => video(page).evaluate((v: HTMLVideoElement) => v.readyState), LONG)
        .toBeGreaterThanOrEqual(1);
      const section = page.locator("section#xem");
      await expect(section.getByRole("heading", { level: 2 })).toHaveText(c.h2);
      await expect(section.getByText(c.lede, { exact: true })).toBeVisible();
      await expect(film(page).getByText(c.poster, { exact: true })).toBeVisible();
      await expect(film(page).locator("img")).toHaveAttribute("src", "/film/poster.jpg");
      await expect(film(page)).toHaveAttribute("data-source", "film");
      await expect(page.getByText(c.draft, { exact: true })).toHaveCount(0);
      await expect(section.getByText(c.thirtySix)).toHaveCount(0);
      await expect(film(page).locator("[data-on]")).toHaveCount(1);
      await expect(film(page).locator('[data-on="true"]')).toContainText(c.poster.split(" ")[0]);
      // Before play the only request for the file is the metadata one: it asks for a byte range and
      // nothing is paused-then-played or buffered ahead.
      expect(requests.length).toBeGreaterThan(0);
      for (const r of requests) expect(r.range, "a metadata range request").toMatch(/^bytes=0-/);
      expect((await state(page)).paused).toBe(true);
      expect((await state(page)).time).toBe(0);
      await checkAxe(page);
    });

    test("plays with sound from 0:00; timecode and progress follow the film; the poster returns at its end", async ({ page }) => {
      await gotoPage(page, lang);
      await film(page).getByRole("button", { name: c.playVideo, exact: true }).click();
      await expect(film(page)).toHaveAttribute("data-running", "true", LONG);
      await expect.poll(async () => (await state(page)).time, LONG).toBeGreaterThan(0);
      const playing = await state(page);
      expect(playing.paused).toBe(false);
      expect(playing.muted).toBe(false);
      expect(playing.volume).toBeGreaterThan(0);
      expect(playing.duration).toBeGreaterThan(15);
      await film(page).getByRole("button", { name: c.pause, exact: true }).click();
      await expect(film(page)).toHaveAttribute("data-running", "false", LONG);
      // paused now: the video no longer moves, so the UI must settle on exactly what it shows
      const held = await state(page);
      expect(held.paused).toBe(true);
      await expect(timecode(page)).toHaveText(clock(held.time), LONG);
      await expect
        .poll(async () => {
          const track = (await page.locator("[data-progress]").boundingBox())!;
          const filled = (await page.locator("[data-progress] i").boundingBox())!;
          return Math.abs(filled.width / track.width - held.time / held.duration);
        }, LONG)
        .toBeLessThan(0.05);
      await film(page).getByRole("button", { name: c.play, exact: true }).click();
      await expect(film(page)).toHaveAttribute("data-running", "true", LONG);
      await video(page).evaluate((v: HTMLVideoElement) => {
        v.currentTime = v.duration - 0.6;
      });
      await expect(film(page)).toHaveAttribute("data-running", "false", LONG);
      await expect(timecode(page)).toHaveText("0:00:00", LONG);
      await expect
        .poll(async () => (await page.locator("[data-progress] i").boundingBox())?.width ?? 0, LONG)
        .toBe(0);
      await expect(film(page).getByText(c.poster, { exact: true })).toBeVisible(LONG);
      expect((await state(page)).time).toBe(0);
    });

    test("chapters at 0, 5 and 14 s: buttons, jump and arrow keys", async ({ page }) => {
      await gotoPage(page, lang);
      await expect(chapterButtons(page)).toHaveCount(3);
      for (let i = 0; i < 3; i++) await expect(chapterButtons(page).nth(i)).toHaveText(c.chapters[i]);
      // The jump starts playback; the clip is 16 s, so pause on the very first 'playing' event rather than
      // racing a click against real time (a slow runner would run past 0:00:15, or end, before it).
      await video(page).evaluate((v: HTMLVideoElement) => {
        (window as unknown as { played: Promise<void> }).played = new Promise((resolve) =>
          v.addEventListener(
            "playing",
            () => {
              v.pause();
              resolve();
            },
            { once: true },
          ),
        );
      });
      await chapterButtons(page).nth(2).click();
      await page.evaluate(() => (window as unknown as { played: Promise<void> }).played);
      await expect(chapterButtons(page).nth(2)).toHaveAttribute("aria-current", "true", LONG);
      await expect(film(page)).toHaveAttribute("data-running", "false", LONG);
      await expect.poll(async () => (await state(page)).time, LONG).toBeGreaterThanOrEqual(14);
      await expect(timecode(page)).toHaveText(/^0:00:1[4-5]$/, LONG);
      await film(page).focus();
      // ← goes to the last start more than 1 s back: past 15 s that is 14, so step there first
      if ((await state(page)).time > 15) {
        await page.keyboard.press("ArrowLeft");
        await expect(timecode(page)).toHaveText("0:00:14");
      }
      await page.keyboard.press("ArrowLeft");
      await expect(timecode(page)).toHaveText("0:00:05");
      expect((await state(page)).time).toBe(5);
      await page.keyboard.press("ArrowRight");
      await expect(timecode(page)).toHaveText("0:00:14");
      await page.keyboard.press("ArrowRight");
      await expect(timecode(page)).toHaveText("0:00:00");
      await expect(film(page).getByText(c.poster, { exact: true })).toBeVisible();
      await page.keyboard.press("ArrowRight");
      await expect(timecode(page)).toHaveText("0:00:05");
      expect((await state(page)).time).toBe(5);
    });

    test("the captions of the page language are the showing track", async ({ page }) => {
      await gotoPage(page, lang);
      await film(page).getByRole("button", { name: c.playVideo, exact: true }).click();
      await expect(film(page)).toHaveAttribute("data-running", "true", LONG);
      const tracks = () =>
        video(page).evaluate((v: HTMLVideoElement) =>
          [...v.textTracks].map((t) => ({ kind: t.kind, language: t.language, mode: t.mode })),
        );
      await expect.poll(tracks, LONG).toEqual([{ kind: "captions", language: lang, mode: "showing" }]);
      await expect(video(page).locator("track")).toHaveAttribute("src", `/film/${lang}.vtt`);
    });
  });
}

const fails: [string, (page: Page) => Promise<unknown>][] = [
  ["the file request is aborted", (page) => page.route(`**${SRC}`, (r) => r.abort())],
  ["the file returns HTTP 404", (page) => page.route(`**${SRC}`, (r) => r.fulfill({ status: 404, body: "" }))],
  [
    "the file cannot be decoded",
    (page) => page.route(`**${SRC}`, (r) => r.fulfill({ status: 200, contentType: "video/webm", body: "not a video" })),
  ],
];

for (const [name, breakFile] of fails) {
  baseTest(`when ${name}, pressing play plays the animatic (vi)`, async ({ page }) => {
    const errors = collectErrors(page);
    await breakFile(page);
    // hold the clock so the animatic cannot run past its first shot before the checks on a slow runner
    await page.clock.install();
    await gotoPage(page, "vi");
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 500);
    await film(page).getByRole("button", { name: copy.vi.playVideo, exact: true }).click();
    await baseExpect(film(page)).toHaveAttribute("data-source", "animatic");
    await baseExpect(film(page)).toHaveAttribute("data-running", "true");
    await baseExpect(video(page)).toHaveCount(0);
    await baseExpect(film(page).locator('[data-on="true"]')).toContainText(copy.vi.firstShot);
    await baseExpect(film(page).getByText(copy.vi.draft, { exact: true })).toBeVisible();
    await page.clock.runFor(1_100);
    await baseExpect(timecode(page)).not.toHaveText("0:00:00");
    await baseExpect(chapterButtons(page)).toHaveCount(6);
    // The only console errors are the browser's own report of the failed file request.
    baseExpect(errors.filter((e) => !/Failed to load resource/.test(e))).toEqual([]);
  });
}
