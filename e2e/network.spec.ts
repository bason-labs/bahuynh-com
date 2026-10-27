import { gzipSync } from "node:zlib";
import type { Page } from "@playwright/test";
import { expectGl, gotoLoading, hero, holdMicChunk, isMicChunk, micChunkFile, throttleFrames, withoutWebGl } from "./mic";
import { expect, gotoPage, test, VIEWPORTS } from "./support";

// REQ-LAND-046.AC-2, REQ-LAND-047, REQ-LAND-048: bytes and requests on the production build, served with gzip.
test.beforeEach(({ page }) => throttleFrames(page, 250));

const CAP = 180 * 1024;

for (const lang of ["vi", "en"] as const) {
  test(`${lang}: the first-view JavaScript, without the 3D chunk, is at most 180 kB gzipped`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    const bodies: Promise<{ url: string; gz: number }>[] = [];
    page.on("response", (r) => {
      if (new URL(r.url()).pathname.endsWith(".js") && !isMicChunk(r.url())) {
        bodies.push(r.body().then((b) => ({ url: r.url(), gz: gzipSync(b).length })));
      }
    });
    await gotoPage(page, lang);
    await page.waitForTimeout(5_000);
    const files = await Promise.all(bodies);
    expect(files.length).toBeGreaterThan(0);
    const total = files.reduce((n, f) => n + f.gz, 0);
    expect(total, `${lang} first-view JS ${(total / 1024).toFixed(1)} kB gz`).toBeLessThanOrEqual(CAP);
  });
}

test("the hero HTML references no 3D chunk by a script, preload or modulepreload", async ({ page }) => {
  for (const path of ["/", "/en/"]) {
    const html = await (await page.request.get(path)).text();
    const tags = [...html.matchAll(/<(?:script|link)\b[^>]*>/g)].map((m) => m[0]);
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.filter((t) => t.includes(micChunkFile())), path).toEqual([]);
  }
});

test("the 3D chunk is requested after first contentful paint, from the site's own origin", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  await gotoPage(page, "vi");
  await expectGl(page, "3d");
  const timing = await page.evaluate(() => ({
    fcp: performance.getEntriesByName("first-contentful-paint")[0].startTime,
    host: location.host,
    requests: performance.getEntriesByType("resource").map((e) => ({ url: e.name, start: e.startTime })),
  }));
  const mic = timing.requests.filter((r) => isMicChunk(r.url));
  expect(mic).toHaveLength(1);
  expect(mic[0].start).toBeGreaterThan(timing.fcp);
  expect(new URL(mic[0].url).host).toBe(timing.host);
});

test("without WebGL the page settles on the fallback and requests no 3D chunk", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  await withoutWebGl(page);
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await gotoPage(page, "vi");
  await page.waitForTimeout(5_000);
  await expect(hero(page)).not.toHaveAttribute("data-gl", "3d");
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.filter(isMicChunk)).toEqual([]);
});

const heroBoxes = (page: Page) =>
  hero(page).evaluate((el) =>
    [...el.querySelectorAll("h1, a, button, p")].map((e) => {
      const r = e.getBoundingClientRect();
      return [e.tagName, r.x, r.y, r.width, r.height];
    }),
  );

test("when the 3D mic replaces the CSS stand-in at 375x812 no hero text or button moves", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  const release = await holdMicChunk(page);
  await gotoLoading(page, "vi");
  await expect(hero(page)).toHaveAttribute("data-gl", "loading");
  const before = await heroBoxes(page);
  expect(before.length).toBeGreaterThanOrEqual(5);
  release();
  await expectGl(page, "3d");
  expect(await heroBoxes(page)).toEqual(before);
});
