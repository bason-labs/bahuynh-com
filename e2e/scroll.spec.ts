import type { Page } from "@playwright/test";
import { checkAxe, expect, gotoPage, skipTransitions, test, VIEWPORTS } from "./support";

const labels = {
  vi: ["Trang chủ", "Video", "Quay bài", "Cùng nhau", "Tính năng"],
  en: ["Home", "Film", "Spin", "Together", "Features"],
} as const;

const nav = (page: Page) => page.locator("nav [data-nav-link]");
const rail = (page: Page) => page.locator("[data-scroll-rail]");
const marker = (page: Page) => page.locator("[data-scroll-rail] i");

/** Scrolls at once (the page is smooth-scrolling) so the section's top edge sits `offset` px from the viewport top. */
async function placeSection(page: Page, id: string, offset: number) {
  await page.evaluate(
    ([sectionId, px]) => {
      const el = document.getElementById(sectionId as string)!;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (px as number), behavior: "instant" });
    },
    [id, offset],
  );
}

async function activeLabels(page: Page) {
  return nav(page).evaluateAll((links) =>
    links.filter((l) => l.getAttribute("aria-current") === "true").map((l) => l.textContent),
  );
}

for (const lang of ["vi", "en"] as const) {
  const names = labels[lang];
  test.describe(lang, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
    });

    test("at scroll 0 only the first link is active: foreground text in a 16 % white border", async ({ page }) => {
      await expect(nav(page)).toHaveCount(5);
      expect(await activeLabels(page)).toEqual([names[0]]);
      const first = nav(page).nth(0);
      await expect(first).toHaveCSS("color", "rgb(243, 239, 232)");
      await expect(first).toHaveCSS("border-top-color", "rgba(255, 255, 255, 0.16)");
      await expect(first).toHaveCSS("border-top-width", "1px");
      for (const i of [1, 2, 3, 4]) {
        await expect(nav(page).nth(i)).toHaveCSS("color", "rgb(141, 139, 135)");
        await expect(nav(page).nth(i)).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
      }
    });

    test("the link follows the last section whose top is above half the viewport; the last chapter keeps Features", async ({
      page,
    }) => {
      const steps: [string, number, number][] = [
        ["xem", 360, 1],
        ["quay", 360, 2],
        ["quay", 460, 1],
        ["cungnhau", 100, 3],
        ["tinhnang", 449, 4],
        ["batdau", 440, 4],
        ["batdau", -200, 4],
      ];
      for (const [id, offset, index] of steps) {
        await placeSection(page, id, offset);
        await expect.poll(() => activeLabels(page)).toEqual([names[index]]);
        const flags = await nav(page).evaluateAll((links) => links.map((l) => l.getAttribute("aria-current")));
        expect(flags.filter((f) => f !== null)).toEqual(["true"]);
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await expect.poll(() => activeLabels(page)).toEqual([names[0]]);
    });

    test("the ruler: 28 px wide from 56 px to the bottom, hairline, ticks, marker 16x2 in #ff4a2b at the top", async ({
      page,
    }) => {
      const box = (await rail(page).boundingBox())!;
      expect(box.width).toBe(28);
      expect(box.x + box.width).toBe(VIEWPORTS.desktop.width);
      expect(box.y).toBe(56);
      expect(box.y + box.height).toBe(VIEWPORTS.desktop.height);
      await expect(rail(page)).toHaveCSS("border-left-width", "1px");
      await expect(rail(page)).toHaveCSS("border-left-color", "rgba(255, 255, 255, 0.08)");
      await expect(rail(page)).toHaveCSS("background-image", /repeating-linear-gradient\(.*24px/);
      const mark = (await marker(page).boundingBox())!;
      expect([mark.width, mark.height]).toEqual([16, 2]);
      expect(mark.y).toBe(box.y);
      expect(mark.x + mark.width).toBe(VIEWPORTS.desktop.width);
      await expect(marker(page)).toHaveCSS("background-color", "rgb(255, 74, 43)");
      await expect(marker(page)).toHaveCSS("transition-property", "transform");
    });

    test("the marker reaches the bottom at the maximum scroll and the middle at half of it", async ({ page }) => {
      await skipTransitions(page);
      const box = (await rail(page).boundingBox())!;
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), max / 2);
      await expect
        .poll(async () => Math.abs((await marker(page).boundingBox())!.y + 1 - (box.y + box.height / 2)))
        .toBeLessThanOrEqual(2);
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), max);
      await expect
        .poll(async () => {
          const m = (await marker(page).boundingBox())!;
          return Math.abs(m.y + m.height - (box.y + box.height));
        })
        .toBeLessThanOrEqual(2);
    });

    test("a click on the ruler reaches the content beneath and the ruler is hidden from assistive technology", async ({
      page,
    }) => {
      await expect(rail(page)).toHaveAttribute("aria-hidden", "true");
      await expect(rail(page)).toHaveCSS("pointer-events", "none");
      const inRail = await page.evaluate(() => {
        const el = document.elementFromPoint(innerWidth - 14, 400);
        return { rail: !!el?.closest("[data-scroll-rail]"), tag: el?.tagName };
      });
      expect(inRail.rail).toBe(false);
      expect(inRail.tag).not.toBe("HTML");
    });
  });
}

test("at 900 px wide the ruler is not shown and nothing in it is focusable", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1024 });
  await gotoPage(page, "vi");
  await expect(rail(page)).toBeHidden();
  await expect(rail(page)).toHaveCSS("display", "none");
  expect(await rail(page).locator("a, button, [tabindex]").count()).toBe(0);
});

for (const lang of ["vi", "en"] as const) {
  for (const key of ["mobile", "tablet", "desktop"] as const) {
    test(`axe finds no violation on ${lang} at ${key} after scrolling to each section`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[key]);
      await gotoPage(page, lang);
      for (const id of ["xem", "quay", "cungnhau", "tinhnang", "batdau"]) {
        await placeSection(page, id, 60);
        await checkAxe(page);
      }
    });
  }
}
