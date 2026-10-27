import type { Locator, Page } from "@playwright/test";
import { expect, gotoPage, test, VIEWPORTS } from "./support";

const SONGS = ["Cụng Ly Nào", "Mây Lang Thang", "Về Nhà Thôi", "Nắng Qua Hiên", "Đêm Nay Hát", "Mưa Phố Nhỏ", "Hát Tiếp Đi", "Phố Đêm"];
const FG = "rgb(243, 239, 232)";
const DIM = "rgb(85, 83, 79)";

const copy = {
  vi: {
    kicker: "/ Quay bài",
    h2: "Chưa biết hát gì? Quay.",
    accent: "Quay.",
    lede: "Ai cũng từng đứng trước danh sách mười nghìn bài. Quay một vòng, bài trúng lên thẳng TV, hàng chờ tự cập nhật.",
    button: "Quay bài",
    note: "Bài minh hoạ",
    tv: "Trên TV",
    room: "Phòng 7108",
    empty: "Hàng chờ trống",
    queue: "Hàng chờ",
  },
  en: {
    kicker: "/ Spin",
    h2: "Nothing to sing? Spin.",
    accent: "Spin.",
    lede: "Everyone has stared at a list of ten thousand songs. Spin once, the winner goes straight to the TV and the queue updates itself.",
    button: "Spin",
    note: "Sample songs",
    tv: "On the TV",
    room: "Room 7108",
    empty: "Queue is empty",
    queue: "Queue",
  },
} as const;

const section = (page: Page) => page.locator("section#quay");
const reel = (page: Page) => page.locator("[data-reel]");
const rows = (page: Page) => reel(page).locator("li");
const hits = (page: Page) => reel(page).locator("li[data-hit]");
const button = (page: Page, lang: "vi" | "en") => section(page).getByRole("button", { name: copy[lang].button, exact: true });

/** Fake clock, paused after load, with the canvases hidden so fake time does not draw every frame. */
async function freezeTime(page: Page) {
  await page.clock.install();
}
async function startTime(page: Page, lang: "vi" | "en") {
  await gotoPage(page, lang);
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
  await page.evaluate(() => document.querySelectorAll("canvas").forEach((c) => (c.style.display = "none")));
  await section(page).scrollIntoViewIfNeeded();
  // the chapter block fades in 24 px up as it appears; let it land before positions are measured
  const block = section(page).locator(".wrap > *").last();
  await expect(block).not.toHaveAttribute("data-reveal", "pending");
  await block.evaluate((el) => el.getAnimations().forEach((a) => a.finish()));
}
const tv = (page: Page) => page.locator("[data-tv]");
const queueRows = (page: Page) => tv(page).getByRole("listitem");
const lyric = (page: Page) => tv(page).locator("[data-lyric]");
const sungWords = (page: Page) =>
  lyric(page).evaluate((el) => {
    const words = [...el.children];
    return {
      sung: words.filter((w) => getComputedStyle(w).color === "rgb(243, 239, 232)").length,
      dim: words.filter((w) => getComputedStyle(w).color === "rgba(243, 239, 232, 0.5)").length,
      total: words.length,
    };
  });
