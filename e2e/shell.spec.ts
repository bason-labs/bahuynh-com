import { expect, gotoPage, test, VIEWPORTS } from "./support";

const copy = {
  vi: {
    nav: "Chính",
    links: ["Trang chủ", "Video", "Quay bài", "Cùng nhau", "Tính năng"],
    cta: "Mở phòng hát",
    group: "Ngôn ngữ",
    footer: ["© 2026 BS Kara · Ba Huynh", "Làm ở Sài Gòn", "Quyền riêng tư"],
  },
  en: {
    nav: "Main",
    links: ["Home", "Film", "Spin", "Together", "Features"],
    cta: "Open a room",
    group: "Language",
    footer: ["© 2026 BS Kara · Ba Huynh", "Made in Saigon", "Privacy"],
  },
} as const;
const targets = ["#top", "#xem", "#quay", "#cungnhau", "#tinhnang"];

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];

  test.describe(`shell on ${lang}`, () => {
    test("bar content, order and targets at 1440", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const nav = page.getByRole("navigation", { name: c.nav });
      const logo = nav.getByRole("link", { name: "BS KARA" });
      await expect(logo).toHaveAttribute("href", "#top");
      await expect(logo.locator("i")).toHaveAttribute("aria-hidden", "true");
      const boxes = [(await logo.boundingBox())!];
      for (const [i, label] of c.links.entries()) {
        const link = nav.getByRole("link", { name: label, exact: true });
        await expect(link).toHaveAttribute("href", targets[i]);
        boxes.push((await link.boundingBox())!);
      }
      const group = nav.getByRole("group", { name: c.group });
      boxes.push((await group.boundingBox())!);
      const cta = nav.getByRole("link", { name: c.cta });
      await expect(cta).toHaveAttribute("href", "https://kara.bahuynh.com");
      await expect(cta).not.toHaveAttribute("target", /.*/);
      boxes.push((await cta.boundingBox())!);
      for (let i = 1; i < boxes.length; i++) expect(boxes[i].x).toBeGreaterThan(boxes[i - 1].x);
      // the flexible gap sits between the links and the switch
      expect(boxes[6].x - (boxes[5].x + boxes[5].width)).toBeGreaterThan(100);
      const mono = await nav.getByRole("link", { name: c.links[0], exact: true }).evaluate((el) => {
        const s = getComputedStyle(el.closest("ul")!);
        return [s.textTransform, s.fontFamily];
      });
      expect(mono[0]).toBe("uppercase");
      expect(mono[1]).toMatch(/mono/i);
    });

    test("language switch roles", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const group = page.getByRole("group", { name: c.group });
      const current = group.locator('[aria-current="true"]');
      const other = lang === "vi" ? "en" : "vi";
      await expect(group.locator("button")).toHaveCount(1);
      await expect(current).toHaveJSProperty("tagName", "BUTTON");
      await expect(current).toHaveAttribute("type", "button");
      await expect(current).toHaveAttribute("lang", lang);
      await expect(current.locator("[aria-hidden]")).toHaveText(lang.toUpperCase());
      await expect(current).toHaveCSS("background-color", "rgb(243, 239, 232)");
      await expect(current).toHaveCSS("color", "rgb(9, 9, 10)");
      const link = group.getByRole("link");
      await expect(link).toHaveAttribute("href", other === "en" ? "/en/" : "/");
      await expect(link).toHaveAttribute("hreflang", other);
      await expect(link).toHaveAttribute("lang", other);
      await expect(link).toHaveAccessibleName(other === "en" ? "English" : "Tiếng Việt");
      await expect(link).toHaveCSS("color", "rgb(141, 139, 135)");
      await expect(current).toHaveAccessibleName(lang === "en" ? "English" : "Tiếng Việt");
      await page.evaluate(() => window.scrollTo(0, 0));
      const url = page.url();
      await current.click();
      expect(page.url()).toBe(url);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });

    test("bar stays fixed with the fading background", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      await page.evaluate(() => {
        document.body.style.minHeight = "6000px";
        window.scrollTo({ top: 3000, behavior: "instant" });
      });
      const nav = page.getByRole("navigation", { name: c.nav });
      const rect = await nav.evaluate((el) => el.getBoundingClientRect().toJSON());
      expect(rect.top).toBe(0);
      expect(rect.height).toBe(56);
      const style = await nav.evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.backgroundImage, s.backdropFilter];
      });
      expect(style[0]).toBe("linear-gradient(rgba(9, 9, 10, 0.8), rgba(9, 9, 10, 0))");
      expect(style[1]).toBe("blur(6px)");
    });

    test("landmarks and footer", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      await expect(page.getByRole("navigation")).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);
      const footer = page.getByRole("contentinfo");
      expect(
        await page.evaluate(
          () => document.querySelector("main")!.compareDocumentPosition(document.querySelector("footer")!) & 4,
        ),
      ).toBeTruthy();
      const items = footer.locator("> *");
      await expect(items).toHaveText([...c.footer]);
      const xs = await items.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().x));
      expect(xs).toEqual([...xs].sort((a, b) => a - b));
      await expect(footer.getByRole("link")).toHaveAttribute("href", "https://kara.bahuynh.com/privacy");
      await expect(footer).toHaveCSS("color", "rgb(141, 139, 135)");
      await expect(footer).toHaveCSS("border-top", "1px solid rgba(255, 255, 255, 0.08)");
      expect(await footer.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/mono/i);
    });

    test("footer wraps and nothing overflows at 375", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoPage(page, lang);
      const ys = await page
        .getByRole("contentinfo")
        .locator("> *")
        .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().y)));
      expect(new Set(ys).size).toBeGreaterThan(1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("mobile bar keeps logo and switch, hides the button", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoPage(page, lang);
      const nav = page.getByRole("navigation", { name: c.nav });
      await expect(nav.getByRole("link", { name: "BS KARA" })).toBeVisible();
      await expect(nav.getByRole("link", { name: c.cta })).toBeHidden();
      await expect(nav.getByRole("link", { name: c.links[0], exact: true })).toBeHidden();
      const group = nav.getByRole("group", { name: c.group });
      await expect(group).toBeVisible();
      await group.getByRole("link").click();
      await expect(page).toHaveURL(lang === "vi" ? /\/en\/$/ : /\/$/);
      await expect(page.locator("html")).toHaveAttribute("lang", lang === "vi" ? "en" : "vi");
    });

    test("tab never reaches the section links at 768", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await gotoPage(page, lang);
      const seen: string[] = [];
      // five stops cover the bar; the hero buttons after it are page content
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Tab");
        seen.push(await page.evaluate(() => document.activeElement?.getAttribute("href") ?? ""));
      }
      for (const target of targets.slice(1)) expect(seen).not.toContain(target);
      expect(seen).toContain("https://kara.bahuynh.com");
    });

    test("grain overlay does not catch the pointer", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const grain = page.locator(".grain");
      await expect(grain).toHaveAttribute("aria-hidden", "true");
      await expect(grain).toHaveCSS("position", "fixed");
      await expect(grain).toHaveCSS("opacity", "0.06");
      await expect(grain).toHaveCSS("pointer-events", "none");
      const info = await page.evaluate(() => {
        const z = (el: Element) => Number(getComputedStyle(el).zIndex);
        const hit = document.elementFromPoint(720, 300);
        return {
          grainZ: z(document.querySelector(".grain")!),
          navZ: z(document.querySelector("nav")!),
          grainHit: hit?.classList.contains("grain"),
        };
      });
      expect(info.grainZ).toBeGreaterThan(info.navZ);
      expect(info.grainHit).toBe(false);
    });

    test("keyboard focus ring", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const nav = page.getByRole("navigation", { name: c.nav });
      const targetsToFocus = [
        nav.getByRole("link", { name: c.links[1], exact: true }),
        nav.getByRole("group", { name: c.group }).getByRole("link"),
        nav.getByRole("link", { name: c.cta }),
      ];
      for (const el of targetsToFocus) {
        await el.focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        await expect(el).toBeFocused();
        await expect(el).toHaveCSS("outline-style", "solid");
        await expect(el).toHaveCSS("outline-width", "2px");
        await expect(el).toHaveCSS("outline-color", "rgb(255, 74, 43)");
        await expect(el).toHaveCSS("outline-offset", "3px");
      }
      const current = nav.getByRole("group", { name: c.group }).locator("button");
      await current.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(current).toHaveCSS("outline-color", "rgb(255, 74, 43)");
    });
  });
}

test("html scroll settings", async ({ page }) => {
  await gotoPage(page, "vi");
  const html = page.locator("html");
  await expect(html).toHaveCSS("scroll-padding-top", "64px");
  await expect(html).toHaveCSS("scroll-behavior", "smooth");
});
