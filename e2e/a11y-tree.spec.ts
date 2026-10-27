import type { Page } from "@playwright/test";
import { withoutWebGl } from "./mic";
import { expect, gotoPage, test, VIEWPORTS } from "./support";

const c = {
  vi: {
    mic: "Micro 3D. Kéo để xoay, chạm để bật.",
    frame: "Trình phát video. Phím mũi tên trái, phải để chuyển chương.",
    playVideo: "Phát video",
    play: "Phát",
    pause: "Dừng",
    spin: "Quay bài",
    announce: "Đang hát",
    tap: "Chạm để thả cảm xúc",
    reactions: ["Vỗ tay", "Hay quá", "Encore", "Cháy"],
    group: "Ngôn ngữ",
    nav: "Chính",
  },
  en: {
    mic: "3D microphone. Drag to turn, tap to switch it on.",
    frame: "Video player. Left and right arrow keys change chapter.",
    playVideo: "Play video",
    play: "Play",
    pause: "Pause",
    spin: "Spin",
    announce: "Now singing",
    tap: "Tap to send a reaction",
    reactions: ["Clap", "So good", "Encore", "Fire"],
    group: "Language",
    nav: "Main",
  },
} as const;

const hero = (page: Page) => page.locator("header#top");
const film = (page: Page) => page.locator("[data-film]");
const quay = (page: Page) => page.locator("section#quay");
const scene = (page: Page) => page.locator("section#cungnhau [data-scene]");

// ---- REQ-LAND-043.AC-1: the mic control ----

