import { expectGl, readPose, throttleFrames, withoutWebGl } from "./mic";
import { checkAxe, expect, gotoPage, skipTransitions, test, VIEWPORTS } from "./support";

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
      await withoutWebGl(page);
      await page.setViewportSize(VIEWPORTS[key]);
      await gotoPage(page, lang);
      await skipTransitions(page);
      const hero = page.locator("header#top");
      await page.mouse.click(VIEWPORTS[key].width / 2, 300);
      await expect(hero).toHaveAttribute("data-live", "true");
      await expect(hero.getByText("On air").locator("..")).toHaveCSS("background-color", "rgb(255, 74, 43)");
      await expect(hero.getByText("On air").locator("..")).toHaveCSS("box-shadow", /rgba\(255, 74, 43, 0.45\)/);
      await expect(hero.locator('div[aria-hidden="true"]').last()).toHaveCSS("opacity", "1");
      // wait for the rings to clear (a 2.4 s timer); timing itself is checked in hero.spec.ts
      await expect(hero.locator("i")).toHaveCount(0, { timeout: 10_000 });
      await checkAxe(page);
    });

    test(`axe finds no violation on ${lang} at ${key} with the film on its poster and playing`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[key]);
      await gotoPage(page, lang);
      const film = page.locator("[data-film]");
      await film.scrollIntoViewIfNeeded();
      await checkAxe(page);
      await film.getByRole("button", { name: lang === "vi" ? "Phát video" : "Play video", exact: true }).click();
      await expect(film).toHaveAttribute("data-running", "true");
      await page.waitForTimeout(800);
      await checkAxe(page);
      // Pause before the jump: a slow axe run lets the film run on, so the jump target is the next
      // chapter start after wherever it stopped (paused, the timecode then stays put).
      await film.getByRole("button", { name: lang === "vi" ? "Dừng" : "Pause", exact: true }).click();
      await expect(film).toHaveAttribute("data-running", "false");
      const [, mm, ss] = ((await page.locator("[data-timecode]").textContent()) ?? "").split(":").map(Number);
      const next = [6, 12, 18, 24, 30, 0].find((t) => t === 0 || t > mm * 60 + ss)!;
      await film.focus();
      await page.keyboard.press("ArrowRight");
      await expect(page.locator("[data-timecode]")).toHaveText(`0:00:${String(next).padStart(2, "0")}`);
      await checkAxe(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test(`axe finds no violation on ${lang} at ${key} with the spin reel at rest and landed`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[key]);
      await page.clock.install();
      await gotoPage(page, lang);
      const section = page.locator("section#quay");
      await section.scrollIntoViewIfNeeded();
      await checkAxe(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      // axe needs real timers: pause the clock only while the spin runs, with the canvases hidden
      await page.evaluate(() => document.querySelectorAll("canvas").forEach((c) => (c.style.display = "none")));
      await page.clock.pauseAt(new Date(Date.now() + 60_000));
      await section.getByRole("button", { name: lang === "vi" ? "Quay bài" : "Spin", exact: true }).click();
      await page.clock.runFor(3400);
      await expect(page.locator("[data-reel] li[data-hit]")).toHaveCount(1);
      await page.locator("[data-reel] ul").evaluate((el) => el.getAnimations().forEach((a) => a.finish()));
      await page.clock.resume();
      await checkAxe(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test(`axe finds no violation on ${lang} at ${key} with the crowd scene calm and after a reaction`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[key]);
      await gotoPage(page, lang);
      const scene = page.locator("section#cungnhau [data-scene]");
      await scene.scrollIntoViewIfNeeded();
      await checkAxe(page);
      await scene.getByRole("button", { name: lang === "vi" ? "Hay quá" : "So good", exact: true }).click();
      const word = scene.locator("[data-word]");
      await expect(word).toHaveCount(1);
      // hold the word at full opacity while axe reads it; its fade is checked in together.spec.ts
      await page.addStyleTag({ content: "[data-word] { animation: none !important; }" });
      await checkAxe(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

// Last, so the software-WebGL start-ups do not overlap the first tests of the other specs.
for (const lang of ["vi", "en"] as const) {
  for (const key of ["mobile", "tablet", "desktop"] as const) {
    test(`axe finds no violation on ${lang} at ${key} with the 3D mic loaded`, async ({ page }) => {
      await throttleFrames(page);
      await page.setViewportSize(VIEWPORTS[key]);
      await gotoPage(page, lang);
      await expectGl(page, "3d");
      await checkAxe(page);
    });
  }
}

// The live glow and its rings, with the 3D mic running.
for (const lang of ["vi", "en"] as const) {
  for (const key of ["mobile", "tablet", "desktop"] as const) {
    test(`axe finds no violation on ${lang} at ${key} with the 3D mic live`, async ({ page }) => {
      await throttleFrames(page);
      await page.setViewportSize(VIEWPORTS[key]);
      await gotoPage(page, lang);
      await expectGl(page, "3d");
      await skipTransitions(page);
      const { rect } = await readPose(page);
      await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
      const hero = page.locator("header#top");
      await expect(hero).toHaveAttribute("data-live", "true");
      await expect(hero.locator("i")).toHaveCount(0, { timeout: 10_000 });
      await checkAxe(page);
    });
  }
}
