import type { Page } from "@playwright/test";
import { withoutWebGl } from "./mic";
import { expect, gotoPage, test, VIEWPORTS } from "./support";

const copy = {
  vi: { nav: "Chính", links: ["Trang chủ", "Video", "Quay bài", "Cùng nhau", "Tính năng"], cta: "Mở phòng hát", group: "Ngôn ngữ", hint: "Kéo để xoay · chạm để bật micro" },
  en: { nav: "Main", links: ["Home", "Film", "Spin", "Together", "Features"], cta: "Open a room", group: "Language", hint: "Drag to turn · tap to switch the mic on" },
} as const;

type Box = { x: number; y: number; width: number; height: number };

/** Boxes of every element matching `selector`, in document order. */
const boxes = (page: Page, selector: string) =>
  page.evaluate(
    (s) => [...document.querySelectorAll(s)].map((el) => el.getBoundingClientRect().toJSON() as Box),
    selector,
  );

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];

  test.describe(`wide layout at 1440x900 on ${lang}`, () => {
    test.beforeEach(async ({ page }) => {
      await withoutWebGl(page);
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
    });

    test("the navigation shows the logo, five links, the switch and the button, and the ruler is visible", async ({ page }) => {
      const nav = page.getByRole("navigation", { name: c.nav });
      await expect(nav.getByRole("link", { name: "BS KARA" })).toBeVisible();
      for (const label of c.links) await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
      await expect(nav.getByRole("group", { name: c.group })).toBeVisible();
      await expect(nav.getByRole("link", { name: c.cta })).toBeVisible();
      await expect(page.locator("[data-scroll-rail]")).toBeVisible();
    });

    test("the content is centred, at most 1280 px wide with 56 px side padding", async ({ page }) => {
      const wraps = await page.evaluate(() =>
        [...document.querySelectorAll(".wrap")].map((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return { x: r.x, width: r.width, left: cs.paddingLeft, right: cs.paddingRight };
        }),
      );
      expect(wraps.length).toBeGreaterThanOrEqual(6);
      for (const w of wraps) {
        expect(w).toEqual({ x: 80, width: 1280, left: "56px", right: "56px" });
      }
    });

    test("each chapter head puts the kicker and h2 left (1.4 parts), the lede right (1 part), bottom-aligned, 40 px apart", async ({ page }) => {
      for (const id of ["xem", "quay", "cungnhau", "tinhnang"]) {
        const head = await page.evaluate((sectionId) => {
          const lede = document.querySelector(`section#${sectionId} h2`)!.closest("div")!.nextElementSibling as HTMLElement;
          const left = lede.previousElementSibling!;
          const l = left.getBoundingClientRect();
          const r = lede.getBoundingClientRect();
          return { left: l.toJSON(), right: r.toJSON(), kicker: left.querySelector("b")!.getBoundingClientRect().toJSON() };
        }, id);
        expect(head.left.x, id).toBe(136);
        expect(head.right.x - (head.left.x + head.left.width), id).toBeCloseTo(40, 0);
        expect(head.left.width / head.right.width, id).toBeCloseTo(1.4, 1);
        expect(Math.abs(head.left.y + head.left.height - (head.right.y + head.right.height)), id).toBeLessThanOrEqual(1);
        expect(head.kicker.x, id).toBe(head.left.x);
        expect(head.right.x + head.right.width, id).toBeCloseTo(1304, 0);
      }
    });

    test("the hero copy is bottom left and the hint bottom right, right-aligned", async ({ page }) => {
      const hero = page.locator("header#top");
      const h = (await hero.boundingBox())!;
      const copyBox = (await hero.locator("h1").locator("..").boundingBox())!;
      const hintBox = (await hero.getByText(c.hint, { exact: true }).boundingBox())!;
      expect(copyBox.x).toBe(136);
      expect(copyBox.y + copyBox.height).toBeLessThanOrEqual(h.y + h.height);
      expect(copyBox.y).toBeGreaterThan(h.y + h.height / 2);
      expect(Math.abs(hintBox.x + hintBox.width - 1304)).toBeLessThanOrEqual(1);
      expect(hintBox.y).toBeGreaterThan(h.y + h.height / 2);
      expect(hintBox.x).toBeGreaterThan(copyBox.x + copyBox.width);
      const align = await hero.getByText(c.hint, { exact: true }).evaluate((el) => getComputedStyle(el.parentElement!.parentElement!).textAlign);
      expect(align).toBe("right");
    });

    test("the film buttons sit in one row, the reel beside the TV, three steps in a row and the cards in two columns", async ({ page }) => {
      const buttons = await boxes(page, 'section#xem [class*="chapters"] button');
      expect(buttons).toHaveLength(6);
      expect(new Set(buttons.map((b) => b.y)).size).toBe(1);
      expect(new Set(buttons.map((b) => b.x)).size).toBe(6);

      const [reel] = await boxes(page, "[data-reel]");
      const [tv] = await boxes(page, "[data-tv]");
      expect(tv.x).toBeGreaterThanOrEqual(reel.x + reel.width);
      expect(tv.y).toBeLessThan(reel.y + reel.height);
      expect(reel.y).toBeLessThan(tv.y + tv.height);

      const steps = await boxes(page, 'section#cungnhau [class*="steps"] li');
      expect(steps).toHaveLength(3);
      expect(new Set(steps.map((s) => s.y)).size).toBe(1);
      expect(new Set(steps.map((s) => s.x)).size).toBe(3);

      const cards = await boxes(page, "section#tinhnang article");
      expect(cards).toHaveLength(6);
      expect(new Set(cards.map((b) => b.x)).size).toBe(2);
      expect(new Set(cards.map((b) => b.y)).size).toBe(3);
    });

    test("the document is exactly 1440 px wide", async ({ page }) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1440);
    });
  });
}
