import type { Page } from "@playwright/test";
import { withoutWebGl } from "./mic";
import { expect, gotoPage, test, VIEWPORTS } from "./support";

const copy = {
  vi: { nav: "Chính", cta: "Mở phòng hát", group: "Ngôn ngữ", pause: "Dừng chuyển động" },
  en: { nav: "Main", cta: "Open a room", group: "Language", pause: "Pause motion" },
} as const;

type Box = { x: number; y: number; width: number; height: number };

const boxes = (page: Page, selector: string) =>
  page.evaluate(
    (s) => [...document.querySelectorAll(s)].map((el) => el.getBoundingClientRect().toJSON() as Box),
    selector,
  );

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];

  test.describe(`stacked layout at 768x1024 on ${lang}`, () => {
    test.beforeEach(async ({ page }) => {
      await withoutWebGl(page);
      await page.setViewportSize(VIEWPORTS.tablet);
      await gotoPage(page, lang);
    });

    test("the navigation shows the logo, switch, pause toggle and button; links and ruler are hidden and never focused", async ({ page }) => {
      const nav = page.getByRole("navigation", { name: c.nav });
      await expect(nav.getByRole("link", { name: "BS KARA" })).toBeVisible();
      await expect(nav.getByRole("group", { name: c.group })).toBeVisible();
      await expect(nav.getByRole("button", { name: c.pause })).toBeVisible();
      await expect(nav.getByRole("link", { name: c.cta })).toBeVisible();
      await expect(nav.locator("[data-nav-link]")).toHaveCount(5);
      for (const link of await nav.locator("[data-nav-link]").all()) await expect(link).toBeHidden();
      await expect(page.locator("[data-scroll-rail]")).toBeHidden();

      // Tab through the bar: logo, switch link, toggle, button, then on into the hero
      const visited: string[] = [];
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("Tab");
        visited.push(
          await page.evaluate(() => {
            const el = document.activeElement!;
            const inRail = el.closest("[data-scroll-rail]") !== null;
            return `${inRail ? "rail:" : ""}${el.hasAttribute("data-nav-link") ? "link:" : ""}${el.textContent}`;
          }),
        );
      }
      expect(visited.filter((v) => v.startsWith("rail:") || v.startsWith("link:"))).toEqual([]);
      expect(visited[0]).toContain("BS KARA");
    });

    test("each chapter head has the lede under the h2", async ({ page }) => {
      for (const id of ["xem", "quay", "cungnhau", "tinhnang"]) {
        const head = await page.evaluate((sectionId) => {
          const left = document.querySelector(`section#${sectionId} h2`)!.closest("div")!;
          const lede = left.nextElementSibling!;
          const h2 = left.querySelector("h2")!.getBoundingClientRect();
          return { h2: h2.toJSON(), lede: lede.getBoundingClientRect().toJSON() };
        }, id);
        expect(head.lede.y, id).toBeGreaterThanOrEqual(head.h2.y + head.h2.height);
        expect(head.lede.x, id).toBe(head.h2.x);
      }
    });

    test("film buttons are 3 columns by 2 rows, the reel is above the TV, steps and cards are one column in order", async ({ page }) => {
      const buttons = await boxes(page, 'section#xem [class*="chapters"] button');
      expect(buttons).toHaveLength(6);
      expect(new Set(buttons.map((b) => b.x)).size).toBe(3);
      expect(new Set(buttons.map((b) => b.y)).size).toBe(2);
      expect(buttons.slice(0, 3).map((b) => b.y)).toEqual(Array(3).fill(buttons[0].y));
      expect(buttons[3].y).toBeGreaterThan(buttons[0].y);

      const [reel] = await boxes(page, "[data-reel]");
      const [tv] = await boxes(page, "[data-tv]");
      expect(tv.y).toBeGreaterThanOrEqual(reel.y + reel.height);

      for (const [selector, count] of [['section#cungnhau [class*="steps"] li', 3], ["section#tinhnang article", 6]] as const) {
        const list = await boxes(page, selector);
        expect(list).toHaveLength(count);
        expect(new Set(list.map((b) => b.x)).size, selector).toBe(1);
        const ys = list.map((b) => b.y);
        expect(ys, selector).toEqual([...ys].sort((a, b) => a - b));
        expect(new Set(ys).size, selector).toBe(count);
      }
    });

    test("the hero lede is shown and the side padding is 31 px", async ({ page }) => {
      await expect(page.locator("header#top p")).toBeVisible();
      const paddings = await page.evaluate(() =>
        [...document.querySelectorAll(".wrap")].map((el) => {
          const cs = getComputedStyle(el);
          return [Math.round(parseFloat(cs.paddingLeft)), Math.round(parseFloat(cs.paddingRight))];
        }),
      );
      expect(paddings.length).toBeGreaterThanOrEqual(6);
      for (const p of paddings) expect(p).toEqual([31, 31]);
    });

    test("the document is exactly 768 px wide", async ({ page }) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(768);
    });
  });
}
