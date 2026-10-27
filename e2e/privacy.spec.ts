import type { Page } from "@playwright/test";
import { MOTION_KEY } from "../src/lib/motion";
import { expectGl, hero, throttleFrames } from "./mic";
import { expect, gotoPage, test, VIEWPORTS } from "./support";

// REQ-LAND-049: no cookie, no other origin, no storage beyond the motion choice, nothing from kara.bahuynh.com.
test.beforeEach(({ page }) => throttleFrames(page, 250));

const copy = {
  vi: { nav: "Chính", pause: "Dừng chuyển động", mic: "Micro 3D. Kéo để xoay, chạm để bật.", film: "Phát video", spin: "Quay bài", clap: "Vỗ tay", group: "Ngôn ngữ" },
  en: { nav: "Main", pause: "Pause motion", mic: "3D microphone. Drag to turn, tap to switch it on.", film: "Play video", spin: "Spin", clap: "Clap", group: "Language" },
} as const;

/** Every request URL and every response's headers, from now on. */
function record(page: Page) {
  const urls: string[] = [];
  const headers: Promise<Record<string, string>>[] = [];
  page.on("request", (r) => urls.push(r.url()));
  page.on("response", (r) => headers.push(r.allHeaders()));
  return { urls, headers: () => Promise.all(headers) };
}

const storage = (page: Page) =>
  page.evaluate(async () => ({
    cookie: document.cookie,
    local: localStorage.length,
    session: Object.keys(sessionStorage),
    databases: (await indexedDB.databases()).length,
  }));

const scrollThrough = async (page: Page) => {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += 600) await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
};

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];

  test(`${lang}: every control leaves no cookie, no other origin and only the motion choice in storage`, async ({ page, context }) => {
    test.slow(); // a long session of clicks, with software WebGL drawing
    await page.setViewportSize(VIEWPORTS.desktop);
    const log = record(page);
    await gotoPage(page, lang);
    await expectGl(page, "3d");
    expect((await storage(page)).session).toEqual([]);

    // Pausing motion first also stops the animation loops, so the long run of clicks below stays light.
    const nav = page.getByRole("navigation", { name: c.nav });
    await nav.getByRole("button", { name: c.pause }).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    for (const link of await nav.locator('a[href^="#"]').all()) await link.click();
    await hero(page).getByRole("button", { name: c.mic, exact: true }).click();
    await page.getByRole("button", { name: c.film, exact: true }).click();
    await page.locator("section#xem [data-film] + div button").nth(2).click();
    await page.locator("section#quay").getByRole("button", { name: c.spin, exact: true }).click();
    await page.locator("section#cungnhau [data-scene]").getByRole("button", { name: c.clap, exact: true }).click();
    // the CTA links are present and never followed
    expect(await page.locator('a[href^="https://kara.bahuynh.com"]').count()).toBeGreaterThan(0);

    const after = await storage(page);
    expect(after).toEqual({ cookie: "", local: 0, session: [MOTION_KEY], databases: 0 });
    // the language switch loads the other page in the same tab
    await nav.getByRole("group", { name: c.group }).getByRole("link").click();
    await expect(page.locator("html")).toHaveAttribute("lang", lang === "vi" ? "en" : "vi");
    expect(await storage(page)).toEqual(after);
    expect(await context.cookies()).toEqual([]);

    const origin = new URL(page.url()).origin;
    const external = log.urls.filter((u) => /^https?:/.test(u) && new URL(u).origin !== origin);
    expect(external, "requests to another origin").toEqual([]);
    expect(log.urls.filter((u) => /\.(woff2?|ttf|otf)(\?|$)/.test(u)).length).toBeGreaterThan(0);
    expect(log.urls.some((u) => u.includes("kara.bahuynh.com"))).toBe(false);
    for (const h of await log.headers()) expect(Object.keys(h)).not.toContain("set-cookie");
  });

  test(`${lang}: the scripts are the site's own Next chunks, and a scroll through the page requests nothing from kara.bahuynh.com`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    const log = record(page);
    await gotoPage(page, lang);
    const scripts = await page.evaluate(() => [...document.scripts].filter((s) => s.src).map((s) => new URL(s.src)));
    expect(scripts.length).toBeGreaterThan(0);
    for (const s of scripts) {
      expect(s.origin).toBe(new URL(page.url()).origin);
      expect(s.pathname).toMatch(/^\/_next\/static\/chunks\/[\w.~-]+\.js$/);
    }
    await scrollThrough(page);
    expect(log.urls.filter((u) => new URL(u).host === "kara.bahuynh.com")).toEqual([]);
  });
}
