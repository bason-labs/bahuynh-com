import { expect, gotoPage, test, VIEWPORTS } from "./support";
import { expectGl, gotoLoading, hero, holdMicChunk, isMicChunk, readPose, SMALL_DESKTOP, throttleFrames } from "./mic";

test.beforeEach(({ page }) => throttleFrames(page));

const label = {
  vi: "Micro 3D. Kéo để xoay, chạm để bật.",
  en: "3D microphone. Drag to turn, tap to switch it on.",
} as const;

test("is drawn centred, head up, tilted 0.22 rad and in front of the wordmark, requested after first paint", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop);
  await gotoPage(page, "vi");
  await expectGl(page, "3d");
  const pose = await readPose(page);
  expect(pose.tilt).toBe(0.22);
  const box = (await hero(page).boundingBox())!;
  expect(Math.abs(pose.rect.x + pose.rect.width / 2 - (box.x + box.width / 2))).toBeLessThanOrEqual(2);
  expect(pose.rect.y).toBeGreaterThanOrEqual(box.y);
  expect(pose.rect.width).toBeGreaterThan(40);
  const z = await hero(page).evaluate((h) => {
    const of = (el: Element) => Number(getComputedStyle(el).zIndex);
    return { canvas: of(h.querySelector("canvas:not([data-heat])")!), word: of(h.querySelector("[class*='word']")!) };
  });
  expect(z.canvas).toBeGreaterThan(z.word);
  await expect(page.locator("header#top [data-mic]")).toBeHidden();
  // REQ-LAND-048: the 3D chunk is requested after first contentful paint, from the page's own origin.
  const timing = await page.evaluate(() => {
    const fcp = performance.getEntriesByName("first-contentful-paint")[0].startTime;
    const requests = performance.getEntriesByType("resource").map((e) => ({ url: e.name, start: e.startTime }));
    return { fcp, host: location.host, requests };
  });
  const mic = timing.requests.filter((r) => isMicChunk(r.url));
  expect(mic).toHaveLength(1);
  expect(mic[0].start).toBeGreaterThan(timing.fcp);
  expect(new URL(mic[0].url).host).toBe(timing.host);
});

for (const lang of ["vi", "en"] as const) {
  test(`${lang}: the canvas is hidden from assistive tech and the mic button is unchanged`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await gotoPage(page, lang);
    const button = hero(page).getByRole("button", { name: label[lang], exact: true });
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expectGl(page, "3d");
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(hero(page).getByRole("button")).toHaveCount(1);
    await expect(hero(page).locator("canvas:not([data-heat])")).toHaveAttribute("aria-hidden", "true");
    await expect(hero(page).getByRole("img")).toHaveCount(0);
  });
}

test("500 dust particles rise and wrap from top to bottom", async ({ page }) => {
  await page.setViewportSize(SMALL_DESKTOP);
  await gotoPage(page, "vi");
  await expectGl(page, "3d");
  await expect.poll(async () => (await readPose(page)).frame).toBeGreaterThan(0);
  const first = await readPose(page);
  expect(first.dustCount).toBe(500);
  expect(first.dustY).toHaveLength(500);
  await page.waitForTimeout(600);
  const second = await readPose(page);
  expect(second.frame).toBeGreaterThan(first.frame);
  const rose = first.dustY.filter((y, i) => second.dustY[i] > y).length;
  expect(rose).toBeGreaterThan(400);
  // Seeded in [-2.4, 5.6); only a wrapped particle sits below -2.4 (it re-enters at -3).
  expect(second.dustY.some((y) => y < -2.4)).toBe(true);
});

test("the idle turn is 0.0025 rad per rendered frame, the height bobs by 0.06 and the loop stops off screen", async ({ page }) => {
  test.setTimeout(75_000);
  await page.setViewportSize(SMALL_DESKTOP);
  await gotoPage(page, "en");
  await expectGl(page, "3d");
  await expect.poll(async () => (await readPose(page)).frame).toBeGreaterThan(2);
  const a = await readPose(page);
  expect(a.restHeight).toBe(1.5);
  expect(a.cameraDistance).toBe(19);
  await page.waitForTimeout(1000);
  const b = await readPose(page);
  const frames = b.frame - a.frame;
  expect(frames).toBeGreaterThan(0);
  const perFrame = (b.idleYaw - a.idleYaw) / frames;
  expect(Math.abs(perFrame - 0.0025)).toBeLessThanOrEqual(0.0025 * 0.2);
  expect(b.yaw - a.yaw).toBeCloseTo(b.idleYaw - a.idleYaw, 6);
  // A bob period is 7.85 s.
  // Sample until both the top and the bottom of the bob have been rendered: on a slow CI runner
  // frames are sparse, so a fixed sample window can miss the peaks.
  const heights: number[] = [];
  await expect
    .poll(
      async () => {
        heights.push((await readPose(page)).height);
        return Math.min(Math.max(...heights) - a.restHeight, a.restHeight - Math.min(...heights));
      },
      { timeout: 30_000, intervals: [100] },
    )
    .toBeGreaterThan(0.05);
  expect(Math.max(...heights) - a.restHeight).toBeGreaterThan(0.05);
  expect(Math.max(...heights) - a.restHeight).toBeLessThanOrEqual(0.0601);
  expect(a.restHeight - Math.min(...heights)).toBeGreaterThan(0.05);
  expect(a.restHeight - Math.min(...heights)).toBeLessThanOrEqual(0.0601);
  // The loop stops while the hero is off screen and resumes when it is back.
  const canvas = hero(page).locator("canvas:not([data-heat])");
  await expect(canvas).toHaveAttribute("data-running", "true");
  await page.evaluate(() => {
    document.body.style.minHeight = "6000px";
    window.scrollTo({ top: 3000, behavior: "instant" });
  });
  await expect(canvas).toHaveAttribute("data-running", "false");
  const still = (await readPose(page)).frame;
  await page.waitForTimeout(800);
  expect((await readPose(page)).frame).toBe(still);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(canvas).toHaveAttribute("data-running", "true");
});

test("swapping the CSS mic for the 3D mic moves no text or button at 375x812, and rests higher and farther there", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  const release = await holdMicChunk(page);
  await gotoLoading(page, "vi");
  const h = hero(page);
  await expect(h).toHaveAttribute("data-gl", "loading");
  await expect(h.locator("[data-mic]")).toBeVisible();
  const boxes = () =>
    h.evaluate((el) =>
      [...el.querySelectorAll("h1, a, [class*='hint'], [class*='onair']")].map((e) => {
        const r = e.getBoundingClientRect();
        return [e.tagName, r.x, r.y, r.width, r.height];
      }),
    );
  await expect(h.locator("a")).toHaveCount(2);
  const before = await boxes();
  expect(before.length).toBeGreaterThanOrEqual(5);
  release();
  await expectGl(page, "3d");
  expect(await boxes()).toEqual(before);
  const pose = await readPose(page);
  expect([pose.cameraDistance, pose.restHeight]).toEqual([23, 2.35]);
});

