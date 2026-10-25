import type { Page } from "@playwright/test";
import { expect, gotoPage, test, VIEWPORTS } from "./support";

const names = {
  vi: ["MC AI", "Quay bài", "Hàng chờ chung", "Chấm điểm", "Thả cảm xúc", "Điện thoại là micro", "TV · Máy chiếu", "Hát tiếp"],
  en: ["AI host", "Spin a song", "Shared queue", "Scores", "Reactions", "Phone as remote", "TV · Projector", "Up next"],
} as const;

const band = (page: Page) => page.locator("[data-marquee]");

for (const lang of ["vi", "en"] as const) {
  test.describe(`marquee on ${lang}`, () => {
    test("names, order and squares, twice in one row", async ({ page }) => {
      await gotoPage(page, lang);
      const spans = await band(page).locator("span").allTextContents();
      expect(spans).toHaveLength(32);
      const first = spans.slice(0, 16);
      expect(first.filter((_, i) => i % 2 === 0)).toEqual([...names[lang]]);
      expect(first.filter((_, i) => i % 2 === 1)).toEqual(Array(8).fill("■"));
      expect(spans.slice(16)).toEqual(first);
    });

    test("sits between the hero and chapter 01 with hairlines", async ({ page }) => {
      await gotoPage(page, lang);
      const order = await page.evaluate(() => {
        const marq = document.querySelector("[data-marquee]")!;
        return [marq.previousElementSibling?.id, marq.parentElement?.tagName];
      });
      expect(order).toEqual(["top", "MAIN"]);
      const css = await band(page).evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.borderTopWidth, s.borderBottomWidth, s.borderTopStyle, s.borderBottomStyle];
      });
      expect(css).toEqual(["1px", "1px", "solid", "solid"]);
    });

    test("name and square styles", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const spans = band(page).locator("span");
      const name = await spans.nth(0).evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.fontWeight, s.fontSize, s.textTransform, s.fontVariationSettings, s.fontFamily];
      });
      expect(name[0]).toBe("800");
      expect(name[1]).toBe("26px");
      expect(name[2]).toBe("uppercase");
      expect(name[3]).toContain("wdth");
      expect(name[3]).toContain("125");
      expect(name[4]).toContain("Archivo");
      await expect(spans.nth(1)).toHaveCSS("color", "rgb(255, 74, 43)");
      await page.setViewportSize(VIEWPORTS.mobile);
      await expect(spans.nth(0)).toHaveCSS("font-size", "18px");
    });

    test("linear 40 s loop that moves exactly one set to the left", async ({ page }) => {
      await gotoPage(page, lang);
      const result = await band(page).evaluate((el) => {
        const row = el.firstElementChild as HTMLElement;
        const anim = row.getAnimations()[0];
        const timing = anim.effect!.getTiming();
        anim.pause();
        anim.currentTime = 0;
        const x0 = row.getBoundingClientRect().x;
        // 40 000 ms exactly is the start of the next iteration (translate 0); sample just before it.
        anim.currentTime = 40000 - 0.001;
        const x1 = row.getBoundingClientRect().x;
        const spans = [...row.children] as HTMLElement[];
        const setWidth = spans[16].getBoundingClientRect().x - spans[0].getBoundingClientRect().x;
        return { timing, moved: x0 - x1, setWidth, rowWidth: row.getBoundingClientRect().width };
      });
      expect(result.timing.easing).toBe("linear");
      expect(result.timing.iterations).toBe(Infinity);
      expect(result.timing.duration).toBe(40000);
      expect(Math.abs(result.moved - result.setWidth)).toBeLessThanOrEqual(1);
    });

    test("hidden from assistive technology with nothing focusable", async ({ page }) => {
      await gotoPage(page, lang);
      await expect(band(page)).toHaveAttribute("aria-hidden", "true");
      expect(await band(page).locator("a, button, input, select, textarea, [tabindex]").count()).toBe(0);
    });
  });
}
