import { expect, gotoPage, test, VIEWPORTS } from "./support";

const names = {
  vi: "Micro 3D. Kéo để xoay, chạm để bật.",
  en: "3D microphone. Drag to turn, tap to switch it on.",
} as const;

for (const lang of ["vi", "en"] as const) {
  test(`${lang}: Enter turns the hero live, Space turns it idle, the page does not scroll`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    const hero = page.locator("header#top");
    const mic = hero.getByRole("button", { name: names[lang], exact: true });
    await mic.focus();
    await expect(mic).toBeFocused();
    const before = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("Enter");
    await expect(hero).toHaveAttribute("data-live", "true");
    await expect(mic).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Space");
    await expect(hero).toHaveAttribute("data-live", "false");
    await expect(mic).toHaveAttribute("aria-pressed", "false");
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });
}
