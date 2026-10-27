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

const reaction = {
  vi: { tap: "Chạm để thả cảm xúc", words: ["Vỗ tay!", "Hay quá!", "Encore!", "Cháy!"] },
  en: { tap: "Tap to send a reaction", words: ["Clap!", "So good!", "Encore!", "Fire!"] },
} as const;

for (const lang of ["vi", "en"] as const) {
  test(`${lang}: Enter and Space on the scene's reaction control each react once, the page does not scroll`, async ({
    page,
  }) => {
    // words are removed by a 2.3 s timer: hold the clock so a slow machine cannot expire one mid-check
    await page.clock.install();
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    await page.clock.pauseAt(Date.now() + 500);
    const scene = page.locator("section#cungnhau [data-scene]");
    const tap = scene.getByRole("button", { name: reaction[lang].tap, exact: true });
    const count = scene.locator("[data-count]");
    const words = scene.locator("[data-word]");
    const read = async () => Number(((await count.textContent()) ?? "").replace(/[.,]/g, ""));
    await tap.focus();
    await expect(tap).toBeFocused();
    const before = await page.evaluate(() => window.scrollY);
    let total = await read();
    expect(total).toBe(1248);
    for (const [i, key] of (["Enter", "Space"] as const).entries()) {
      await page.keyboard.press(key);
      await expect(words).toHaveCount(i + 1);
      const delta = (await read()) - total;
      expect([1, 2, 3]).toContain(delta);
      total += delta;
      const word = words.nth(i);
      expect(reaction[lang].words as readonly string[]).toContain(await word.textContent());
      const at = await word.evaluate((el) => ({
        x: parseFloat(el.style.left) / el.parentElement!.clientWidth,
        y: parseFloat(el.style.top) / el.parentElement!.clientHeight,
      }));
      expect(at.x).toBeGreaterThanOrEqual(0.2);
      expect(at.x).toBeLessThanOrEqual(0.8);
      expect(at.y).toBeGreaterThanOrEqual(0.35);
      expect(at.y).toBeLessThanOrEqual(0.65);
      expect(await page.evaluate(() => window.scrollY)).toBe(before);
    }
  });
}
