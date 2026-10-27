import type { Page } from "@playwright/test";
import { expect, gotoPage, test, VIEWPORTS } from "./support";

const copy = {
  vi: {
    kicker: "/ Xem video",
    lead: "Một đêm hát,",
    accent: "36 giây.",
    h2: "Một đêm hát, 36 giây.",
    lede: "Từ lúc bật TV đến lúc cả phòng vỗ tay. Bản dựng nháp từ chính màn hình BS Kara; video thật sẽ thay vào đây.",
    poster: "Đêm nay hát gì?",
    posterAccent: "hát gì?",
    draft: "Bản dựng nháp",
    playVideo: "Phát video",
    play: "Phát",
    pause: "Dừng",
    playText: "▶ Phát",
    pauseText: "❚❚ Dừng",
    keys: "← → chương",
    watch: "▶ Xem 36 giây",
    chapters: ["Bật TV", "Quét mã", "Chọn bài", "MC dẫn", "Cả phòng hát", "Điểm số"],
  },
  en: {
    kicker: "/ Watch",
    lead: "One night of singing,",
    accent: "36 seconds.",
    h2: "One night of singing, 36 seconds.",
    lede: "From switching on the TV to the whole room clapping. A rough cut made from BS Kara's own screens; the real film goes here.",
    poster: "What are we singing tonight?",
    posterAccent: "singing tonight?",
    draft: "Rough cut",
    playVideo: "Play video",
    play: "Play",
    pause: "Pause",
    playText: "▶ Play",
    pauseText: "❚❚ Pause",
    keys: "← → chapters",
    watch: "▶ Watch 36 sec",
    chapters: ["TV on", "Scan", "Pick songs", "The host", "Everyone sings", "Score"],
  },
} as const;
const SHOTS = {
  vi: [
    ["Bật TV", "kara.bahuynh.com/tv · mã phòng 7108"],
    ["Quét mã", "Mỗi người một điện thoại"],
    ["Chọn bài", "Hàng chờ chung trên TV"],
    ["MC dẫn", "Lời giới thiệu riêng cho từng bài"],
    ["Cả phòng hát", "Thả cảm xúc từ điện thoại"],
    ["98", "Điểm số · Hát tiếp bài sau"],
  ],
  en: [
    ["TV on", "kara.bahuynh.com/tv · room 7108"],
    ["Scan", "Everyone on their own phone"],
    ["Pick songs", "One shared queue on the TV"],
    ["The host", "A line written for every song"],
    ["Everyone sings", "Reactions from every phone"],
    ["98", "Score · next song up"],
  ],
} as const;
const FRAME_NAME = {
  vi: "Trình phát video. Phím mũi tên trái, phải để chuyển chương.",
  en: "Video player. Left and right arrow keys change chapter.",
} as const;
const TIMES = ["0:00", "0:06", "0:12", "0:18", "0:24", "0:30"];

const film = (page: Page) => page.locator("[data-film]");
const timecode = (page: Page) => page.locator("[data-timecode]");
const shown = (page: Page) => film(page).locator('[data-on="true"]');
const chapterButtons = (page: Page) => page.locator("section#xem").locator("[data-film] + div button");
const activeButtons = (page: Page) => page.locator('section#xem [data-film] + div button[aria-current="true"]');
const fill = (page: Page) => page.locator("[data-progress] i");