for (const lang of ["vi", "en"] as const) {
  for (const webgl of [true, false]) {
    test(`${lang}: the mic control is a toggle button named "${c[lang].mic}" ${webgl ? "with" : "without"} WebGL`, async ({ page }) => {
      if (!webgl) await withoutWebGl(page);
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const mic = hero(page).getByRole("button", { name: c[lang].mic, exact: true });
      await expect(mic).toHaveCount(1);
      await expect(mic).toHaveAttribute("aria-pressed", "false");
      await mic.focus();
      await page.keyboard.press("Enter");
      await expect(hero(page)).toHaveAttribute("data-live", "true");
      await expect(mic).toHaveAttribute("aria-pressed", "true");
      await page.keyboard.press("Space");
      await expect(mic).toHaveAttribute("aria-pressed", "false");
      await expect(hero(page)).toHaveAttribute("data-gl", webgl ? /^(loading|3d)$/ : "fallback");
    });
  }

  // ---- AC-2: the film ----

  test(`${lang}: the film frame, large play button, transport toggle and active chapter have names and states`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    const frame = page.getByRole("group", { name: c[lang].frame, exact: true });
    await expect(frame).toHaveCount(1);
    const big = frame.getByRole("button", { name: c[lang].playVideo, exact: true });
    const toggle = frame.getByRole("button", { name: c[lang].play, exact: true });
    await expect(big).toHaveCount(1);
    await expect(toggle).toHaveCount(1);
    await expect(frame.getByRole("button", { name: c[lang].pause, exact: true })).toHaveCount(0);
    const chapters = film(page).locator("xpath=..").locator("> div").last().getByRole("button");
    await expect(chapters).toHaveCount(6);
    await expect(chapters.and(page.locator('[aria-current="true"]'))).toHaveCount(0);
    await big.click();
    await expect(frame).toHaveAttribute("data-running", "true");
    await expect(frame.getByRole("button", { name: c[lang].pause, exact: true })).toHaveCount(1);
    await expect(frame.getByRole("button", { name: c[lang].play, exact: true })).toHaveCount(0);
    await expect(big).toHaveCount(0); // hidden with its inactive shot
    await expect(chapters.nth(0)).toHaveAttribute("aria-current", "true");
    await frame.focus();
    await page.keyboard.press("ArrowRight");
    await expect(chapters.nth(1)).toHaveAttribute("aria-current", "true");
    await expect(chapters.nth(0)).not.toHaveAttribute("aria-current", "true");
    await expect(chapters.and(page.locator('[aria-current="true"]'))).toHaveCount(1);
    await frame.getByRole("button", { name: c[lang].pause, exact: true }).click();
    await expect(frame.getByRole("button", { name: c[lang].play, exact: true })).toHaveCount(1);
  });

  // ---- AC-3: the reel ----

  test(`${lang}: the reel list is hidden, the button is aria-disabled while spinning, the landing is announced politely`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 5_000);
    await page.evaluate(() => document.querySelectorAll("canvas").forEach((cv) => (cv.style.display = "none")));
    const section = quay(page);
    const reelList = section.locator("[data-reel] ul");
    await expect(reelList).toHaveAttribute("aria-hidden", "true");
    await expect(section.locator("[data-reel]").getByRole("list")).toHaveCount(0);
    await expect(section.locator("[data-reel]").getByRole("listitem")).toHaveCount(0);
    const spin = section.getByRole("button", { name: c[lang].spin, exact: true });
    const region = section.locator('[aria-live="polite"]');
    await expect(region).toHaveCount(1);
    await expect(region).toHaveText("");
    await expect(spin).toHaveAttribute("aria-disabled", "false");
    await spin.click();
    await expect(spin).toHaveAttribute("aria-disabled", "true");
    await page.clock.fastForward(3_400);
    await expect(spin).toHaveAttribute("aria-disabled", "false");
    const title = await section.locator("[data-tv] [lang=vi]").first().textContent();
    expect(title).toBeTruthy();
    await expect(region).toHaveText(`${c[lang].announce}: ${title}`);
  });

  // ---- AC-4: the crowd scene ----

  test(`${lang}: the crowd scene offers one tap button apart from the four reactions, and the counter is polite`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    const s = scene(page);
    const tap = s.getByRole("button", { name: c[lang].tap, exact: true });
    await expect(tap).toHaveCount(1);
    await expect(tap.getByRole("button")).toHaveCount(0);
    expect(await tap.evaluate((el) => el.children.length === 0 && (el.textContent ?? "") === "")).toBe(true);
    await expect(s.getByRole("button")).toHaveCount(5);
    for (const label of c[lang].reactions) await expect(s.getByRole("button", { name: label, exact: true })).toHaveCount(1);
    const count = s.locator("[data-count]");
    await expect(count).toHaveAttribute("aria-live", "polite");
    const before = await count.textContent();
    await s.getByRole("button", { name: c[lang].reactions[1], exact: true }).click();
    await expect(count).not.toHaveText(before!);
  });

  // ---- AC-5, AC-6: the language switch and the navigation ----

  test(`${lang}: the language switch is a named group of two language options, the navigation is a named landmark`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    const group = page.getByRole("group", { name: c[lang].group, exact: true });
    await expect(group).toHaveCount(1);
    const vi = group.locator('[lang="vi"]');
    const en = group.locator('[lang="en"]');
    await expect(vi).toHaveCount(1);
    await expect(en).toHaveCount(1);
    await expect(group.getByRole(lang === "vi" ? "button" : "link", { name: "Tiếng Việt", exact: true })).toHaveAttribute("lang", "vi");
    await expect(group.getByRole(lang === "vi" ? "link" : "button", { name: "English", exact: true })).toHaveAttribute("lang", "en");
    await expect(group.locator('[aria-current="true"]')).toHaveCount(1);
    await expect(lang === "vi" ? vi : en).toHaveAttribute("aria-current", "true");
    await expect(lang === "vi" ? en : vi).not.toHaveAttribute("aria-current", "true");
    await expect(page.getByRole("navigation", { name: c[lang].nav, exact: true })).toHaveCount(1);
    await expect(page.getByRole("navigation")).toHaveCount(1);
  });
}

// ---- AC-7: decoration is out of the accessibility tree ----

/** Every decorative drawing; each must be `aria-hidden` (itself or an ancestor), `inert`, or empty so it has no node. */
const DECORATION: Record<string, string> = {
  grain: ".grain",
  wordmark: 'header#top [class*="_word"]',
  "spotlight cone": 'header#top [class*="_cone"]',
  "hero crowd": "header#top canvas",
  "together crowd": "section#cungnhau canvas",
  "CSS mic": '[data-mic="css"]',
  marquee: "[data-marquee]",
  "scroll ruler": "[data-scroll-rail]",
  "hero lyric": 'header#top [class*="_lyric"]',
  "REC dot": '[data-film] [class*="_rec"] b',
  phone: '[class*="_phone"]',
  QR: '[class*="_qr"]',
  "bar visual": "[data-bars]",
};

