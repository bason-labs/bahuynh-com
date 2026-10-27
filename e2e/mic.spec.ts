import type { Page } from "@playwright/test";
import { expect, gotoPage, test, VIEWPORTS } from "./support";
import { expectGl, gotoLoading, hero, holdMicChunk, isMicChunk, readPose, SMALL_DESKTOP, throttleFrames } from "./mic";

// Frame-count tests tagged @fast need many frames, so they run at 50 ms per frame instead of 250 ms.
test.beforeEach(({ page }, info) => throttleFrames(page, info.tags.includes("@fast") ? 50 : 250));

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


/** Tall enough that the hero is a whole 100svh and the pointer can sit on its bottom edge. */
const FOLLOW_VIEW = { width: 800, height: 700 } as const;
const FAST = { tag: "@fast" } as const;

const mouseTo = (page: Page, x: number, y: number) => page.mouse.move(x, y);
const heroBox = async (page: Page) => (await hero(page).boundingBox())!;
// The CI runner's software WebGL can draw as few as 4 frames a second, so frame-count waits get minutes, not seconds.
const frameIs = (page: Page, atLeast: number) => expect.poll(async () => (await readPose(page)).frame, { timeout: 180_000 }).toBeGreaterThanOrEqual(atLeast);
/** Waits until the animation loop has drawn `n` more frames than `since`. */
const afterFrames = (page: Page, since: number, n: number) => frameIs(page, since + n);

/** The mic head's centre: the hero's copy sits over the rest of the hero at some widths. */
const micPoint = async (page: Page) => {
  const { rect } = await readPose(page);
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
};

async function openFollow(page: Page, lang: "vi" | "en" = "en") {
  await page.setViewportSize(FOLLOW_VIEW);
  await gotoPage(page, lang);
  await expectGl(page, "3d");
  await expect.poll(async () => (await readPose(page)).frame).toBeGreaterThan(0);
}

test("follow: resting at the hero centre leaves 0 offset; the edges give +-0.3 and +-0.175", FAST, async ({ page }) => {
  test.setTimeout(480_000);
  await openFollow(page);
  const box = await heroBox(page);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const rest = async (x: number, y: number) => {
    await mouseTo(page, x, y);
    // 80 frames: the 6 % ease is within 1 % of the full 0.6 rad swing.
    await afterFrames(page, (await readPose(page)).frame, 80);
    return readPose(page);
  };
  const centre = await rest(cx, cy);
  expect(Math.abs(centre.followYaw)).toBeLessThanOrEqual(0.01);
  expect(Math.abs(centre.followPitch)).toBeLessThanOrEqual(0.01);
  expect(Math.abs((await rest(box.x + box.width - 1, cy)).followYaw - 0.3)).toBeLessThanOrEqual(0.02);
  expect(Math.abs((await rest(box.x + 1, cy)).followYaw + 0.3)).toBeLessThanOrEqual(0.02);
  expect(Math.abs((await rest(cx, box.y + box.height - 1)).followPitch - 0.175)).toBeLessThanOrEqual(0.02);
  expect(Math.abs((await rest(cx, box.y + 1)).followPitch + 0.175)).toBeLessThanOrEqual(0.02);
});

test("follow: covers 90 % of a jump in 38 frames and holds its value when the pointer leaves", FAST, async ({ page }) => {
  test.setTimeout(360_000);
  await openFollow(page);
  const box = await heroBox(page);
  await mouseTo(page, box.x + box.width / 2, box.y + box.height / 2);
  await afterFrames(page, (await readPose(page)).frame, 80);
  const start = await readPose(page);
  await mouseTo(page, box.x + box.width - 1, box.y + box.height / 2);
  await afterFrames(page, start.frame, 38);
  const jumped = await readPose(page);
  expect(jumped.followYaw - start.followYaw).toBeGreaterThanOrEqual(0.9 * 0.3 * 0.99);
  // Scroll the hero's bottom 400 px up and put the pointer below it: the hero is still on screen and animating.
  await page.evaluate(() => {
    document.body.style.minHeight = "4000px";
    window.scrollTo({ top: 300, behavior: "instant" });
  });
  await mouseTo(page, box.x + box.width / 2, box.y + box.height - 100);
  const left = await readPose(page);
  await afterFrames(page, left.frame, 100);
  const settled = await readPose(page);
  await afterFrames(page, settled.frame, 60);
  expect((await readPose(page)).followYaw).toBeCloseTo(settled.followYaw, 3);
  expect(settled.followYaw).toBeGreaterThan(0.28);
});

