import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, gotoPage, test, VIEWPORTS } from "./support";

export async function checkAxe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

for (const lang of ["vi", "en"] as const) {
  for (const key of ["mobile", "tablet", "desktop"] as const) {
    test(`axe finds no violation on ${lang} at ${key}`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[key]);
      await gotoPage(page, lang);
      await checkAxe(page);
    });
  }
}