/** WCAG contrast of the unsung word colour over the TV screen's own background. */
const unsungContrast = (page: Page) =>
  lyric(page).evaluate((el) => {
    const lin = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const parse = (c: string) => c.match(/[\d.]+/g)!.map(Number);
    const lum = ([r, g, b]: number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const [r, g, b, a = 1] = parse(getComputedStyle(el.firstElementChild!).color);
    const bg = parse(getComputedStyle(el.parentElement!).backgroundColor);
    const mixed = [r, g, b].map((v, i) => v * a + bg[i] * (1 - a));
    const [hi, lo] = [lum(mixed), lum(bg)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  });
const press = async (page: Page, lang: "vi" | "en", random: number) => {
  await page.evaluate((r) => {
    Math.random = () => r;
  }, random);
  // the fake clock is paused, so Playwright's rAF-based stability wait would hang
  await button(page, lang).dispatchEvent("click");
  await page.clock.runFor(3300);
  await expect(hits(page)).toHaveCount(1);
};
const colours = (page: Page) =>
  rows(page).evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
const shiftY = (list: Locator) =>
  list.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];

  test.describe(`spin chapter on ${lang}`, () => {
    test("heading, kicker and lede", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const s = section(page);
      await expect(s.locator("b")).toHaveText("02");
      await expect(s.locator("b + span")).toHaveText(c.kicker);
      const h2 = s.getByRole("heading", { level: 2 });
      await expect(h2).toHaveText(c.h2);
      await expect(h2.locator("em")).toHaveText(c.accent);
      await expect(s.getByText(c.lede, { exact: true })).toBeVisible();
    });

    test("reel at 1440: three 110 px rows, fonts, colours, hairlines and fade", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      await expect(rows(page)).toHaveCount(64);
      const texts = await rows(page).allTextContents();
      expect(texts.slice(0, 16)).toEqual([...SONGS, ...SONGS]);
      const box = (await reel(page).boundingBox())!;
      expect(box.height).toBe(330);
      const heights = await rows(page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
      expect(new Set(heights)).toEqual(new Set([110]));
      const first = rows(page).nth(0);
      await expect(first).toHaveCSS("font-weight", "900");
      await expect(first).toHaveCSS("font-family", /archivo/i);
      await expect(first).toHaveCSS("text-transform", "uppercase");
      await expect(first).toHaveCSS("font-variation-settings", /"wdth" 108/);
      await expect(first).toHaveCSS("font-size", "48.96px");
      await expect(reel(page)).toHaveCSS("overflow", "hidden");
      expect(await reel(page).evaluate((el) => getComputedStyle(el).maskImage)).toContain("linear-gradient");
      const hairlines = await reel(page).evaluate((el) => {
        const s = getComputedStyle(el, "::before");
        return [s.top, s.height, s.borderTopWidth, s.borderBottomWidth, s.borderTopColor];
      });
      expect(hairlines).toEqual(["110px", "110px", "1px", "1px", "rgba(255, 255, 255, 0.16)"]);
      const middle = (await rows(page).nth(1).boundingBox())!;
      expect(middle.y - box.y).toBe(110);
      const colour = await colours(page);
      expect(colour[1]).toBe(FG);
      expect(colour.filter((x) => x === FG)).toHaveLength(1);
      expect(colour[0]).toBe(DIM);
      expect(colour[2]).toBe(DIM);
      expect(await shiftY(reel(page).locator("ul"))).toBe(0);
    });

    test("reel at 375: three 80 px rows in a 240 px window", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoPage(page, lang);
      expect((await reel(page).boundingBox())!.height).toBe(240);
      const heights = await rows(page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
      expect(new Set(heights)).toEqual(new Set([80]));
      const hairline = await reel(page).evaluate((el) => {
        const s = getComputedStyle(el, "::before");
        return [s.top, s.height];
      });
      expect(hairline).toEqual(["80px", "80px"]);
    });

    test("footer, TV panel and queue at rest", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const b = button(page, lang);
      await expect(b).toBeVisible();
      await expect(b).toHaveClass(/solid/);
      await expect(b).toHaveCSS("background-color", FG);
      await expect(section(page).getByText(c.note, { exact: true })).toBeVisible();
      const tv = page.locator("[data-tv]");
      await expect(tv.getByText(c.tv, { exact: true })).toBeVisible();
      await expect(tv.getByText("BS KARA", { exact: true })).toBeVisible();
      await expect(tv.getByText(c.room, { exact: true })).toBeVisible();
      await expect(tv.getByText(c.empty, { exact: true })).toBeVisible();
      await expect(tv.getByText(c.queue, { exact: true })).toBeVisible();
      const items = tv.getByRole("listitem");
      await expect(items).toHaveCount(2);
      await expect(items.nth(0)).toHaveText("Mây Lang ThangLan");
      await expect(items.nth(1)).toHaveText("Đêm Nay HátMinh");
      const screen = tv.getByText(c.empty, { exact: true }).locator("..");
      expect(await screen.evaluate((el) => el.children.length)).toBe(2);
    });

    test("reel left (1.2 : 1) of the TV above 900 px, above it at 768", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const box = async () => ({
        reelbox: (await reel(page).locator("..").boundingBox())!,
        tv: (await page.locator("[data-tv]").boundingBox())!,
      });
      let b = await box();
      expect(b.reelbox.x + b.reelbox.width).toBeLessThanOrEqual(b.tv.x + 1);
      expect(Math.abs(b.reelbox.width / b.tv.width - 1.2)).toBeLessThan(0.02);
      await page.setViewportSize(VIEWPORTS.tablet);
      b = await box();
      expect(b.reelbox.y + b.reelbox.height).toBeLessThanOrEqual(b.tv.y + 1);
      expect(Math.abs(b.reelbox.x - b.tv.x)).toBeLessThan(1);
    });

    test("the title list is hidden from assistive technology and each title is lang=vi", async ({ page }) => {
      await gotoPage(page, lang);
      await expect(reel(page).locator("ul")).toHaveAttribute("aria-hidden", "true");
      const snapshot = await section(page).ariaSnapshot();
      for (const song of SONGS.filter((s) => s !== "Mây Lang Thang" && s !== "Đêm Nay Hát")) {
        expect(snapshot).not.toContain(song);
      }
      const langs = await rows(page).evaluateAll((els) => els.map((el) => el.getAttribute("lang")));
      expect(new Set(langs)).toEqual(new Set(["vi"]));
      const queueLangs = await page.locator("[data-tv] li > span:first-child").evaluateAll((els) => els.map((el) => el.getAttribute("lang")));
      expect(queueLangs).toEqual(["vi", "vi"]);
    });

    test("a spin runs 3.2 s with ease-out and lands one song 3.3 s after the press", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await freezeTime(page);
      await startTime(page, lang);
      const list = reel(page).locator("ul");
      const b = button(page, lang);
      await expect(b).toHaveAttribute("aria-disabled", "false");
      await expect(list).toHaveCSS("transition-property", "none");
      await b.click();
      await expect(b).toHaveAttribute("aria-disabled", "true");
      await expect(hits(page)).toHaveCount(0);
      await page.clock.runFor(100);
      await expect(list).toHaveCSS("transition-duration", "3.2s");
      await expect(list).toHaveCSS("transition-property", "transform");
      await expect(list).toHaveCSS("transition-timing-function", "cubic-bezier(0.12, 0.75, 0.12, 1)");
      // end the running transition now instead of waiting 3.2 s of real time
      await list.evaluate((el) => el.getAnimations().forEach((a) => a.finish()));
      expect(await shiftY(list)).toBeLessThan(0);
      await page.clock.runFor(3100);
      await expect(hits(page)).toHaveCount(0);
      await page.clock.runFor(100);
      await expect(hits(page)).toHaveCount(1);
      await expect(b).toHaveAttribute("aria-disabled", "false");
      const colour = await colours(page);
      expect(colour.filter((x) => x === FG)).toHaveLength(1);
      expect(colour.filter((x) => x === DIM)).toHaveLength(63);
      const hit = hits(page);
      const index = await rows(page).evaluateAll((els) => els.findIndex((el) => el.hasAttribute("data-hit")));
      expect(index).toBeGreaterThan(8);
      expect(await shiftY(list)).toBe(-(index - 1) * 110);
      const top = (await reel(page).boundingBox())!.y;
      expect((await hit.boundingBox())!.y - top).toBe(110);
      expect(SONGS).toContain(await hit.textContent());
    });

    test("pressing again while spinning changes nothing", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await freezeTime(page);
      await startTime(page, lang);
      const b = button(page, lang);
      await b.click();
      await page.clock.runFor(1000);
      const before = await shiftY(reel(page).locator("ul"));
      await expect(b).toHaveAttribute("aria-disabled", "true");
      // the fake clock is paused, so Playwright's rAF-based stability wait would hang
      await b.dispatchEvent("click");
      await b.dispatchEvent("click");
      await expect(page.locator("[data-tv]").getByRole("listitem")).toHaveCount(2);
      await page.clock.runFor(2400);
      await expect(hits(page)).toHaveCount(1);
      expect(before).toBeLessThan(0);
      // one landing, one new row: the presses while spinning added none
      await expect(page.locator("[data-tv]").getByRole("listitem")).toHaveCount(3);
    });

    test("after a landing it spins and lands again, the same song may win twice", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await freezeTime(page);
      await startTime(page, lang);
      const b = button(page, lang);
      const winner = async () => {
        await page.evaluate(() => {
          Math.random = () => 0.3;
        });
        await b.click();
        await page.clock.runFor(50);
        await expect(hits(page)).toHaveCount(0);
        await expect(b).toHaveAttribute("aria-disabled", "true");
        await page.clock.runFor(3300);
        await expect(hits(page)).toHaveCount(1);
        return hits(page).textContent();
      };
      expect(await winner()).toBe("Về Nhà Thôi");
      expect(await winner()).toBe("Về Nhà Thôi");
    });

    test("landing on a song: TV label, title and unsung line, queue row and announcement", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await freezeTime(page);
      await startTime(page, lang);
      await press(page, lang, 0.3);
      await expect(tv(page).getByText(c.room, { exact: true })).toHaveCount(0);
      const live = tv(page).getByText(lang === "vi" ? "● Đang hát" : "● Now singing", { exact: true });
      await expect(live).toHaveCSS("color", "rgb(255, 74, 43)");
      const title = tv(page).getByText("Về Nhà Thôi", { exact: true }).first();
      await expect(title).toHaveCSS("text-transform", "uppercase");
      await expect(title).toHaveCSS("font-family", /archivo/i);
      await expect(title).toHaveAttribute("lang", "vi");
      await expect(lyric(page)).toHaveText("Đèn đã lên rồi, mình về nhà thôi");
      await expect(lyric(page)).toHaveAttribute("lang", "vi");
      expect(await sungWords(page)).toEqual({ sung: 0, dim: 8, total: 8 });
      expect(await unsungContrast(page)).toBeGreaterThanOrEqual(4.5);
      const announce = section(page).locator('[aria-live="polite"]');
      await expect(announce).toHaveText(lang === "vi" ? "Đang hát: Về Nhà Thôi" : "Now singing: Về Nhà Thôi");
    });

    test("the line fills one word per 380 ms, then stays coloured", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await freezeTime(page);
      await startTime(page, lang);
      await press(page, lang, 0.3);
      await page.clock.runFor(379);
      expect((await sungWords(page)).sung).toBe(0);
      await page.clock.runFor(1);
      expect((await sungWords(page)).sung).toBe(1);
      // the line has 8 words, see Q-0001-46
      await page.clock.runFor(2659);
      expect((await sungWords(page)).sung).toBe(7);
      await page.clock.runFor(1);
      expect(await sungWords(page)).toEqual({ sung: 8, dim: 0, total: 8 });
      await page.clock.runFor(6000);
      expect(await sungWords(page)).toEqual({ sung: 8, dim: 0, total: 8 });
    });

    test("the queue puts each landed song on top as Bạn / You, three rows at most", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await freezeTime(page);
      await startTime(page, lang);
      const you = lang === "vi" ? "Bạn" : "You";
      await press(page, lang, 0.3);
      await expect(queueRows(page)).toHaveCount(3);
      await expect(queueRows(page).nth(0)).toHaveText(`Về Nhà Thôi${you}`);
      await expect(queueRows(page).nth(1)).toHaveText("Mây Lang ThangLan");
      await expect(queueRows(page).nth(2)).toHaveText("Đêm Nay HátMinh");
      const fresh = queueRows(page).nth(0);
      await expect(fresh).toHaveCSS("animation-duration", "0.5s");
      await expect(fresh).toHaveCSS("animation-timing-function", "ease");
      await expect(fresh).toHaveCSS("color", FG);
      await expect(queueRows(page).nth(1)).toHaveCSS("animation-name", "none");
      const from = await fresh.evaluate((el) => {
        const frame = (el.getAnimations()[0].effect as KeyframeEffect).getKeyframes()[0];
        return [frame.transform, frame.opacity];
      });
      expect(from).toEqual(["translateY(-8px)", "0"]);
      await press(page, lang, 0.95);
      await expect(queueRows(page)).toHaveCount(3);
      await expect(queueRows(page).nth(0)).toHaveText(`Phố Đêm${you}`);
      await expect(queueRows(page).nth(1)).toHaveText(`Về Nhà Thôi${you}`);
      await expect(queueRows(page).nth(2)).toHaveText("Mây Lang ThangLan");
      const langs = await tv(page).locator("li > span:first-child").evaluateAll((els) => els.map((el) => el.getAttribute("lang")));
      expect(langs).toEqual(["vi", "vi", "vi"]);
    });

    test("a new spin leaves the TV on its song until the reel lands, then starts the new line unsung", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await freezeTime(page);
      await startTime(page, lang);
      await press(page, lang, 0.3);
      await page.clock.runFor(1140);
      expect((await sungWords(page)).sung).toBe(3);
      await page.evaluate(() => {
        Math.random = () => 0.95;
      });
      await button(page, lang).dispatchEvent("click");
      await page.clock.runFor(3000);
      await expect(tv(page).getByText("Về Nhà Thôi", { exact: true }).first()).toBeVisible();
      await expect(lyric(page)).toHaveText("Đèn đã lên rồi, mình về nhà thôi");
      expect((await sungWords(page)).sung).toBeGreaterThanOrEqual(3);
      await page.clock.runFor(300);
      await expect(hits(page)).toHaveCount(1);
      await expect(lyric(page)).toHaveText("Phố đêm sáng đèn, ta hát vang");
      expect(await sungWords(page)).toEqual({ sung: 0, dim: 7, total: 7 });
    });
  });
}