/** Fake clock, paused after load so that only runFor advances the film. */
async function openWithClock(page: Page, lang: "vi" | "en") {
  await page.clock.install();
  await gotoPage(page, lang);
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
}

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];

  test.describe(`film chapter on ${lang}`, () => {
    test("heading, kicker and lede", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const section = page.locator("section#xem");
      const kicker = section.locator("b").first().locator("..");
      await expect(kicker.locator("b")).toHaveText("01");
      await expect(kicker.locator("span")).toHaveText(c.kicker);
      await expect(kicker.locator("b")).toHaveCSS("color", "rgb(243, 239, 232)");
      await expect(kicker.locator("span")).toHaveCSS("color", "rgb(141, 139, 135)");
      const h2 = section.getByRole("heading", { level: 2 });
      await expect(h2).toHaveText(c.h2);
      await expect(h2).toHaveCSS("font-family", /archivo/i);
      await expect(h2).toHaveCSS("font-weight", "900");
      await expect(h2).toHaveCSS("text-transform", "uppercase");
      expect(await h2.evaluate((el) => getComputedStyle(el).fontVariationSettings)).toContain("112");
      const em = h2.locator("em");
      await expect(em).toHaveText(c.accent);
      await expect(em).toHaveCSS("font-style", "italic");
      await expect(em).toHaveCSS("color", "rgb(255, 233, 196)");
      await expect(em).toHaveCSS("font-family", /playfair/i);
      await expect(section.getByText(c.lede, { exact: true })).toBeVisible();
    });

    test("head grid: two columns at 1440, stacked at 768", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const section = page.locator("section#xem");
      const box = async () => ({
        left: (await section.locator("h2").locator("..").boundingBox())!,
        kicker: (await section.locator("b").first().boundingBox())!,
        h2: (await section.locator("h2").boundingBox())!,
        lede: (await section.getByText(c.lede, { exact: true }).boundingBox())!,
      });
      let b = await box();
      const colLeft = b.left;
      expect(b.lede.x).toBeGreaterThanOrEqual(colLeft.x + colLeft.width + 40 - 1);
      expect(b.lede.x - (colLeft.x + colLeft.width)).toBeCloseTo(40, 0);
      expect(colLeft.width / (1128 - colLeft.width)).toBeCloseTo(1.4, 1);
      expect(b.lede.y + b.lede.height).toBeCloseTo(colLeft.y + colLeft.height, 0);
      await page.setViewportSize(VIEWPORTS.tablet);
      b = await box();
      expect(b.lede.y).toBeGreaterThanOrEqual(b.h2.y + b.h2.height);
    });

    test("frame: 16:9, border, scanlines, poster, transport bar", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const frame = film(page);
      const box = (await frame.boundingBox())!;
      expect(Math.abs(box.height - (box.width * 9) / 16)).toBeLessThanOrEqual(1);
      await expect(frame).toHaveCSS("border-top-width", "1px");
      await expect(frame).toHaveCSS("border-top-color", "rgba(255, 255, 255, 0.16)");
      await expect(frame).toHaveCSS("background-color", "rgb(5, 5, 6)");
      const scan = await frame.evaluate((el) => {
        const screen = el.firstElementChild!;
        return getComputedStyle(screen, "::after").backgroundImage;
      });
      expect(scan).toContain("repeating-linear-gradient");
      expect(scan).toMatch(/rgba\(255, 255, 255, 0\.02\d*\) 0px, rgba\(255, 255, 255, 0\.02\d*\) 1px/);
      expect(scan).toMatch(/rgba\(0, 0, 0, 0\) 1px, rgba\(0, 0, 0, 0\) 3px/);

      await expect(frame.getByText(c.poster, { exact: true })).toBeVisible();
      const em = frame.locator("em");
      await expect(em).toHaveText(c.posterAccent);
      await expect(em).toHaveCSS("color", "rgb(255, 233, 196)");
      const big = frame.getByRole("button", { name: c.playVideo, exact: true });
      const bb = (await big.boundingBox())!;
      expect([bb.width, bb.height]).toEqual([84, 84]);
      await expect(big).toHaveCSS("border-radius", "50%");
      const text = (await em.locator("..").boundingBox())!;
      expect(bb.y).toBeGreaterThan(text.y + text.height);
      const draft = frame.getByText(c.draft, { exact: true });
      await expect(draft).toHaveCSS("color", "rgb(141, 139, 135)");
      const draftBox = (await draft.boundingBox())!;
      expect(draftBox.x - box.x).toBeLessThan(30);
      expect(draftBox.y - box.y).toBeLessThan(30);
      const rec = frame.getByText("REC", { exact: true });
      const recBox = (await rec.boundingBox())!;
      expect(box.x + box.width - (recBox.x + recBox.width)).toBeLessThan(30);
      expect(recBox.y - box.y).toBeLessThan(30);
      await expect(rec.locator("b")).toHaveCSS("background-color", "rgb(255, 74, 43)");

      const toggle = frame.getByRole("button", { name: c.play, exact: true });
      await expect(toggle).toHaveText(c.playText);
      await expect(timecode(page)).toHaveText("0:00:00");
      const prog = (await page.locator("[data-progress]").boundingBox())!;
      expect(prog.height).toBe(2);
      expect((await fill(page).boundingBox())?.width ?? 0).toBe(0);
      const keys = frame.getByText(c.keys, { exact: true });
      await expect(keys).toBeVisible();
      const xs = [toggle, timecode(page), page.locator("[data-progress]"), keys].map(async (l) => (await l.boundingBox())!.x);
      const order = await Promise.all(xs);
      expect(order).toEqual([...order].sort((a, b2) => a - b2));
      const barY = (await toggle.boundingBox())!.y;
      expect(barY).toBeGreaterThan(box.y + box.height - 60);
    });

    test("no film is configured: the animatic plays and the page has no video element", async ({ page }) => {
      await gotoPage(page, lang);
      expect(await page.evaluate(() => document.querySelector("video"))).toBeNull();
      await expect(film(page)).toHaveAttribute("data-source", "animatic");
    });

    test("six chapter buttons: texts, colour, row and grid", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const buttons = page.locator("section#xem").locator("[data-film] + div button");
      await expect(buttons).toHaveCount(6);
      for (let i = 0; i < 6; i++) {
        await expect(buttons.nth(i)).toHaveText(`${TIMES[i]}${c.chapters[i]}`);
        await expect(buttons.nth(i)).toHaveCSS("color", "rgb(141, 139, 135)");
        await expect(buttons.nth(i).locator("span")).toHaveText(c.chapters[i]);
      }
      const rows = async () => {
        const ys = await buttons.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().y)));
        return [...new Set(ys)].length;
      };
      expect(await rows()).toBe(1);
      await page.setViewportSize(VIEWPORTS.tablet);
      expect(await rows()).toBe(2);
      const xs = await buttons.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)));
      expect(new Set(xs).size).toBe(3);
      expect(xs.slice(0, 3)).toEqual(xs.slice(3));
    });

    test("large play button and transport toggle both start the film", async ({ page }) => {
      await openWithClock(page, lang);
      const frame = film(page);
      await frame.getByRole("button", { name: c.playVideo, exact: true }).click();
      await expect(frame.getByRole("button", { name: c.pause, exact: true })).toHaveText(c.pauseText);
      await expect(timecode(page)).toHaveText("0:00:00");
      await expect(frame).toHaveAttribute("data-running", "true");
      await expect(frame.getByText(c.chapters[0], { exact: true }).first()).toBeVisible();
      await frame.getByRole("button", { name: c.pause, exact: true }).click();
      await expect(frame.getByRole("button", { name: c.play, exact: true })).toBeVisible();
      await page.reload();
      await page.clock.install();
      const toggle = film(page).getByRole("button", { name: c.play, exact: true });
      await toggle.click();
      await expect(film(page).getByRole("button", { name: c.pause, exact: true })).toHaveText(c.pauseText);
      await expect(timecode(page)).toHaveText(/^0:00:0[0-1]$/);
    });

    test("10 s in, the timecode and progress follow the clock", async ({ page }) => {
      await openWithClock(page, lang);
      const frame = film(page);
      await frame.getByRole("button", { name: c.play, exact: true }).click();
      await expect(frame).toHaveAttribute("data-running", "true");
      await page.clock.runFor(10_100);
      await expect(timecode(page)).toHaveText("0:00:10");
      const track = (await page.locator("[data-progress]").boundingBox())!;
      const filled = (await fill(page).boundingBox())!;
      expect((filled.width / track.width) * 100).toBeGreaterThan(26.8);
      expect((filled.width / track.width) * 100).toBeLessThan(28.8);
      await expect(fill(page)).toHaveCSS("background-color", "rgb(255, 74, 43)");
    });

    test("pausing at 14.3 s holds the time and playing resumes from it", async ({ page }) => {
      await openWithClock(page, lang);
      const frame = film(page);
      await frame.getByRole("button", { name: c.play, exact: true }).click();
      await expect(frame).toHaveAttribute("data-running", "true");
      await page.clock.runFor(14_320);
      await frame.getByRole("button", { name: c.pause, exact: true }).click();
      const toggle = frame.getByRole("button", { name: c.play, exact: true });
      await expect(toggle).toHaveText(c.playText);
      await expect(timecode(page)).toHaveText("0:00:14");
      await page.clock.runFor(5_000);
      await expect(timecode(page)).toHaveText("0:00:14");
      await expect(frame.getByText(c.chapters[2], { exact: true }).first()).toBeVisible();
      await toggle.click();
      await expect(frame).toHaveAttribute("data-running", "true");
      await page.clock.runFor(1_000);
      await expect(timecode(page)).toHaveText("0:00:15");
    });

    test("at 36 s the film returns to its poster", async ({ page }) => {
      await openWithClock(page, lang);
      const frame = film(page);
      await frame.getByRole("button", { name: c.play, exact: true }).click();
      await expect(frame).toHaveAttribute("data-running", "true");
      await page.clock.runFor(35_100);
      await expect(timecode(page)).toHaveText("0:00:35");
      await page.clock.runFor(1_100);
      await expect(frame).toHaveAttribute("data-running", "false");
      await expect(timecode(page)).toHaveText("0:00:00");
      expect((await fill(page).boundingBox())?.width ?? 0).toBe(0);
      await expect(frame.getByRole("button", { name: c.play, exact: true })).toHaveText(c.playText);
      await expect(frame.getByRole("button", { name: c.playVideo, exact: true })).toBeVisible();
      await expect(frame.getByText(c.poster, { exact: true })).toBeVisible();
    });

    test("the shot follows the chapter containing the current time", async ({ page }) => {
      await openWithClock(page, lang);
      const frame = film(page);
      await frame.getByRole("button", { name: c.playVideo, exact: true }).click();
      await expect(frame).toHaveAttribute("data-running", "true");
      await expect(shown(page)).toContainText(SHOTS[lang][0][0]);
      await page.clock.runFor(5_900);
      await expect(shown(page)).toContainText(SHOTS[lang][0][0]);
      await page.clock.runFor(150);
      await expect(shown(page)).toContainText(SHOTS[lang][1][0]);
    });

    test("every shot shows its big and sub text; the 31 s shot is 98", async ({ page }) => {
      await openWithClock(page, lang);
      const frame = film(page);
      await chapterButtons(page).first().click();
      await expect(frame).toHaveAttribute("data-running", "true");
      for (let i = 0; i < 6; i++) {
        await chapterButtons(page).nth(i).click();
        await page.clock.runFor(1_100);
        const on = shown(page);
        await expect(on).toHaveCount(1);
        await expect(on.locator("div > div").first()).toHaveText(SHOTS[lang][i][0]);
        await expect(on.locator("div > div").nth(1)).toHaveText(SHOTS[lang][i][1]);
      }
      await expect(timecode(page)).toHaveText("0:00:31");
      const on = shown(page);
      await expect(on.locator("div > div").first()).toHaveCSS("font-family", /archivo/i);
      await expect(on.locator("div > div").first()).toHaveCSS("font-weight", "900");
      await expect(on.locator("div > div").first()).toHaveCSS("text-transform", "uppercase");
      await expect(on.locator("div > div").nth(1)).toHaveCSS("color", "rgb(141, 139, 135)");
      await expect(on.locator("div > div").nth(1)).toHaveCSS("font-family", /mono/i);
    });

    test("exactly one shot is visible and exposed to assistive technology", async ({ page }) => {
      await openWithClock(page, lang);
      const frame = film(page);
      const check = async (name: string) => {
        await expect(shown(page)).toHaveCount(1);
        await expect(shown(page)).toContainText(name);
        const exposed = await frame.evaluate((el) =>
          [...el.querySelectorAll("[data-on]")].map((s) => ({
            on: s.getAttribute("data-on"),
            hidden: s.getAttribute("aria-hidden"),
            focusable: s.querySelectorAll("button").length > 0 && !(s as HTMLElement).inert,
          })),
        );
        expect(exposed.filter((s) => s.hidden === "false" || s.hidden === null)).toHaveLength(1);
        expect(exposed.find((s) => s.on === "true")?.hidden).toBe("false");
        expect(exposed.filter((s) => s.on === "false").every((s) => s.hidden === "true" && !s.focusable)).toBe(true);
      };
      await check(c.poster.split(" ")[0]);
      await frame.getByRole("button", { name: c.playVideo, exact: true }).click();
      await page.clock.runFor(100);
      await check(SHOTS[lang][0][0]);
      await page.clock.runFor(5_800);
      await check(SHOTS[lang][0][0]);
      await page.clock.runFor(200);
      await check(SHOTS[lang][1][0]);
      await page.clock.runFor(11_000);
      await check(SHOTS[lang][2][0]);
      await page.clock.runFor(18_800);
      await check(SHOTS[lang][5][0]);
      await expect(page.getByRole("button", { name: c.playVideo, exact: true })).toHaveCount(0);
    });

    test("the shot swap cross-fades over 0.5 s", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const shots = film(page).locator("[data-on]");
      for (let i = 0; i < 7; i++) await expect(shots.nth(i)).toHaveCSS("transition-duration", "0.5s");
      await expect(shots.nth(0)).toHaveCSS("transition-property", "opacity");
    });

    test("activating a chapter from the poster plays from its start", async ({ page }) => {
      await openWithClock(page, lang);
      const frame = film(page);
      await expect(activeButtons(page)).toHaveCount(0);
      const button = chapterButtons(page).nth(3);
      await button.click();
      await expect(frame).toHaveAttribute("data-running", "true");
      await expect(timecode(page)).toHaveText("0:00:18");
      await expect(shown(page)).toContainText(c.chapters[3]);
      await expect(button).toHaveAttribute("aria-current", "true");
      await expect(button).toHaveCSS("background-color", "rgb(15, 15, 17)");
      await expect(button).toHaveCSS("color", "rgb(243, 239, 232)");
    });

    test("activating a chapter while playing jumps and keeps playing; paused it plays", async ({ page }) => {
      await openWithClock(page, lang);
      const frame = film(page);
      await frame.getByRole("button", { name: c.play, exact: true }).click();
      await page.clock.runFor(3_000);
      await chapterButtons(page).nth(5).click();
      await expect(timecode(page)).toHaveText("0:00:30");
      await expect(frame).toHaveAttribute("data-running", "true");
      await expect(activeButtons(page)).toHaveCount(1);
      await expect(chapterButtons(page).nth(5)).toHaveAttribute("aria-current", "true");
      await chapterButtons(page).nth(3).click();
      await page.clock.runFor(2_100);
      await frame.getByRole("button", { name: c.pause, exact: true }).click();
      await expect(timecode(page)).toHaveText("0:00:20");
      await expect(frame).toHaveAttribute("data-running", "false");
      await chapterButtons(page).nth(1).click();
      await expect(timecode(page)).toHaveText("0:00:06");
      await expect(frame).toHaveAttribute("data-running", "true");
    });

    test("the active chapter button follows the film; none on the poster", async ({ page }) => {
      await openWithClock(page, lang);
      const frame = film(page);
      await expect(activeButtons(page)).toHaveCount(0);
      await chapterButtons(page).nth(1).click();
      await page.clock.runFor(4_100);
      await expect(timecode(page)).toHaveText("0:00:10");
      await expect(chapterButtons(page).nth(1)).toHaveAttribute("aria-current", "true");
      await page.clock.runFor(2_100);
      await expect(chapterButtons(page).nth(2)).toHaveAttribute("aria-current", "true");
      await expect(chapterButtons(page).nth(1)).not.toHaveAttribute("aria-current", "true");
      await expect(activeButtons(page)).toHaveCount(1);
      await page.clock.runFor(30_000);
      await expect(frame).toHaveAttribute("data-running", "false");
      await expect(activeButtons(page)).toHaveCount(0);
    });

    test("the frame is a tab stop with its name; arrow keys jump chapters", async ({ page }) => {
      await openWithClock(page, lang);
      const frame = film(page);
      await expect(frame).toHaveAttribute("aria-label", FRAME_NAME[lang]);
      await frame.focus();
      await page.keyboard.press("ArrowRight");
      await expect(timecode(page)).toHaveText("0:00:06");
      await expect(shown(page)).toContainText(SHOTS[lang][1][0]);
      await expect(frame).toHaveAttribute("data-running", "false");
      await page.keyboard.press("ArrowLeft");
      await expect(timecode(page)).toHaveText("0:00:00");
      await expect(frame.getByText(c.poster, { exact: true })).toBeVisible();
      await page.keyboard.press("ArrowLeft");
      await expect(timecode(page)).toHaveText("0:00:00");
    });

    test("right arrow wraps to 0 from the last chapter, paused or playing", async ({ page }) => {
      await openWithClock(page, lang);
      const frame = film(page);
      await frame.focus();
      for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
      await expect(timecode(page)).toHaveText("0:00:30");
      await page.keyboard.press("ArrowRight");
      await expect(timecode(page)).toHaveText("0:00:00");
      await expect(frame.getByText(c.poster, { exact: true })).toBeVisible();
      await chapterButtons(page).nth(5).click();
      await page.clock.runFor(1_000);
      await frame.focus();
      await page.keyboard.press("ArrowRight");
      await expect(timecode(page)).toHaveText("0:00:00");
      await expect(frame).toHaveAttribute("data-running", "true");
      await expect(shown(page)).toContainText(SHOTS[lang][0][0]);
    });

    test("left arrow goes to the current or previous chapter start", async ({ page }) => {
      await openWithClock(page, lang);
      const frame = film(page);
      await chapterButtons(page).nth(1).click();
      await page.clock.runFor(1_500);
      await frame.getByRole("button", { name: c.pause, exact: true }).click();
      await expect(timecode(page)).toHaveText("0:00:07");
      await frame.focus();
      await page.keyboard.press("ArrowLeft");
      await expect(timecode(page)).toHaveText("0:00:06");
      await frame.getByRole("button", { name: c.play, exact: true }).click();
      await page.clock.runFor(500);
      await frame.getByRole("button", { name: c.pause, exact: true }).click();
      await frame.focus();
      await page.keyboard.press("ArrowLeft");
      await expect(timecode(page)).toHaveText("0:00:00");
    });

    test("arrow keys on a chapter button do not move the film", async ({ page }) => {
      await openWithClock(page, lang);
      await chapterButtons(page).nth(1).click();
      await page.clock.runFor(1_100);
      await film(page).getByRole("button", { name: c.pause, exact: true }).click();
      await expect(timecode(page)).toHaveText("0:00:07");
      await chapterButtons(page).nth(4).focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowLeft");
      await expect(timecode(page)).toHaveText("0:00:07");
    });

    test("the large play button leaves the tab order while playing; Tab leaves the frame", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      // hold the film clock: a slow machine must not reach the 6 s shot swap while focus is checked
      await openWithClock(page, lang);
      const frame = film(page);
      await frame.getByRole("button", { name: c.playVideo, exact: true }).click();
      await expect(frame).toHaveAttribute("data-running", "true");
      await frame.focus();
      await page.keyboard.press("Tab");
      await expect(frame.getByRole("button", { name: c.pause, exact: true })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(chapterButtons(page).first()).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(frame.getByRole("button", { name: c.pause, exact: true })).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(frame).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(frame).not.toBeFocused();
      await expect(frame.locator(":focus")).toHaveCount(0);
    });

    test("the shot swap is instant with the pause toggle while the timecode advances", async ({ page }) => {
      await openWithClock(page, lang);
      await page.getByRole("navigation").getByRole("button", { name: lang === "vi" ? "Dừng chuyển động" : "Pause motion" }).click();
      const frame = film(page);
      await frame.getByRole("button", { name: c.play, exact: true }).click();
      await page.clock.runFor(6_100);
      await expect(timecode(page)).toHaveText("0:00:06");
      await expect(shown(page)).toContainText(SHOTS[lang][1][0]);
      await expect(shown(page)).toHaveCSS("transition-duration", "0s");
      await expect(shown(page)).toHaveCSS("opacity", "1");
    });

    test("the hero film link scrolls to the chapter and leaves the film on its poster", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      await page.locator("header#top").getByRole("link", { name: c.watch, exact: true }).click();
      await expect
        .poll(async () => (await page.locator("section#xem").boundingBox())!.y, { timeout: 20_000 })
        .toBeGreaterThanOrEqual(56);
      // smooth scrolling runs on animation frames, which a loaded machine slows down
      await expect.poll(() => page.evaluate(() => scrollY), { timeout: 20_000 }).toBeGreaterThan(300);
      await page.waitForTimeout(800);
      expect((await page.locator("section#xem").boundingBox())!.y).toBeGreaterThanOrEqual(56);
      await expect(film(page)).toHaveAttribute("data-running", "false");
      await expect(film(page).getByRole("button", { name: c.play, exact: true })).toHaveText(c.playText);
      await expect(timecode(page)).toHaveText("0:00:00");
    });

    test("the transport bar hides the key hint at 375", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoPage(page, lang);
      const frame = film(page);
      await expect(frame.getByText(c.keys, { exact: true })).toBeHidden();
      await expect(frame.getByRole("button", { name: c.play, exact: true })).toBeVisible();
      await expect(timecode(page)).toBeVisible();
      await expect(page.locator("[data-progress]")).toBeVisible();
      const big = (await frame.getByRole("button", { name: c.playVideo, exact: true }).boundingBox())!;
      const draft = (await frame.getByText(c.draft, { exact: true }).boundingBox())!;
      const bar = (await frame.getByRole("button", { name: c.play, exact: true }).boundingBox())!;
      expect(big.y).toBeGreaterThan(draft.y + draft.height);
      expect(big.y + big.height).toBeLessThanOrEqual(bar.y);
    });

    for (const key of ["mobile", "tablet", "desktop"] as const) {
      test(`no horizontal overflow at ${key}`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS[key]);
        await gotoPage(page, lang);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      });
    }
  });
}
