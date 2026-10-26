import { checkAxe, gotoPage, test, VIEWPORTS } from "./support";

// Later specs import checkAxe from ./support; it is re-exported here for the ticket's interface.
export { checkAxe };

for (const lang of ["vi", "en"] as const) {
  for (const key of ["mobile", "tablet", "desktop"] as const) {
    test(`axe finds no violation on ${lang} at ${key}`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[key]);
      await gotoPage(page, lang);
      await checkAxe(page);
    });
  }
}