test("drag: 100 px right turns the mic 1.0 rad, 100 px left turns it back, and the cursor is grab then grabbing", FAST, async ({ page }) => {
  await openFollow(page);
  const { x, y } = await micPoint(page);
  const button = hero(page).getByRole("button");
  await mouseTo(page, x, y);
  await expect(button).toHaveCSS("cursor", "grab");
  const before = await readPose(page);
  await page.mouse.down();
  await expect(button).toHaveCSS("cursor", "grabbing");
  await mouseTo(page, x + 100, y);
  await expect.poll(async () => (await readPose(page)).dragYaw - before.dragYaw).toBeCloseTo(1.0, 1);
  const right = await readPose(page);
  expect(Math.abs(right.dragYaw - before.dragYaw - 1.0)).toBeLessThanOrEqual(0.05);
  await mouseTo(page, x - 50, y);
  await expect.poll(async () => (await readPose(page)).dragYaw - right.dragYaw).toBeLessThan(-1.4);
  await page.mouse.up();
  await expect(button).toHaveCSS("cursor", "grab");
  await expect(hero(page)).toHaveAttribute("data-live", "false");
});

for (const [name, dx, sign] of [["right", 20, 1], ["left", -20, -1]] as const) {
  test(`drag: after releasing a 20 px ${name} move the spin slows by 0.94 a frame to under 0.001 rad`, FAST, async ({ page }) => {
    test.setTimeout(180_000);
    await openFollow(page);
    const { x, y } = await micPoint(page);
    await mouseTo(page, x, y);
    await page.mouse.down();
    await mouseTo(page, x + dx, y);
    await page.mouse.up();
    const released = await readPose(page);
    const perFrame = async (since: number, n: number) => {
      await afterFrames(page, since, n);
      const a = await readPose(page);
      await afterFrames(page, a.frame, 2);
      const b = await readPose(page);
      return (b.dragYaw - a.dragYaw) / (b.frame - a.frame);
    };
    const early = await perFrame(released.frame, 12);
    expect(early * sign).toBeGreaterThan(0.001);
    const late = await perFrame(released.frame, 90);
    expect(Math.abs(late)).toBeLessThan(0.001);
  });
}

test("a press and release under 6 px toggles live and 6 px or more does not", FAST, async ({ page }) => {
  await openFollow(page);
  const { x, y } = await micPoint(page);
  const drag = async (dx: number) => {
    await mouseTo(page, x, y);
    await page.mouse.down();
    await mouseTo(page, x + dx, y);
    await page.mouse.up();
  };
  await drag(5);
  await expect(hero(page)).toHaveAttribute("data-live", "true");
  await drag(6);
  await expect(hero(page)).toHaveAttribute("data-live", "true");
  await drag(-8);
  await expect(hero(page)).toHaveAttribute("data-live", "true");
  await drag(0);
  await expect(hero(page)).toHaveAttribute("data-live", "false");
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true });
  test("a 300 px swipe up that starts on the mic scrolls the page and neither spins the mic nor toggles live", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await gotoPage(page, "en");
    await expectGl(page, "3d");
    await page.evaluate(() => (document.body.style.minHeight = "4000px"));
    const touch = await page.context().newCDPSession(page);
    const head = await micPoint(page);
    const at = (y: number) => [{ x: head.x, y, id: 1 }];
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(head.y) });
    for (let i = 1; i <= 10; i++) {
      await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(head.y - i * 30) });
    }
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
    expect((await readPose(page)).dragYaw).toBe(0);
    await expect(hero(page)).toHaveAttribute("data-live", "false");
  });
});

