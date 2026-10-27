import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

export const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
  narrow: { width: 320, height: 640 },
} as const;

export const PATHS = { vi: "/", en: "/en/" } as const;

/** Collects console errors and uncaught page errors raised on `page`. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** `test` fails any test that logs a console error or throws a page error. */
export const test = base.extend({
  page: async ({ page }, provide) => {
    const errors = collectErrors(page);
    await provide(page);
    expect(errors, "console and page errors").toEqual([]);
  },
});

export { expect };

export async function gotoPage(page: Page, lang: keyof typeof PATHS) {
  const response = await page.goto(PATHS[lang]);
  expect(response?.status()).toBe(200);
  return response;
}

/** Runs axe with the WCAG 2.2 AA tags on the current page and expects 0 violations. */
export async function checkAxe(page: Page) {
  // axe reads a hidden or half-faded chapter block as low contrast: show every block fully first
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('[data-reveal="pending"]').forEach((el) => (el.dataset.reveal = "in"));
    document
      .getAnimations()
      .filter((a) => (a.effect as KeyframeEffect).target?.hasAttribute("data-reveal"))
      .forEach((a) => a.finish());
  });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

/**
 * Makes CSS transitions finish at once. Use it where a test checks an end state, not the motion:
 * a loaded CI runner can stall a transition part-way for seconds. Assert any `transition-*` values
 * before calling it.
 */
export async function skipTransitions(page: Page) {
  await page.addStyleTag({
    content: "*, *::before, *::after { transition-duration: 0s !important; transition-delay: 0s !important; }",
  });
}
