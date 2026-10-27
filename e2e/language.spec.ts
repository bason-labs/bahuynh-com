import type { Page } from "@playwright/test";
import { expect, gotoPage, test, VIEWPORTS } from "./support";

async function placeSection(page: Page, id: string, offset: number) {
  await page.evaluate(
    ([sectionId, px]) => {
      const el = document.getElementById(sectionId as string)!;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (px as number), behavior: "instant" });
    },
    [id, offset],
  );
}

const switchLink = (page: Page, name: "EN" | "VI") => page.locator(`nav a[data-lang-link]`, { hasText: name });
const sectionTop = (page: Page, id: string) =>
  page.evaluate((i) => document.getElementById(i)!.getBoundingClientRect().top, id);

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop);
});

test("the raw HTML carries the plain language link", async ({ request }) => {
  expect(await (await request.get("/")).text()).toMatch(/<a [^>]*href="\/en\/"[^>]*data-lang-link/);
  expect(await (await request.get("/en/")).text()).toMatch(/<a [^>]*href="\/"[^>]*data-lang-link/);
});

test("EN opens /en/#quay in English with the section just below the navigation bar", async ({ page }) => {
  await gotoPage(page, "vi");
  await placeSection(page, "quay", 300);
  await expect(switchLink(page, "EN")).toHaveAttribute("href", "/en/#quay");
  await switchLink(page, "EN").click();
  await expect(page).toHaveURL(/\/en\/#quay$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect.poll(() => sectionTop(page, "quay")).toBeLessThanOrEqual(80);
  await expect.poll(() => sectionTop(page, "quay")).toBeGreaterThanOrEqual(56);
});

test("VI opens /#batdau from the last section", async ({ page }) => {
  await gotoPage(page, "en");
  await placeSection(page, "batdau", 200);
  await expect(switchLink(page, "VI")).toHaveAttribute("href", "/#batdau");
  await switchLink(page, "VI").click();
  await expect(page).toHaveURL(/\/#batdau$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(1000);
});

test("at scroll 0 the link has no hash and EN opens /en/ at the top", async ({ page }) => {
  await gotoPage(page, "vi");
  await expect(switchLink(page, "EN")).toHaveAttribute("href", "/en/");
  await switchLink(page, "EN").click();
  await expect(page).toHaveURL(/\/en\/$/);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("the link goes back to its plain form when scrolling back to the top", async ({ page }) => {
  await gotoPage(page, "vi");
  await placeSection(page, "cungnhau", 100);
  await expect(switchLink(page, "EN")).toHaveAttribute("href", "/en/#cungnhau");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(switchLink(page, "EN")).toHaveAttribute("href", "/en/");
});

test("switching language resets the hero, the film, the reel and the counter", async ({ page }) => {
  await page.clock.install();
  await gotoPage(page, "vi");
  const hero = page.locator("header#top");
  await page.mouse.click(VIEWPORTS.desktop.width / 2, 300);
  await expect(hero).toHaveAttribute("data-live", "true");

  await placeSection(page, "xem", 100);
  await page.locator("section#xem").locator("[data-film] + div button").nth(3).click();
  await page.clock.runFor(2_000);
  await expect(page.locator("[data-timecode]")).toHaveText("0:00:20");

  await placeSection(page, "quay", 100);
  await page.locator("section#quay").getByRole("button", { name: "Quay bài", exact: true }).click();
  await page.clock.runFor(3_400);
  await expect(page.locator("[data-reel] li[data-hit]")).toHaveCount(1);
  await expect(page.locator("[data-tv]").getByRole("listitem")).toHaveCount(3);

  const scene = page.locator("section#cungnhau [data-scene]");
  await placeSection(page, "cungnhau", 100);
  await scene.getByRole("button", { name: "Vỗ tay", exact: true }).click();
  await expect(scene.locator("[data-count]")).not.toHaveText("1.248");

  await placeSection(page, "quay", 100);
  await page.clock.runFor(100);
  await expect(switchLink(page, "EN")).toHaveAttribute("href", "/en/#quay");
  await switchLink(page, "EN").click();
  await expect(page).toHaveURL(/\/en\/#quay$/);
  await expect(page.locator("header#top")).toHaveAttribute("data-live", "false");
  await expect(page.locator("[data-film]")).toHaveAttribute("data-running", "false");
  await expect(page.locator("[data-timecode]")).toHaveText("0:00:00");
  await expect(page.locator("[data-tv]").getByRole("listitem")).toHaveCount(2);
  await expect(page.locator("section#cungnhau [data-scene] [data-count]")).toHaveText("1,248");
});

test("the keyboard switches language to the same section", async ({ page }) => {
  await gotoPage(page, "vi");
  await placeSection(page, "cungnhau", 200);
  const link = switchLink(page, "EN");
  await expect(link).toHaveAttribute("href", "/en/#cungnhau");
  await link.focus();
  await expect(link).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/#cungnhau$/);
  await expect.poll(() => sectionTop(page, "cungnhau")).toBeLessThanOrEqual(80);
  expect(await sectionTop(page, "cungnhau")).toBeGreaterThanOrEqual(56);
});
