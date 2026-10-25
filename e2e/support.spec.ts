import { expect, test } from "@playwright/test";
import { collectErrors } from "./support";

test("collectErrors gathers a console error and a page error", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await page.evaluate(() => {
    console.error("boom-console");
    setTimeout(() => {
      throw new Error("boom-page");
    }, 0);
  });
  await expect.poll(() => errors.length).toBe(2);
  expect(errors.join("\n")).toContain("boom-console");
  expect(errors.join("\n")).toContain("boom-page");
});
