import { chromium, test as base } from "@playwright/test";
import { expectGl, gotoLoading, hero, holdMicChunk, micChunkFile, throttleFrames, withoutWebGl } from "./mic";
import { collectErrors, expect, gotoPage, PATHS, test, VIEWPORTS } from "./support";

const label = {
  vi: "Micro 3D. Kéo để xoay, chạm để bật.",
  en: "3D microphone. Drag to turn, tap to switch it on.",
} as const;

/** Like `test`, but a failed request or three's own logged error is expected; an uncaught exception never is. */
const tolerant = base.extend({
  page: async ({ page }, provide) => {
    const errors = collectErrors(page);
    await provide(page);
    const unexpected = errors.filter((e) => !/Failed to load resource|THREE\.WebGLRenderer/.test(e));
    expect(unexpected, "console and page errors").toEqual([]);
    expect(errors.filter((e) => e.startsWith("pageerror")), "uncaught exceptions").toEqual([]);
  },
});

async function expectCssMic(page: import("@playwright/test").Page) {
  const h = hero(page);
  await expectGl(page, "fallback");
  const mic = h.locator("[data-mic]");
  await expect(mic).toBeVisible();
  const size = (await mic.boundingBox())!;
  const box = (await h.boundingBox())!;
  expect([size.width, size.height]).toEqual([120, 330]);
  expect(Math.abs(size.x + size.width / 2 - (box.x + box.width / 2))).toBeLessThanOrEqual(1);
  await expect(h.getByText(/error|lỗi/i)).toHaveCount(0);
  return size;
}

for (const lang of ["vi", "en"] as const) {
  test(`${lang} shows the CSS microphone in Chromium started with WebGL disabled`, async ({ baseURL }) => {
    const browser = await chromium.launch({ args: ["--disable-webgl", "--disable-3d-apis"] });
    try {
      const page = await browser.newPage({ baseURL, viewport: VIEWPORTS.desktop });
      const errors = collectErrors(page);
      expect(await page.goto(PATHS[lang])).toBeTruthy();
      expect(await page.evaluate(() => !document.createElement("canvas").getContext("webgl"))).toBe(true);
      await expectCssMic(page);
      expect(errors, "console and page errors").toEqual([]);
    } finally {
      await browser.close();
    }
  });
}

test("a stubbed getContext shows the CSS microphone and requests no 3D chunk for 5 s", async ({ page }) => {
  await withoutWebGl(page);
  const requested: string[] = [];
  page.on("request", (r) => requested.push(r.url()));
  await page.setViewportSize(VIEWPORTS.desktop);
  await gotoPage(page, "vi");
  await expectCssMic(page);
  await page.waitForTimeout(5000);
  expect(requested.filter((u) => u.endsWith(`/${micChunkFile()}`))).toEqual([]);
});

tolerant("an aborted 3D chunk request leaves the CSS microphone", async ({ page }) => {
  await page.route(`**/${micChunkFile()}`, (route) => route.abort());
  await page.setViewportSize(VIEWPORTS.desktop);
  await gotoPage(page, "vi");
  await expectCssMic(page);
});

tolerant("a 404 for the 3D chunk leaves the CSS microphone", async ({ page }) => {
  await page.route(`**/${micChunkFile()}`, (route) => route.fulfill({ status: 404, body: "not found" }));
  await page.setViewportSize(VIEWPORTS.desktop);
  await gotoPage(page, "en");
  await expectCssMic(page);
});

tolerant("a renderer that throws leaves the CSS microphone", async ({ page }) => {
  // The throwaway probe canvas is detached and works; the hero's own canvas throws once the scene starts.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (/webgl/i.test(type) && this.isConnected) throw new Error("renderer unavailable");
      return (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  await page.setViewportSize(VIEWPORTS.desktop);
  await gotoPage(page, "vi");
  await expectCssMic(page);
});

test("while the 3D code loads the CSS microphone stands in, then the 3D mic replaces it", async ({ page }) => {
  await throttleFrames(page);
  await page.setViewportSize(VIEWPORTS.desktop);
  const release = await holdMicChunk(page);
  await gotoLoading(page, "vi");
  const h = hero(page);
  await expect(h).toHaveAttribute("data-gl", "loading");
  await expect(h.locator("[data-mic]")).toBeVisible();
  const held = (await h.locator("[data-mic]").boundingBox())!;
  expect([held.width, held.height]).toEqual([120, 330]);
  await page.waitForTimeout(3000);
  await expect(h).toHaveAttribute("data-gl", "loading");
  release();
  await expectGl(page, "3d");
  await expect(h.locator("[data-mic]")).toBeHidden();
});

test.describe("interaction in the fallback", () => {
  test.beforeEach(async ({ page }) => {
    await withoutWebGl(page);
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, "en");
  });

  test("pointer moves, drags and scrolling leave the CSS microphone where it is", async ({ page }) => {
    const mic = await expectCssMic(page);
    const same = async () => expect(await hero(page).locator("[data-mic]").boundingBox()).toEqual(mic);
    await page.mouse.move(100, 100);
    await page.mouse.move(1300, 700);
    await same();
    await page.mouse.move(700, 300);
    await page.mouse.down();
    await page.mouse.move(900, 330, { steps: 5 });
    await page.mouse.up();
    await same();
    await expect(hero(page)).toHaveAttribute("data-live", "false");
    await page.evaluate(() => {
      document.body.style.minHeight = "6000px";
      window.scrollTo({ top: 300, behavior: "instant" });
    });
    expect(await page.evaluate(() => window.scrollY)).toBe(300);
    expect(await hero(page).locator("[data-mic]").evaluate((el) => el.getBoundingClientRect().top)).toBe(mic.y - 300);
  });

  test("a click, Enter and Space toggle live, and the rings start at the CSS grille", async ({ page }) => {
    const mic = await expectCssMic(page);
    const h = hero(page);
    await page.mouse.click(720, 300);
    await expect(h).toHaveAttribute("data-live", "true");
    await expect(h.locator("i")).toHaveCount(3);
    for (const ring of await h.locator("i").all()) {
      const r = (await ring.boundingBox())!;
      expect(Math.abs(r.x + r.width / 2 - (mic.x + 60))).toBeLessThanOrEqual(2);
      expect(Math.abs(r.y + r.height / 2 - (mic.y + 50))).toBeLessThanOrEqual(2);
    }
    const button = h.getByRole("button", { name: label.en, exact: true });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(h).toHaveAttribute("data-live", "false");
    await page.keyboard.press("Space");
    await expect(h).toHaveAttribute("data-live", "true");
    await expect(button).toHaveAttribute("aria-pressed", "true");
  });
});
