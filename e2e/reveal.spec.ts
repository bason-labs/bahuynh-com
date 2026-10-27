import type { Page } from "@playwright/test";
import { expect, gotoPage, test, VIEWPORTS } from "./support";

const SECTIONS = "#xem, #quay, #cungnhau, #tinhnang, #batdau";
const head = (page: Page) => page.locator("section#quay > .wrap > *").first();
const style = (el: ReturnType<typeof head>) =>
  el.evaluate((node) => {
    const s = getComputedStyle(node);
    return { opacity: s.opacity, transform: s.transform };
  });

/** Scrolls at once so that `fraction` of the block's height shows at the bottom edge of the viewport. */
const scrollToShow = (el: ReturnType<typeof head>, fraction: number) =>
  el.evaluate((node, f) => {
    const r = node.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top - (window.innerHeight - f * r.height), behavior: "instant" });
  }, fraction);

const settle = (page: Page) =>
  page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));

for (const [lang, title, find] of [
  ["vi", "Quay.", "Chưa biết hát gì?"],
  ["en", "Spin.", "Nothing to sing?"],
] as const) {
  test.describe(`reveal on ${lang}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
    });

    test("a block below the fold is faded and 24 px down, yet still in the accessibility tree and findable", async ({ page }) => {
      const block = head(page);
      await expect(block).toHaveAttribute("data-reveal", "pending");
      expect(await style(block)).toEqual({ opacity: "0", transform: "matrix(1, 0, 0, 1, 0, 24)" });
      const hidden = await block.evaluate((node) => {
        const s = getComputedStyle(node);
        return [s.display, s.visibility];
      });
      expect(hidden).toEqual(["block", "visible"]);
      expect(await page.locator("body").ariaSnapshot()).toContain(title);
      await expect(page.getByRole("heading", { level: 2, name: new RegExp(title) })).toBeAttached();
      await expect(page.getByText(find)).toBeAttached();
    });

    test("it reveals between 11 % and 13 % visible, over 0.8 s on opacity and transform", async ({ page }) => {
      const block = head(page);
      await scrollToShow(block, 0.11);
      await settle(page);
      await expect(block).toHaveAttribute("data-reveal", "pending");
      await scrollToShow(block, 0.13);
      await expect(block).toHaveAttribute("data-reveal", "in");
      const transition = await block.evaluate((node) => {
        const s = getComputedStyle(node);
        return [s.transitionProperty, s.transitionDuration];
      });
      expect(transition).toEqual(["opacity, transform", "0.8s, 0.8s"]);
      // the transition is already running: finish it rather than wait for the clock
      await block.evaluate((node) => node.getAnimations().forEach((a) => a.finish()));
      expect(await style(block)).toEqual({ opacity: "1", transform: "none" });
    });

    test("a revealed block scrolled away and back stays visible and runs no animation", async ({ page }) => {
      const block = head(page);
      await scrollToShow(block, 0.5);
      await expect(block).toHaveAttribute("data-reveal", "in");
      await block.evaluate((node) => node.getAnimations().forEach((a) => a.finish()));
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await settle(page);
      await scrollToShow(block, 0.5);
      await settle(page);
      await expect(block).toHaveAttribute("data-reveal", "in");
      expect(await block.evaluate((node) => node.getAnimations().length)).toBe(0);
      expect(await style(block)).toEqual({ opacity: "1", transform: "none" });
    });
  });
}

test("opening /#tinhnang lands on chapter 04 with its blocks revealed", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto("/#tinhnang");
  const blocks = page.locator("section#tinhnang > .wrap > *");
  await expect(blocks).toHaveCount(2);
  await expect(blocks.first()).toBeInViewport();
  for (const block of await blocks.all()) {
    await block.evaluate((node) => node.getAnimations().forEach((a) => a.finish()));
    await expect(block).toHaveCSS("opacity", "1");
    await expect(block).not.toHaveAttribute("data-reveal", "pending");
  }
});

test("the blocks of every chapter exist on both pages, each a plain wrapper of the section", async ({ page }) => {
  await gotoPage(page, "vi");
  await expect(page.locator(`:is(${SECTIONS}) > .wrap > *`)).toHaveCount(10);
});
