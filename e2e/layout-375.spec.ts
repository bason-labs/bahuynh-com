import type { Page } from "@playwright/test";
import { expectGl, hero, readPose, throttleFrames, withoutWebGl } from "./mic";
import { expect, gotoPage, skipTransitions, test, VIEWPORTS } from "./support";

const copy = {
  vi: { nav: "Chính", cta: "Mở phòng hát", group: "Ngôn ngữ", pause: "Dừng chuyển động", heroOpen: "Mở phòng hát", hint: "Kéo để xoay · chạm để bật micro" },
  en: { nav: "Main", cta: "Open a room", group: "Language", pause: "Pause motion", heroOpen: "Open a room", hint: "Drag to turn · tap to switch the mic on" },
} as const;

const TAP = { x: 187, y: 300 } as const;

type Box = { x: number; y: number; width: number; height: number };

const box = (page: Page, selector: string) =>
  page.evaluate((s) => document.querySelector(s)!.getBoundingClientRect().toJSON() as Box, selector);

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];

  test.describe(`phone layout at 375x812 on ${lang}`, () => {
    test.beforeEach(async ({ page }) => {
      await withoutWebGl(page);
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoPage(page, lang);
    });

    test("the bar shows the logo, switch and pause toggle only; the hero keeps its button", async ({ page }) => {
      const nav = page.getByRole("navigation", { name: c.nav });
      await expect(nav.getByRole("link", { name: "BS KARA" })).toBeVisible();
      await expect(nav.getByRole("group", { name: c.group })).toBeVisible();
      await expect(nav.getByRole("button", { name: c.pause })).toBeVisible();
      await expect(nav.getByRole("link", { name: c.cta })).toBeHidden();
      for (const link of await nav.locator("[data-nav-link]").all()) await expect(link).toBeHidden();
      await expect(hero(page).getByRole("link", { name: c.heroOpen, exact: true })).toBeVisible();
    });

    test("the hero is 812 px high, the wordmark is centred at 31 % and the lede is hidden", async ({ page }) => {
      const h = await box(page, "header#top");
      expect(h.height).toBe(812);
      const word = await box(page, "header#top [class*='word']");
      expect(Math.abs(word.y + word.height / 2 - h.y - h.height * 0.31)).toBeLessThanOrEqual(2);
      await expect(hero(page).locator("p")).toBeHidden();
    });

    test("the hint sits above the h1, left-aligned, and the buttons wrap if they do not fit", async ({ page }) => {
      const h1 = await box(page, "header#top h1");
      // the hint line starts with its dot, so measure the line, not the text after it
      const hint = (await hero(page).getByText(c.hint, { exact: true }).locator("..").boundingBox())!;
      expect(hint.y + hint.height).toBeLessThanOrEqual(h1.y);
      expect(hint.x).toBe(h1.x);
      const align = await hero(page).getByText(c.hint, { exact: true }).evaluate((el) => getComputedStyle(el.parentElement!.parentElement!).textAlign);
      expect(align).toBe("left");
      await expectButtonsFit(page);
    });

    test("the lyric sits above the h1, left-aligned, when live", async ({ page }) => {
      await skipTransitions(page);
      await page.mouse.click(TAP.x, TAP.y);
      await expect(hero(page)).toHaveAttribute("data-live", "true");
      const lyric = hero(page).locator("[class*='lyric']").first();
      await expect(lyric).toHaveCSS("opacity", "1");
      const h1 = await box(page, "header#top h1");
      const l = (await lyric.boundingBox())!;
      expect(l.y + l.height).toBeLessThanOrEqual(h1.y);
      expect(l.x).toBe(h1.x);
      await expect(lyric).toHaveCSS("text-align", "left");
      await expectButtonsFit(page);
    });

    test("the reel shows three rows of 80 px, a 240 px window", async ({ page }) => {
      const reel = await box(page, "[data-reel]");
      expect(reel.height).toBe(240);
      const rows = await page.evaluate(() => [...document.querySelectorAll("[data-reel] li")].map((li) => li.getBoundingClientRect().height));
      expect(rows.length).toBeGreaterThanOrEqual(3);
      for (const row of rows) expect(row).toBe(80);
    });

    test("the transport bar hides the key hint and keeps the toggle, timecode and progress", async ({ page }) => {
      const film = page.locator("section#xem");
      await expect(film.locator("[class*='keys']")).toBeHidden();
      await expect(film.locator("[class*='toggle']")).toBeVisible();
      await expect(film.locator("[data-timecode]")).toBeVisible();
      await expect(film.locator("[data-progress]")).toBeVisible();
    });

    test("each feature visual is 210 px high and the 98 is 110 px", async ({ page }) => {
      const heights = await page.evaluate(() =>
        [...document.querySelectorAll("section#tinhnang article")].map((a) => a.children[1].getBoundingClientRect().height),
      );
      expect(heights).toEqual(Array(6).fill(210));
      const score = page.locator("section#tinhnang article").nth(2).locator("div").nth(1).locator("div").first();
      await expect(score).toContainText("98");
      await expect(score).toHaveCSS("font-size", "110px");
    });

    test("the crowd overlay stacks the room label over the counter, both left-aligned", async ({ page }) => {
      const room = await box(page, "[data-room]");
      const count = await page.evaluate(() => {
        const el = document.querySelector("[data-count]")!.parentElement!;
        return { box: el.getBoundingClientRect().toJSON() as Box, align: getComputedStyle(el).textAlign };
      });
      expect(count.box.y).toBeGreaterThanOrEqual(room.y + room.height);
      expect(count.box.x).toBe(room.x);
      expect(count.align).toBe("left");
    });

    test("the document is exactly 375 px wide with 16 px side padding", async ({ page }) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
      const paddings = await page.evaluate(() =>
        [...document.querySelectorAll(".wrap")].map((el) => [getComputedStyle(el).paddingLeft, getComputedStyle(el).paddingRight]),
      );
      expect(paddings.length).toBeGreaterThanOrEqual(6);
      for (const p of paddings) expect(p).toEqual(["16px", "16px"]);
    });
  });
}

/** The two hero buttons share a line inside the padding, or the second sits wholly below the first. */
async function expectButtonsFit(page: Page) {
  const links = hero(page).locator("a.btn");
  await expect(links).toHaveCount(2);
  const a = (await links.nth(0).boundingBox())!;
  const b = (await links.nth(1).boundingBox())!;
  if (Math.abs(a.y - b.y) < 2) expect(b.x + b.width).toBeLessThanOrEqual(375 - 16);
  else expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
}

test.describe("phone layout with WebGL", () => {
  test.beforeEach(({ page }) => throttleFrames(page));

  for (const lang of ["vi", "en"] as const) {
    test(`${lang}: the camera is at 23, the rest height 2.35 and the mic clears the h1`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoPage(page, lang);
      await expectGl(page, "3d");
      const pose = await readPose(page);
      expect([pose.cameraDistance, pose.restHeight]).toEqual([23, 2.35]);
      const h1 = await box(page, "header#top h1");
      const separate =
        pose.rect.x + pose.rect.width <= h1.x ||
        h1.x + h1.width <= pose.rect.x ||
        pose.rect.y + pose.rect.height <= h1.y ||
        h1.y + h1.height <= pose.rect.y;
      expect(separate, JSON.stringify({ head: pose.rect, h1 })).toBe(true);
    });
  }
});
