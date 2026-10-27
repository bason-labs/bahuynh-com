import type { Page } from "@playwright/test";
import { expect, gotoPage, test, VIEWPORTS } from "./support";

const copy = {
  vi: {
    h1: "Karaoke cho cả nhóm.",
    kickers: ["01 / Xem video", "02 / Quay bài", "03 / Cùng nhau", "04 / Tính năng", "05 / Bắt đầu"],
    nav: "Quay bài",
  },
  en: {
    h1: "Karaoke for the whole group.",
    kickers: ["01 / Watch", "02 / Spin", "03 / Together", "04 / Features", "05 / Start"],
    nav: "Spin",
  },
} as const;

const LANDMARKS = ["banner", "complementary", "contentinfo", "form", "main", "navigation", "region", "search"];
const IDS = ["top", "xem", "quay", "cungnhau", "tinhnang", "batdau"];

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];

  test.describe(`page structure on ${lang}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
    });

    test("blocks run nav, hero, marquee, chapters 01 to 05, footer, with their anchor ids", async ({ page }) => {
      const blocks = await page.evaluate(() => {
        const q = (s: string) => document.querySelector(s)!;
        const els = [
          q("nav"),
          q("header#top"),
          q("[data-marquee]"),
          q("section#xem"),
          q("section#quay"),
          q("section#cungnhau"),
          q("section#tinhnang"),
          q("section#batdau"),
          q("footer"),
        ];
        const follows = els.slice(1).map((el, i) => Boolean(els[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING));
        return { ids: els.map((el) => el.id), follows };
      });
      expect(blocks.ids).toEqual(["", "top", "", "xem", "quay", "cungnhau", "tinhnang", "batdau", ""]);
      expect(blocks.follows).toEqual(Array(8).fill(true));
      // the marquee is a direct child of main between the hero and chapter 01; ids are unique and only these six exist
      const siblings = await page.locator("main").evaluate((m) => [...m.children].map((el) => el.id || el.tagName.toLowerCase()));
      expect(siblings).toEqual(["top", "div", "xem", "quay", "cungnhau", "tinhnang", "batdau"]);
      for (const id of IDS) await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    });

    test("the outline has one h1, one h2 per chapter, and nine h3 (three steps, six cards)", async ({ page }) => {
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText(c.h1);
      await expect(page.getByRole("heading", { level: 2 })).toHaveCount(5);
      for (const id of ["xem", "quay", "cungnhau", "tinhnang", "batdau"]) {
        await expect(page.locator(`section#${id}`).getByRole("heading", { level: 2 })).toHaveCount(1);
      }
      await expect(page.getByRole("heading", { level: 3 })).toHaveCount(9);
      await expect(page.locator("section#cungnhau").getByRole("heading", { level: 3 })).toHaveCount(3);
      await expect(page.locator("section#tinhnang").getByRole("heading", { level: 3 })).toHaveCount(6);
      for (const level of [4, 5, 6]) await expect(page.getByRole("heading", { level })).toHaveCount(0);
    });

    test("the five kickers read number / label, number in #f3efe8 and label in #8d8b87", async ({ page }) => {
      const kickers = await page.evaluate(() =>
        ["xem", "quay", "cungnhau", "tinhnang", "batdau"].map((id) => {
          const label = document.querySelector(`section#${id} b + span`)!;
          const number = label.previousElementSibling!;
          return {
            text: `${number.textContent} ${label.textContent}`,
            number: getComputedStyle(number).color,
            label: getComputedStyle(label).color,
          };
        }),
      );
      expect(kickers.map((k) => k.text)).toEqual(c.kickers);
      for (const k of kickers) {
        expect(k.number).toBe("rgb(243, 239, 232)");
        expect(k.label).toBe("rgb(141, 139, 135)");
      }
    });

    test("landmarks: one navigation, one main from hero to chapter 05, one footer after main", async ({ page }) => {
      const snapshot = await page.locator("body").ariaSnapshot();
      const top = snapshot.split("\n").filter((line) => /^- \w/.test(line));
      const landmarks = top.map((line) => line.match(/^- (\w+)/)![1]).filter((role) => LANDMARKS.includes(role));
      expect(landmarks).toEqual(["navigation", "main", "contentinfo"]);
      const inside = await page.evaluate(() => {
        const main = document.querySelector("main")!;
        const within = (s: string) => main.contains(document.querySelector(s));
        return {
          hero: within("header#top"),
          chapters: ["xem", "quay", "cungnhau", "tinhnang", "batdau"].every((id) => within(`section#${id}`)),
          nav: within("nav"),
          footer: within("footer"),
          footerAfter: Boolean(main.compareDocumentPosition(document.querySelector("footer")!) & Node.DOCUMENT_POSITION_FOLLOWING),
        };
      });
      expect(inside).toEqual({ hero: true, chapters: true, nav: false, footer: false, footerAfter: true });
      await expect(page.getByRole("navigation")).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);
      await expect(page.getByRole("banner")).toHaveCount(0);
    });
  });
}

/**
 * Activates the bar link and reads scrollY in the same task: an instant jump has already moved, a smooth one
 * has not started (it advances frame by frame), whatever the machine's speed. Then waits for the jump to end.
 */
async function jump(page: Page, name: string) {
  const link = page.getByRole("navigation").getByRole("link", { name, exact: true });
  const right = await link.evaluate((a) => {
    (a as HTMLElement).click();
    return window.scrollY;
  });
  // the page keeps 64 px (scroll-padding) above the section; it only approaches that from below the fold
  await expect.poll(() => page.locator("section#quay").evaluate((el) => el.getBoundingClientRect().top), { timeout: 20_000 }).toBeLessThanOrEqual(66);
  return { right, end: await page.evaluate(() => ({ y: window.scrollY, hash: location.hash })) };
}

for (const lang of ["vi", "en"] as const) {
  test.describe(`nav jump on ${lang}`, () => {
    const section = async (page: Page) => page.locator("section#quay").evaluate((el) => el.getBoundingClientRect().top);

    test("smooth: the bar's link scrolls to section quay below the 56 px bar and sets #quay", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      await expect(page.locator("html")).toHaveCSS("scroll-behavior", "smooth");
      const { right, end } = await jump(page, copy[lang].nav);
      expect(end.hash).toBe("#quay");
      expect(await section(page)).toBeGreaterThanOrEqual(56);
      expect(end.y).toBeGreaterThan(0);
      expect(right, "scroll position right after the click").toBe(0);
    });

    test("instant with reduced motion", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const { right, end } = await jump(page, copy[lang].nav);
      expect(end.hash).toBe("#quay");
      expect(await section(page)).toBeGreaterThanOrEqual(56);
      expect(right, "scroll position right after the click").toBe(end.y);
    });

    test("instant with the pause toggle pressed", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      await page.getByRole("navigation").getByRole("button", { name: lang === "vi" ? "Dừng chuyển động" : "Pause motion", exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
      const { right, end } = await jump(page, copy[lang].nav);
      expect(end.hash).toBe("#quay");
      expect(await section(page)).toBeGreaterThanOrEqual(56);
      expect(right, "scroll position right after the click").toBe(end.y);
    });
  });
}
