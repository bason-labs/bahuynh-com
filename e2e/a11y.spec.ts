import { checkAxe, expect, gotoPage, test, VIEWPORTS } from "./support";

// Later specs import checkAxe from ./support; it is re-exported here for the ticket's interface.
export { checkAxe };

for (const lang of ["vi", "en"] as const) {
  for (const key of ["mobile", "tablet", "desktop"] as const) {
    test(`axe finds no violation on ${lang} at ${key}`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[key]);
      await gotoPage(page, lang);
      await checkAxe(page);
    });

    test(`axe finds no violation on ${lang} at ${key} with motion paused`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[key]);
      await gotoPage(page, lang);
      const toggle = page.getByRole("button", { name: lang === "vi" ? "Dừng chuyển động" : "Pause motion" });
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      await checkAxe(page);
    });

    test(`axe finds no violation on ${lang} at ${key} with the hero live`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[key]);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      await page.mouse.click(VIEWPORTS[key].width / 2, 300);
      await expect(hero).toHaveAttribute("data-live", "true");
      await expect(hero.getByText("On air").locator("..")).toHaveCSS("background-color", "rgb(255, 74, 43)");
      await expect(hero.getByText("On air").locator("..")).toHaveCSS("box-shadow", /rgba\(255, 74, 43, 0.45\)/);
      await expect(hero.locator('div[aria-hidden="true"]').last()).toHaveCSS("opacity", "1");
      await expect(hero.locator("i")).toHaveCount(0, { timeout: 3500 });
      await checkAxe(page);
    });
  }
}
