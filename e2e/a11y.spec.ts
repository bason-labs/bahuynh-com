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
  }
}