async function expectDecorationHidden(page: Page, extra: Record<string, string> = {}) {
  const found = await page.evaluate((selectors) => {
    const report: Record<string, { count: number; exposed: number }> = {};
    for (const [name, selector] of Object.entries(selectors)) {
      const all = [...document.querySelectorAll(selector)];
      const exposed = all.filter((el) => {
        if (el.closest('[aria-hidden="true"], [inert]')) return false;
        const empty =
          (el.textContent ?? "").trim() === "" &&
          !el.hasAttribute("aria-label") &&
          !el.querySelector("img, svg, [aria-label], button, a, [tabindex]");
        return !empty;
      });
      report[name] = { count: all.length, exposed: exposed.length };
    }
    return report;
  }, { ...DECORATION, ...extra });
  for (const [name, { count, exposed }] of Object.entries(found)) {
    expect(count, `${name} is on the page`).toBeGreaterThan(0);
    expect(exposed, `${name} exposed to assistive technology`).toBe(0);
  }
  // the tree itself, as text: the lyric and floating words must not appear
  const tree = await page.locator("body").ariaSnapshot();
  const lyric = (await page.locator('header#top [class*="_lyric"]').first().innerText()).split("\n").pop()!.trim();
  expect(lyric.length).toBeGreaterThan(10);
  expect(tree).not.toContain(lyric);
  for (const word of await page.locator("[data-word]").allTextContents()) expect(tree).not.toContain(word);
}

for (const lang of ["vi", "en"] as const) {
  test(`${lang}: no decoration is in the accessibility tree when idle`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    await expectDecorationHidden(page);
  });

  test(`${lang}: no decoration is in the accessibility tree with the hero live (rings drawn)`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 5_000); // the rings clear on a 2.4 s timer
    // a paused clock stalls the pointer actionability wait: use the keyboard
    await hero(page).getByRole("button", { name: c[lang].mic, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(hero(page)).toHaveAttribute("data-live", "true");
    await expect(hero(page).locator("i")).toHaveCount(3);
    await expectDecorationHidden(page, { rings: "header#top i" });
  });

  test(`${lang}: no decoration is in the accessibility tree with the film playing`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    await film(page).getByRole("button", { name: c[lang].playVideo, exact: true }).click();
    await expect(film(page)).toHaveAttribute("data-running", "true");
    await expectDecorationHidden(page);
  });

  test(`${lang}: no decoration is in the accessibility tree with the reel landed`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 5_000);
    await page.evaluate(() => document.querySelectorAll("canvas").forEach((cv) => (cv.style.display = "none")));
    await quay(page).getByRole("button", { name: c[lang].spin, exact: true }).click();
    await page.clock.fastForward(3_400);
    await expect(quay(page).locator("[data-reel] li[data-hit]")).toHaveCount(1);
    await expectDecorationHidden(page, { "reel list": "[data-reel] ul" });
  });

  test(`${lang}: no decoration is in the accessibility tree after a reaction (floating word, sparks)`, async ({ page }) => {
    await page.clock.install();
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 5_000); // words are removed by a 2.3 s timer
    await scene(page).getByRole("button", { name: c[lang].reactions[1], exact: true }).click();
    await expect(scene(page).locator("[data-word]")).toHaveCount(1);
    await expect(scene(page).locator("canvas")).toHaveAttribute("data-sparks", /^[1-9]/);
    await expectDecorationHidden(page, { "floating word": "[data-word]", sparks: "[data-sparks]" });
  });
}

// ---- AC-8: Vietnamese titles and lyrics keep lang="vi" on the English page ----

test("en: each Vietnamese song title and lyric line in the reel, the TV panel, the queue and feature 04 carries lang=vi", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize(VIEWPORTS.desktop);
  await gotoPage(page, "en");
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 5_000);
  await page.evaluate(() => document.querySelectorAll("canvas").forEach((cv) => (cv.style.display = "none")));
  const section = quay(page);
  await section.getByRole("button", { name: c.en.spin, exact: true }).click();
  await page.clock.fastForward(3_400);
  await expect(section.locator("[data-reel] li[data-hit]")).toHaveCount(1);
  const reelRows = section.locator("[data-reel] li");
  expect(await reelRows.count()).toBeGreaterThan(0);
  await expect(reelRows.and(page.locator(':not([lang="vi"])'))).toHaveCount(0);
  const tv = section.locator("[data-tv]");
  await expect(tv.locator("[data-lyric]")).toHaveAttribute("lang", "vi");
  const title = tv.locator("> div").nth(1).locator("> div").nth(1);
  await expect(title).toHaveAttribute("lang", "vi");
  const queueSongs = tv.locator("ul li > span:first-child");
  expect(await queueSongs.count()).toBeGreaterThan(0);
  await expect(queueSongs.and(page.locator(':not([lang="vi"])'))).toHaveCount(0);
  const feature4 = page.locator("section#tinhnang ul li > span:first-child");
  expect(await feature4.count()).toBeGreaterThan(0);
  await expect(feature4.and(page.locator(':not([lang="vi"])'))).toHaveCount(0);
});
