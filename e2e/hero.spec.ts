import { expect, gotoPage, test, VIEWPORTS } from "./support";

const copy = {
  vi: {
    h1: "Karaoke cho cả nhóm.",
    accent: "cả nhóm.",
    lede: "TV là sân khấu, điện thoại là micro và điều khiển, MC AI dẫn từng bài. Mở phòng trong mười giây, không cần cài đặt.",
    open: "Mở phòng hát",
    film: "▶ Xem 36 giây",
    meta: ["Web · TV · Máy chiếu", "Miễn phí để bắt đầu"],
    hint: "Kéo để xoay · chạm để bật micro",
    label: "On air",
  },
  en: {
    h1: "Karaoke for the whole group.",
    accent: "the whole group.",
    lede: "The TV is the stage, phones are the mic and the remote, and an AI host introduces every song. A room is open in ten seconds, nothing to install.",
    open: "Open a room",
    film: "▶ Watch 36 sec",
    meta: ["Web · TV · Projector", "Free to start"],
    hint: "Drag to turn · tap to switch the mic on",
    label: "On air",
  },
} as const;

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];

  test.describe(`hero on ${lang}`, () => {
    test("copy, links and idle state at 1440x900", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      await expect(hero).toHaveAttribute("data-live", "false");
      await expect(hero).toHaveAttribute("data-gl", "loading");
      const h1 = hero.getByRole("heading", { level: 1 });
      await expect(h1).toHaveText(c.h1);
      const em = h1.locator("em");
      await expect(em).toHaveText(c.accent);
      const emStyle = await em.evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.fontStyle, s.color, s.fontFamily];
      });
      expect(emStyle[0]).toBe("italic");
      expect(emStyle[1]).toBe("rgb(255, 233, 196)");
      expect(emStyle[2]).toMatch(/playfair/i);
      await expect(hero.getByText(c.lede, { exact: true })).toBeVisible();
      const open = hero.getByRole("link", { name: c.open, exact: true });
      await expect(open).toHaveAttribute("href", "https://kara.bahuynh.com");
      await expect(open).toHaveClass(/solid/);
      await expect(hero.getByRole("link", { name: c.film, exact: true })).toHaveAttribute("href", "#xem");
      for (const m of c.meta) {
        const el = hero.getByText(m, { exact: true });
        await expect(el).toBeVisible();
        await expect(el).toHaveCSS("color", "rgb(141, 139, 135)");
      }
      const hint = hero.getByText(c.hint, { exact: true });
      await expect(hint).toBeVisible();
      await expect(hint.locator("..")).toHaveCSS("opacity", "1");
      const label = hero.getByText(c.label, { exact: true });
      const box = label.locator("..");
      await expect(box).toHaveCSS("color", "rgb(141, 139, 135)");
      await expect(box).toHaveCSS("border-top-width", "1px");
      await expect(box).toHaveCSS("border-top-color", "rgba(255, 255, 255, 0.16)");
      const heroBox = (await hero.boundingBox())!;
      const lb = (await box.boundingBox())!;
      expect(lb.y - heroBox.y).toBeCloseTo(84, 0);
      expect(lb.x + lb.width / 2).toBeCloseTo(720, 0);
      const lyric = hero.locator('[aria-hidden="true"]').last();
      await expect(lyric).toHaveCSS("opacity", "0");
    });

    test("hero height follows the small viewport, minimum 640", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      expect((await page.locator("header#top").boundingBox())!.height).toBe(900);
      await page.setViewportSize({ width: 1440, height: 560 });
      expect((await page.locator("header#top").boundingBox())!.height).toBe(640);
    });

    test("wordmark, cone and CSS mic", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      const heroBox = (await hero.boundingBox())!;
      const word = hero.locator('div[aria-hidden="true"]', { hasText: "BS KARA" });
      await expect(word).toHaveAttribute("aria-hidden", "true");
      await expect(word).toHaveText("BS KARA");
      const ws = await word.evaluate((el) => {
        const s = getComputedStyle(el);
        const k = getComputedStyle(el.querySelectorAll("span")[1]);
        const b = getComputedStyle(el.querySelectorAll("span")[0]);
        return {
          weight: s.fontWeight,
          size: s.fontSize,
          variation: s.fontVariationSettings,
          select: s.userSelect,
          bs: b.color,
          kFill: k.color,
          kStroke: k.webkitTextStrokeWidth,
          kStrokeColor: k.webkitTextStrokeColor,
        };
      });
      expect(ws.weight).toBe("900");
      expect(ws.size).toBe("230.4px");
      expect(ws.variation).toContain("125");
      expect(ws.select).toBe("none");
      expect(ws.bs).toBe("rgb(243, 239, 232)");
      expect(ws.kFill).toBe("rgba(0, 0, 0, 0)");
      expect(ws.kStroke).toBe("1.5px");
      expect(ws.kStrokeColor).toBe("rgba(243, 239, 232, 0.55)");
      const wb = (await word.boundingBox())!;
      expect(wb.x + wb.width / 2).toBeCloseTo(720, 0);
      expect(wb.y + wb.height / 2 - heroBox.y).toBeCloseTo(heroBox.height * 0.42, 0);
      const zs = await Promise.all(
        [word, hero.locator("[data-mic]")].map((l) => l.evaluate((el) => Number(getComputedStyle(el).zIndex))),
      );
      expect(zs[0]).toBeLessThan(zs[1]);

      const cone = hero.locator('div[aria-hidden="true"]').first();
      const cs = await cone.evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.opacity, s.pointerEvents, s.backgroundImage, s.top];
      });
      expect(cs[0]).toBe("0.75");
      expect(cs[1]).toBe("none");
      expect(cs[2]).toContain("rgba(255, 233, 196, 0.2)");

      const mic = hero.locator("[data-mic]");
      await expect(mic).toHaveAttribute("aria-hidden", "true");
      await expect(mic).toBeVisible();
      const mb = (await mic.boundingBox())!;
      expect(mb.width).toBe(120);
      expect(mb.height).toBe(330);
      expect(mb.x + mb.width / 2).toBeCloseTo(720, 0);
    });

    test("bottom-left copy and bottom-right hint at 1440", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      const h1 = (await hero.getByRole("heading", { level: 1 }).boundingBox())!;
      const hint = hero.getByText(c.hint, { exact: true });
      const hb = (await hint.boundingBox())!;
      const heroBox = (await hero.boundingBox())!;
      expect(h1.x).toBeLessThan(200);
      expect(h1.y).toBeGreaterThan(heroBox.height / 2);
      expect(hb.x).toBeGreaterThan(720);
      expect(hb.y).toBeGreaterThan(heroBox.height / 2);
      expect(1440 - (hb.x + hb.width)).toBeLessThan(200);
      expect(await hint.locator("..").evaluate((el) => getComputedStyle(el.parentElement!).textAlign)).toBe("right");
    });

    test("tablet keeps the lede and a 4 % gutter", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      await expect(hero.getByText(c.lede, { exact: true })).toBeVisible();
      const h1 = (await hero.getByRole("heading", { level: 1 }).boundingBox())!;
      expect(h1.x).toBeCloseTo(30.72, 1);
    });

    test("phone layout at 375x812", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      const heroBox = (await hero.boundingBox())!;
      expect(heroBox.height).toBe(812);
      const word = hero.locator('div[aria-hidden="true"]', { hasText: "BS KARA" });
      const wb = (await word.boundingBox())!;
      expect(wb.y + wb.height / 2 - heroBox.y).toBeCloseTo(heroBox.height * 0.31, 0);
      await expect(hero.getByText(c.lede, { exact: true })).toBeHidden();
      await expect(hero.getByRole("paragraph")).toHaveCount(0);
      const hint = (await hero.getByText(c.hint, { exact: true }).boundingBox())!;
      const h1 = (await hero.getByRole("heading", { level: 1 }).boundingBox())!;
      expect(hint.y + hint.height).toBeLessThanOrEqual(h1.y);
      expect(hint.x).toBeLessThan(h1.x + 40);
      expect(hint.x).toBeLessThan(120);
      const a = (await hero.getByRole("link", { name: c.open, exact: true }).boundingBox())!;
      const b = (await hero.getByRole("link", { name: c.film, exact: true }).boundingBox())!;
      const sameLine = Math.abs(a.y - b.y) < 2;
      if (!sameLine) expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
      else expect(b.x + b.width).toBeLessThanOrEqual(375);
    });
  });
}