test("scroll: the offsets follow the scroll distance up to one viewport and return at the top", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop);
  await gotoPage(page, "vi");
  await expectGl(page, "3d");
  await page.evaluate(() => (document.body.style.minHeight = "6000px"));
  const scrollTo = async (top: number, yaw: number, pitch: number, lift: number) => {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);
    await expect.poll(async () => (await readPose(page)).scrollYaw).toBeCloseTo(yaw, 6);
    const pose = await readPose(page);
    expect(pose.scrollYaw).toBeCloseTo(yaw, 2);
    expect(pose.scrollPitch).toBeCloseTo(pitch, 3);
    expect(pose.scrollLift).toBeCloseTo(lift, 2);
  };
  const first = await readPose(page);
  expect([first.scrollYaw, first.scrollPitch, first.scrollLift]).toEqual([0, 0, 0]);
  await scrollTo(450, 0.7, 0.125, 0.8);
  await scrollTo(900, 1.4, 0.25, 1.6);
  await scrollTo(2000, 1.4, 0.25, 1.6);
  await scrollTo(0, 0, 0, 0);
});

test("glow: going live eases in over about 0.5 s and going idle eases back out, never reversing", FAST, async ({ page }) => {
  test.setTimeout(60_000);
  await openFollow(page);
  await page.evaluate(() => {
    const w = window as unknown as { samples: { frame: number; glow: number }[] };
    w.samples = [];
    setInterval(() => {
      const pose = window.__micPose!;
      const last = w.samples[w.samples.length - 1];
      if (!last || last.frame !== pose.frame) w.samples.push({ frame: pose.frame, glow: pose.glow });
    }, 4);
  });
  const samples = () =>
    page.evaluate(() => (window as unknown as { samples: { frame: number; glow: number }[] }).samples);
  const { x, y } = await micPoint(page);
  const toggle = () => page.mouse.click(x, y);
  /** Frames from the last sample at the starting level to the first sample past 90 % of the way. */
  const frames = async (rising: boolean) => {
    const all = await samples();
    const level = (g: number) => (rising ? g : 1 - g);
    const startIndex = all.map((a) => level(a.glow)).lastIndexOf(0);
    const run = all.slice(startIndex);
    for (let i = 1; i < run.length; i++) {
      expect(run[i].glow * (rising ? 1 : -1)).toBeGreaterThanOrEqual(run[i - 1].glow * (rising ? 1 : -1));
    }
    const reached = run.findIndex((a) => level(a.glow) >= 0.9);
    expect(reached).toBeGreaterThan(0);
    return run[reached].frame - run[0].frame;
  };
  await expect.poll(async () => (await samples()).length).toBeGreaterThan(3);
  expect((await samples()).every((a) => a.glow === 0)).toBe(true);
  await toggle();
  await expect(hero(page)).toHaveAttribute("data-live", "true");
  await expect.poll(async () => (await samples()).at(-1)!.glow, { timeout: 30_000 }).toBe(1);
  const up = await frames(true);
  expect(up).toBeGreaterThanOrEqual(24);
  expect(up).toBeLessThanOrEqual(42);
  await toggle();
  await expect(hero(page)).toHaveAttribute("data-live", "false");
  await expect.poll(async () => (await samples()).at(-1)!.glow, { timeout: 30_000 }).toBe(0);
  const down = await frames(false);
  expect(down).toBeGreaterThanOrEqual(24);
  expect(down).toBeLessThanOrEqual(42);
});

test("the mic's head clears the h1 at 375x812 and the loop stops at the footer", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.mobile);
  await gotoPage(page, "en");
  await expectGl(page, "3d");
  const pose = await readPose(page);
  expect([pose.cameraDistance, pose.restHeight]).toEqual([23, 2.35]);
  const h1 = (await hero(page).locator("h1").boundingBox())!;
  const separate =
    pose.rect.x + pose.rect.width <= h1.x ||
    h1.x + h1.width <= pose.rect.x ||
    pose.rect.y + pose.rect.height <= h1.y ||
    h1.y + h1.height <= pose.rect.y;
  expect(separate, JSON.stringify({ head: pose.rect, h1 })).toBe(true);
  const canvas = hero(page).locator("canvas:not([data-heat])");
  await expect(canvas).toHaveAttribute("data-running", "true");
  // The page is short until later sections land: a spacer puts the footer a few screens below the hero.
  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.style.height = "3000px";
    document.querySelector("footer")!.before(spacer);
  });
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-running", "false");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(canvas).toHaveAttribute("data-running", "true");
});
