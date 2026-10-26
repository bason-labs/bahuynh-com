import type { Page } from "@playwright/test";
import { expect, gotoPage, test, VIEWPORTS } from "./support";

const names = { vi: "Dừng chuyển động", en: "Pause motion" } as const;
const grain = (page: Page) =>
  page.evaluate(() => document.querySelector(".grain")!.getAnimations().map((a) => a.playState));
const motion = (page: Page) => page.locator("html").getAttribute("data-motion");

for (const lang of ["vi", "en"] as const) {
  const name = names[lang];
  const toggle = (page: Page) => page.getByRole("navigation").getByRole("button", { name, exact: true });

  test.describe(`motion toggle on ${lang}`, () => {
    for (const key of ["mobile", "tablet", "desktop", "narrow"] as const) {
      test(`visible, unpressed and fits at ${key}`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS[key]);
        await gotoPage(page, lang);
        const button = toggle(page);
        await expect(button).toBeInViewport();
        await expect(button).toHaveAttribute("aria-pressed", "false");
        await button.focus();
        await expect(button).toBeFocused();
        const box = (await button.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(24);
        expect(box.height).toBeGreaterThanOrEqual(24);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        const nav = await page.getByRole("navigation").evaluate((el) => el.scrollWidth - el.clientWidth);
        expect(nav).toBeLessThanOrEqual(0);
      });
    }

    test("sits after the language switch and before the bar button", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const order = await page.getByRole("navigation").evaluate((nav) =>
        [...nav.querySelectorAll("a[href], button")].map((el) => el.getAttribute("href") ?? el.getAttribute("aria-label")),
      );
      const lastLang = order.indexOf(name) - 1;
      expect(lastLang).toBeGreaterThan(0);
      expect(order[order.indexOf(name) + 1]).toBe("https://kara.bahuynh.com");
    });

    test("pressing stops motion, pressing again restores it", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const button = toggle(page);
      await expect.poll(() => grain(page)).toEqual(["running"]);
      await expect(page.locator("html")).toHaveCSS("scroll-behavior", "smooth");
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
      await expect.poll(() => grain(page)).toEqual([]);
      await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
      await page.evaluate(() => {
        document.body.style.minHeight = "6000px";
      });
      await page.getByRole("navigation").getByRole("link", { name: "BS KARA" }).click();
      await page.evaluate(() => window.scrollTo(0, 3000));
      await page.getByRole("navigation").getByRole("link", { name: "BS KARA" }).click();
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "false");
      await expect(page.locator("html")).toHaveAttribute("data-motion", "run");
      await expect.poll(() => grain(page)).toEqual(["running"]);
      await expect(page.locator("html")).toHaveCSS("scroll-behavior", "smooth");
    });

    test("the choice survives a reload and the language link, not a new context", async ({ page, browser }) => {
      await gotoPage(page, lang);
      await toggle(page).click();
      await page.reload();
      await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
      await expect.poll(() => grain(page)).toEqual([]);
      await page.getByRole("group").getByRole("link").click();
      await page.waitForURL(lang === "vi" ? /\/en\/$/ : /\/$/);
      const other = names[lang === "vi" ? "en" : "vi"];
      await expect(page.getByRole("navigation").getByRole("button", { name: other, exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      const fresh = await browser.newContext();
      const page2 = await fresh.newPage();
      await gotoPage(page2, lang);
      await expect(toggle(page2)).toHaveAttribute("aria-pressed", "false");
      await fresh.close();
    });

    test("storage is sessionStorage only", async ({ page }) => {
      await gotoPage(page, lang);
      await toggle(page).click();
      expect(await page.evaluate(() => sessionStorage.getItem("bahuynh.motion"))).toBe("reduce");
      await toggle(page).click();
      expect(await page.evaluate(() => sessionStorage.getItem("bahuynh.motion"))).toBe("run");
      expect(await page.evaluate(() => [document.cookie, localStorage.length, sessionStorage.length])).toEqual([
        "",
        0,
        1,
      ]);
    });
  });
}

test.describe("system asks for reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  for (const lang of ["vi", "en"] as const) {
    test(`${lang} loads pressed with no animation, unpressing runs motion`, async ({ page }) => {
      await gotoPage(page, lang);
      const button = page.getByRole("navigation").getByRole("button", { name: names[lang], exact: true });
      await expect(button).toHaveAttribute("aria-pressed", "true");
      expect(await motion(page)).toBe("reduce");
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "false");
      await expect.poll(() => grain(page)).toEqual(["running"]);
      await expect(page.locator("html")).toHaveCSS("scroll-behavior", "smooth");
    });
  }
});

const marqueeState = (page: Page) =>
  page.evaluate(() => {
    const row = document.querySelector("[data-marquee]")!.firstElementChild!;
    return { running: row.getAnimations().length, x: row.firstElementChild!.getBoundingClientRect().x };
  });

async function expectMarqueeStill(page: Page) {
  const before = await marqueeState(page);
  expect(before.running).toBe(0);
  await page.waitForTimeout(2000);
  expect((await marqueeState(page)).x).toBe(before.x);
}

test.describe("marquee under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  for (const lang of ["vi", "en"] as const) {
    test(`${lang} marquee stays still`, async ({ page }) => {
      await gotoPage(page, lang);
      await expectMarqueeStill(page);
    });
  }
});

for (const lang of ["vi", "en"] as const) {
  test(`${lang} marquee moves, then stops with the pause toggle`, async ({ page }) => {
    await gotoPage(page, lang);
    await expect.poll(async () => (await marqueeState(page)).running).toBe(1);
    await page.getByRole("navigation").getByRole("button", { name: names[lang], exact: true }).click();
    await expectMarqueeStill(page);
  });
}
