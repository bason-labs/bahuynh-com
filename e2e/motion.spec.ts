import type { Page } from "@playwright/test";
import { expectGl, readPose, SMALL_DESKTOP, throttleFrames, withoutWebGl } from "./mic";
import { expect, gotoPage, test, VIEWPORTS } from "./support";

const names = { vi: "Dừng chuyển động", en: "Pause motion" } as const;
const grain = (page: Page) =>
  page.evaluate(() => document.querySelector(".grain")!.getAnimations().map((a) => a.playState));
const motion = (page: Page) => page.locator("html").getAttribute("data-motion");

for (const lang of ["vi", "en"] as const) {
  const name = names[lang];
  const toggle = (page: Page) => page.getByRole("navigation").getByRole("button", { name, exact: true });

  test.describe(`motion toggle on ${lang}`, () => {
    for (const key of ["mobile", "tablet", "desktop", "narrow"] as const) {
      test(`visible, unpressed and fits at ${key}`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS[key]);
        await gotoPage(page, lang);
        const button = toggle(page);
        await expect(button).toBeInViewport();
        await expect(button).toHaveAttribute("aria-pressed", "false");
        await button.focus();
        await expect(button).toBeFocused();
        const box = (await button.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(24);
        expect(box.height).toBeGreaterThanOrEqual(24);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        const nav = await page.getByRole("navigation").evaluate((el) => el.scrollWidth - el.clientWidth);
        expect(nav).toBeLessThanOrEqual(0);
      });
    }

    test("sits after the language switch and before the bar button", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const order = await page.getByRole("navigation").evaluate((nav) =>
        [...nav.querySelectorAll("a[href], button")].map((el) => el.getAttribute("href") ?? el.getAttribute("aria-label")),
      );
      const lastLang = order.indexOf(name) - 1;
      expect(lastLang).toBeGreaterThan(0);
      expect(order[order.indexOf(name) + 1]).toBe("https://kara.bahuynh.com");
    });

    test("pressing stops motion, pressing again restores it", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const button = toggle(page);
      await expect.poll(() => grain(page)).toEqual(["running"]);
      await expect(page.locator("html")).toHaveCSS("scroll-behavior", "smooth");
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
      await expect.poll(() => grain(page)).toEqual([]);
      await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
      await page.evaluate(() => {
        document.body.style.minHeight = "6000px";
      });
      await page.getByRole("navigation").getByRole("link", { name: "BS KARA" }).click();
      await page.evaluate(() => window.scrollTo(0, 3000));
      await page.getByRole("navigation").getByRole("link", { name: "BS KARA" }).click();
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "false");
      await expect(page.locator("html")).toHaveAttribute("data-motion", "run");
      await expect.poll(() => grain(page)).toEqual(["running"]);
      await expect(page.locator("html")).toHaveCSS("scroll-behavior", "smooth");
    });

    test("the choice survives a reload and the language link, not a new context", async ({ page, browser }) => {
      await gotoPage(page, lang);
      await toggle(page).click();
      await page.reload();
      await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
      await expect.poll(() => grain(page)).toEqual([]);
      await page.getByRole("group").getByRole("link").click();
      await page.waitForURL(lang === "vi" ? /\/en\/$/ : /\/$/);
      const other = names[lang === "vi" ? "en" : "vi"];
      await expect(page.getByRole("navigation").getByRole("button", { name: other, exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      const fresh = await browser.newContext();
      const page2 = await fresh.newPage();
      await gotoPage(page2, lang);
      await expect(toggle(page2)).toHaveAttribute("aria-pressed", "false");
      await fresh.close();
    });

    test("storage is sessionStorage only", async ({ page }) => {
      await gotoPage(page, lang);
      await toggle(page).click();
      expect(await page.evaluate(() => sessionStorage.getItem("bahuynh.motion"))).toBe("reduce");
      await toggle(page).click();
      expect(await page.evaluate(() => sessionStorage.getItem("bahuynh.motion"))).toBe("run");
      expect(await page.evaluate(() => [document.cookie, localStorage.length, sessionStorage.length])).toEqual([
        "",
        0,
        1,
      ]);
    });
  });
}

test.describe("system asks for reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  for (const lang of ["vi", "en"] as const) {
    test(`${lang} loads pressed with no animation, unpressing runs motion`, async ({ page }) => {
      await gotoPage(page, lang);
      const button = page.getByRole("navigation").getByRole("button", { name: names[lang], exact: true });
      await expect(button).toHaveAttribute("aria-pressed", "true");
      expect(await motion(page)).toBe("reduce");
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "false");
      await expect.poll(() => grain(page)).toEqual(["running"]);
      await expect(page.locator("html")).toHaveCSS("scroll-behavior", "smooth");
    });
  }
});

const marqueeState = (page: Page) =>
  page.evaluate(() => {
    const row = document.querySelector("[data-marquee]")!.firstElementChild!;
    return { running: row.getAnimations().length, x: row.firstElementChild!.getBoundingClientRect().x };
  });

async function expectMarqueeStill(page: Page) {
  const before = await marqueeState(page);
  expect(before.running).toBe(0);
  await page.waitForTimeout(2000);
  expect((await marqueeState(page)).x).toBe(before.x);
}

test.describe("marquee under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  for (const lang of ["vi", "en"] as const) {
    test(`${lang} marquee stays still`, async ({ page }) => {
      await gotoPage(page, lang);
      await expectMarqueeStill(page);
    });
  }
});

for (const lang of ["vi", "en"] as const) {
  test(`${lang} marquee moves, then stops with the pause toggle`, async ({ page }) => {
    await gotoPage(page, lang);
    await expect.poll(async () => (await marqueeState(page)).running).toBe(1);
    await page.getByRole("navigation").getByRole("button", { name: names[lang], exact: true }).click();
    await expectMarqueeStill(page);
  });
}

const tapHero = (page: Page) => page.mouse.click(720, 300);

async function expectStillLive(page: Page) {
  await page.setViewportSize(VIEWPORTS.desktop);
  const hero = page.locator("header#top");
  await tapHero(page);
  await expect(hero).toHaveAttribute("data-live", "true");
  const onair = hero.locator("div").filter({ hasText: /^On air$/ });
  await expect(onair).toHaveCSS("background-color", "rgb(255, 74, 43)");
  await expect(onair).toHaveCSS("transition-duration", "0s");
  await expect(hero.locator('div[aria-hidden="true"]').first()).toHaveCSS("transition-duration", "0s");
  await page.waitForTimeout(500);
  await expect(hero.locator("i")).toHaveCount(0);
  const sungCount = () =>
    hero.evaluate((h) => {
      const lyric = [...h.querySelectorAll('div[aria-hidden="true"]')].at(-1)!;
      const words = [...lyric.children].slice(1);
      return `${words.filter((w) => getComputedStyle(w).color === "rgb(243, 239, 232)").length}/${words.length}`;
    });
  expect(await sungCount()).toBe("13/13");
  await page.waitForTimeout(800);
  expect(await sungCount()).toBe("13/13");
}

test.describe("hero live state under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("no transition, no rings, the whole lyric sung and kept", async ({ page }) => {
    await withoutWebGl(page);
    await gotoPage(page, "vi");
    await expectStillLive(page);
  });
});

test("hero live state with the pause toggle pressed", async ({ page }) => {
  await withoutWebGl(page);
  await gotoPage(page, "en");
  await page.getByRole("navigation").getByRole("button", { name: names.en, exact: true }).click();
  await expectStillLive(page);
});

// The 2D frame counter and the live state are checked on the CSS mic, so WebGL is switched off here.
const countCrowdFrames = async (page: Page) => {
  await withoutWebGl(page);
  await page.addInitScript(() => {
    const w = window as unknown as { __crowdFrames: number };
    w.__crowdFrames = 0;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args: Parameters<typeof clear>) {
      if (this.canvas.closest("header#top")) w.__crowdFrames++; // the hero crowd only; section 03 has its own canvas
      return clear.apply(this, args);
    };
  });
};
const crowdFrames = (page: Page) => page.evaluate(() => (window as unknown as { __crowdFrames: number }).__crowdFrames);
const crowdImage = (page: Page) => page.locator("header#top canvas[data-heat]").evaluate((c: HTMLCanvasElement) => c.toDataURL());

async function expectStillCrowd(page: Page) {
  await page.setViewportSize(VIEWPORTS.desktop);
  await gotoPage(page, "vi");
  const canvas = page.locator("header#top canvas[data-heat]");
  await expect(canvas).toHaveAttribute("data-heat", "0.00");
  await page.waitForTimeout(300);
  const idle = await crowdImage(page);
  const frames = await crowdFrames(page);
  await page.waitForTimeout(2000);
  expect(await crowdFrames(page)).toBe(frames);
  expect(await crowdImage(page)).toBe(idle);
  await tapHero(page);
  await expect(canvas).toHaveAttribute("data-heat", "1.00");
  await page.waitForTimeout(300);
  const live = await crowdImage(page);
  expect(live).not.toBe(idle);
  const liveFrames = await crowdFrames(page);
  await page.waitForTimeout(2000);
  expect(await crowdFrames(page)).toBe(liveFrames);
  expect(await crowdImage(page)).toBe(live);
}

test.describe("hero crowd under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("draws a still frame per heat change and no continuous frames", async ({ page }) => {
    await countCrowdFrames(page);
    await expectStillCrowd(page);
  });
});

test("hero crowd animates, then stands still with the pause toggle pressed", async ({ page }) => {
  await countCrowdFrames(page);
  await gotoPage(page, "vi");
  const before = await crowdFrames(page);
  // running means frames keep coming; poll rather than count a rate, which a loaded machine can starve
  await expect.poll(() => crowdFrames(page), { timeout: 10_000 }).toBeGreaterThan(before + 5);
  await page.getByRole("navigation").getByRole("button", { name: names.vi, exact: true }).click();
  await expectStillCrowdPaused(page);
});

async function expectStillCrowdPaused(page: Page) {
  const canvas = page.locator("header#top canvas[data-heat]");
  await page.waitForTimeout(300);
  const idle = await crowdImage(page);
  const frames = await crowdFrames(page);
  await page.waitForTimeout(2000);
  expect(await crowdFrames(page)).toBe(frames);
  await tapHero(page);
  await expect(canvas).toHaveAttribute("data-heat", "1.00");
  await page.waitForTimeout(300);
  expect(await crowdImage(page)).not.toBe(idle);
}

test("hero crowd stops drawing while off screen or in a hidden tab, and resumes", async ({ page }) => {
  await countCrowdFrames(page);
  await page.setViewportSize(VIEWPORTS.desktop);
  await gotoPage(page, "vi");
  await page.evaluate(() => {
    document.body.style.minHeight = "6000px";
  });
  const idleFor = async () => {
    await page.waitForTimeout(300);
    const frames = await crowdFrames(page);
    await page.waitForTimeout(700);
    return (await crowdFrames(page)) - frames;
  };
  // running means frames keep coming: poll for them, since a loaded machine can starve rAF for a while
  const expectRunning = async () => {
    const frames = await crowdFrames(page);
    await expect.poll(() => crowdFrames(page), { timeout: 10_000 }).toBeGreaterThan(frames);
  };
  await expectRunning();
  await page.evaluate(() => window.scrollTo(0, 3000));
  expect(await idleFor()).toBe(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectRunning();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await idleFor()).toBe(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expectRunning();
});

async function expectReelLandsAtOnce(page: Page, lang: "vi" | "en") {
  await page.setViewportSize(VIEWPORTS.desktop);
  const section = page.locator("section#quay");
  const spin = section.getByRole("button", { name: lang === "vi" ? "Quay bài" : "Spin", exact: true });
  const list = page.locator("[data-reel] ul");
  await spin.scrollIntoViewIfNeeded();
  await expect(page.locator("[data-reel] li[data-hit]")).toHaveCount(1);
  for (let press = 0; press < 2; press++) {
    await spin.click();
    // no wait: the winner is in the highlighted row as soon as the press is handled
    expect(await page.locator("[data-reel] li[data-hit]").count()).toBe(1);
    await expect(list).toHaveCSS("transition-property", "none");
    await expect(list).toHaveCSS("transition-duration", "0s");
    await expect(spin).toHaveAttribute("aria-disabled", "false");
    const index = await page
      .locator("[data-reel] li")
      .evaluateAll((els) => els.findIndex((el) => el.hasAttribute("data-hit")));
    const shift = await list.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
    expect(shift).toBe(-(index - 1) * 110);
    expect(await page.evaluate(() => document.getAnimations().filter((a) => a instanceof CSSTransition).length)).toBe(0);
    // the TV colours the whole line at once and the new queue row does not slide
    const tv = page.locator("[data-tv]");
    const words = await tv.locator("[data-lyric]").evaluate((el) =>
      [...el.children].map((w) => getComputedStyle(w).color),
    );
    expect(words.length).toBeGreaterThan(0);
    expect(new Set(words)).toEqual(new Set(["rgb(243, 239, 232)"]));
    const row = tv.getByRole("listitem").first();
    await expect(row).toHaveCSS("animation-name", "none");
    await expect(row).toHaveCSS("color", "rgb(243, 239, 232)");
    expect(await row.evaluate((el) => el.getAnimations().length)).toBe(0);
    await expect(tv.getByRole("listitem")).toHaveCount(Math.min(2 + press + 1, 3));
  }
}

test.describe("spin reel under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("vi: the winner shows at once, with no scrolling", async ({ page }) => {
    await gotoPage(page, "vi");
    await expectReelLandsAtOnce(page, "vi");
  });
});

test("spin reel with the pause toggle pressed shows the winner at once", async ({ page }) => {
  await gotoPage(page, "en");
  await page.getByRole("navigation").getByRole("button", { name: names.en, exact: true }).click();
  await expectReelLandsAtOnce(page, "en");
});

const sceneCopy = {
  vi: { tap: "Chạm để thả cảm xúc", words: ["Vỗ tay!", "Hay quá!", "Encore!", "Cháy!"] },
  en: { tap: "Tap to send a reaction", words: ["Clap!", "So good!", "Encore!", "Fire!"] },
} as const;

/** Reduced motion by the system setting, then by the pause toggle. */
for (const how of ["system setting", "pause toggle"] as const) {
  for (const lang of ["vi", "en"] as const) {
    test.describe(`a reaction under reduced motion (${how}) on ${lang}`, () => {
      test.use({ reducedMotion: how === "system setting" ? "reduce" : "no-preference" });

      test("raises the counter, shows the word still at its point for 2.3 s and draws the burst there", async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.desktop);
        await page.clock.install();
        await gotoPage(page, lang);
        if (how === "pause toggle") {
          await page.getByRole("navigation").getByRole("button", { name: names[lang], exact: true }).click();
        }
        await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
        const scene = page.locator("section#cungnhau [data-scene]");
        await scene.scrollIntoViewIfNeeded();
        await page.clock.pauseAt(new Date(Date.now() + 60_000));
        const canvas = scene.locator("canvas");
        const pixel = () =>
          canvas.evaluate((c: HTMLCanvasElement) => [...c.getContext("2d")!.getImageData(300, 200, 1, 1).data]);
        const calm = await pixel();
        await scene
          .getByRole("button", { name: sceneCopy[lang].tap, exact: true })
          .click({ position: { x: 300, y: 200 } });
        const count = scene.locator("[data-count]");
        const total = Number(((await count.textContent()) ?? "").replace(/[.,]/g, ""));
        expect(total).toBeGreaterThan(1248);
        const word = scene.locator("[data-word]");
        await expect(word).toHaveCount(1);
        await expect(word).toHaveCSS("animation-name", "none");
        await expect(word).toHaveCSS("opacity", "1");
        expect(await word.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42)).toBe(0);
        const at = await word.evaluate((el) => ({ x: parseFloat(el.style.left), y: parseFloat(el.style.top) }));
        expect(Math.abs(at.x - 300)).toBeLessThan(1);
        expect(Math.abs(at.y - 200)).toBeLessThan(1);
        await expect(canvas).toHaveAttribute("data-sparks", "26");
        expect(await pixel()).not.toEqual(calm);
        await page.clock.runFor(2299);
        await expect(word).toHaveCount(1);
        await page.clock.runFor(2);
        await expect(word).toHaveCount(0);
        await expect(canvas).toHaveAttribute("data-sparks", "0");
        expect(await pixel()).toEqual(calm);
      });
    });
  }
}

const countSceneFrames = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __sceneFrames: number };
    w.__sceneFrames = 0;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args: Parameters<typeof clear>) {
      if (this.canvas.closest("section#cungnhau")) w.__sceneFrames++;
      return clear.apply(this, args);
    };
  });
const sceneFrames = (page: Page) => page.evaluate(() => (window as unknown as { __sceneFrames: number }).__sceneFrames);

/** Heat rises and falls with no continuous frames at a constant heat; fake time keeps it independent of the machine. */
async function expectStillHeat(page: Page, pause: boolean) {
  await page.setViewportSize(VIEWPORTS.desktop);
  await page.clock.install();
  await gotoPage(page, "vi");
  if (pause) await page.getByRole("navigation").getByRole("button", { name: names.vi, exact: true }).click();
  const scene = page.locator("section#cungnhau [data-scene]");
  await scene.scrollIntoViewIfNeeded();
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
  await page.evaluate(() => document.querySelectorAll("header canvas").forEach((c) => ((c as HTMLElement).style.display = "none")));
  const image = () => scene.locator("canvas").evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.clock.runFor(100);
  await expect(scene).toHaveAttribute("data-heat", "0.00");
  const calm = await image();
  const calmFrames = await sceneFrames(page);
  await page.clock.runFor(300);
  expect(await sceneFrames(page)).toBe(calmFrames);
  for (let i = 0; i < 4; i++) await scene.getByRole("button", { name: "Vỗ tay", exact: true }).click();
  await expect(scene).toHaveAttribute("data-heat", "1.00");
  expect(await sceneFrames(page)).toBeGreaterThan(calmFrames);
  expect(await image()).not.toBe(calm);
  // The heat falls by elapsed time, so a jump is enough; the frame count is checked over short runs.
  await page.clock.fastForward(2100);
  expect(Math.abs(Number(await scene.getAttribute("data-heat")) - 0.5)).toBeLessThanOrEqual(0.05);
  await page.clock.fastForward(2300);
  await page.clock.runFor(100);
  await expect(scene).toHaveAttribute("data-heat", "0.00");
  expect(await image()).toBe(calm);
  const cooled = await sceneFrames(page);
  await page.clock.runFor(300);
  expect(await sceneFrames(page)).toBe(cooled);
}

test.describe("together crowd heat under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("heat rises and falls, and no frames are drawn at a constant heat", async ({ page }) => {
    await countSceneFrames(page);
    await expectStillHeat(page, false);
  });
});

test("together crowd heat with the pause toggle pressed rises and falls without continuous frames", async ({ page }) => {
  await countSceneFrames(page);
  await expectStillHeat(page, true);
});

/** The feature 05 bars stand still under reduced motion, by the system setting and by the pause toggle. */
for (const how of ["system setting", "pause toggle"] as const) {
  test.describe(`feature bars under reduced motion (${how})`, () => {
    test.use({ reducedMotion: how === "system setting" ? "reduce" : "no-preference" });

    for (const lang of ["vi", "en"] as const) {
      test(`${lang}: the 28 bars have no running animation`, async ({ page }) => {
        await gotoPage(page, lang);
        const bars = page.locator("section#tinhnang [data-bars] i");
        await expect(bars).toHaveCount(28);
        if (how === "pause toggle") {
          expect(await bars.first().evaluate((el) => el.getAnimations().length)).toBe(1);
          await page.getByRole("navigation").getByRole("button", { name: names[lang], exact: true }).click();
        }
        await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
        await expect(bars.first()).toHaveCSS("animation-name", "none");
        expect(await bars.evaluateAll((els) => els.reduce((n, el) => n + el.getAnimations().length, 0))).toBe(0);
      });
    }
  });
}

const chapterBlocks = (page: Page) => page.locator(":is(#xem, #quay, #cungnhau, #tinhnang, #batdau) > .wrap > *");

async function expectBlocksShown(page: Page) {
  const blocks = chapterBlocks(page);
  await expect(blocks).toHaveCount(10);
  for (const block of await blocks.all()) {
    await expect(block).not.toHaveAttribute("data-reveal", /.*/);
    await expect(block).toHaveCSS("opacity", "1");
    await expect(block).toHaveCSS("transform", "none");
  }
}

test.describe("chapter reveal under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("every block is visible at once with no offset", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, "vi");
    await expectBlocksShown(page);
  });
});

test("pressing the pause toggle shows every pending block at once", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop);
  await gotoPage(page, "en");
  await expect(page.locator("section#quay > .wrap > *").first()).toHaveAttribute("data-reveal", "pending");
  await page.getByRole("navigation").getByRole("button", { name: names.en, exact: true }).click();
  await expectBlocksShown(page);
});

const framesStill = async (page: Page) => {
  await expectGl(page, "3d");
  const canvas = page.locator("header#top canvas:not([data-heat])");
  await expect(canvas).toHaveAttribute("data-running", "false");
  const before = await readPose(page);
  expect(before.dustCount).toBe(0);
  await page.waitForTimeout(10_000);
  expect(await readPose(page)).toEqual(before);
};

test.describe("3D mic under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("turns, bobs and draws no dust over 10 s", async ({ page }) => {
    test.setTimeout(30_000);
    await page.setViewportSize(SMALL_DESKTOP);
    await gotoPage(page, "vi");
    await framesStill(page);
  });
});

test("3D mic stands still with the pause toggle pressed, and moves again unpressed", async ({ page }) => {
  await throttleFrames(page);
  test.setTimeout(30_000);
  await page.setViewportSize(SMALL_DESKTOP);
  await gotoPage(page, "en");
  await expectGl(page, "3d");
  const toggle = page.getByRole("navigation").getByRole("button", { name: names.en, exact: true });
  await expect.poll(async () => (await readPose(page)).dustCount).toBe(500);
  await toggle.click();
  await framesStill(page);
  await toggle.click();
  await expect.poll(async () => (await readPose(page)).dustCount).toBe(500);
  const turned = (await readPose(page)).idleYaw;
  await expect.poll(async () => (await readPose(page)).idleYaw).toBeGreaterThan(turned);
});

for (const how of ["system setting", "pause toggle"] as const) {
  test.describe(`3D mic pointer, scroll and drag under reduced motion (${how})`, () => {
    test.use({ reducedMotion: how === "system setting" ? "reduce" : "no-preference" });
    test("ignores the pointer and the scroll, the grain stands still, but a drag still spins it and live still glows", async ({ page }) => {
      await throttleFrames(page);
      test.setTimeout(30_000);
      await page.setViewportSize({ width: 800, height: 700 });
      await gotoPage(page, "en");
      await expectGl(page, "3d");
      if (how === "pause toggle") await page.getByRole("navigation").getByRole("button", { name: names.en, exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
      expect(await grain(page)).toEqual([]);
      await expect.poll(async () => (await readPose(page)).dustCount).toBe(0);
      const start = await readPose(page);
      const box = (await page.locator("header#top").boundingBox())!;
      const head = { x: start.rect.x + start.rect.width / 2, y: start.rect.y + start.rect.height / 2 };
      const settle = () => page.evaluate(() => new Promise((done) => setTimeout(done, 400)));
      await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2);
      await page.mouse.move(box.x + 1, box.y + 100);
      await settle();
      const pointed = await readPose(page);
      expect([pointed.followYaw, pointed.followPitch]).toEqual([0, 0]);
      expect(pointed.yaw).toBe(start.yaw);
      await page.mouse.move(head.x, head.y);
      await page.mouse.down();
      await page.mouse.move(head.x + 100, head.y);
      await page.mouse.up();
      await expect.poll(async () => (await readPose(page)).dragYaw).toBeCloseTo(1, 1);
      await expect.poll(async () => (await readPose(page)).yaw - start.yaw).toBeCloseTo(1, 1);
      await page.evaluate(() => {
        document.body.style.minHeight = "4000px";
        window.scrollTo({ top: 900, behavior: "instant" });
      });
      await settle();
      const scrolled = await readPose(page);
      expect([scrolled.scrollYaw, scrolled.scrollPitch, scrolled.scrollLift]).toEqual([0, 0, 0]);
      expect(scrolled.height).toBe(start.height);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.mouse.click(head.x, head.y);
      await expect(page.locator("header#top")).toHaveAttribute("data-live", "true");
      await expect.poll(async () => (await readPose(page)).glow).toBe(1);
    });
  });
}

/** Walks the page top to bottom in viewport steps, giving the observers a frame at each stop. */
async function scrollThrough(page: Page, each?: () => Promise<void>) {
  const { height, view } = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, view: innerHeight }));
  for (let y = 0; y < height; y += view * 0.8) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => done(null))));
    await each?.();
  }
}

const noAnimations = (page: Page) => page.evaluate(() => document.getAnimations().map((a) => a.playState));

/** The page-wide rules of REQ-LAND-040 under the system setting and under the pause toggle, on both languages. */
for (const how of ["system setting", "pause toggle"] as const) {
  for (const lang of ["vi", "en"] as const) {
    test.describe(`whole page under reduced motion (${how}) on ${lang}`, () => {
      test.use({ reducedMotion: how === "system setting" ? "reduce" : "no-preference" });

      const open = async (page: Page) => {
        await throttleFrames(page);
        await page.setViewportSize(VIEWPORTS.desktop);
        await gotoPage(page, lang);
        if (how === "pause toggle") {
          await page.getByRole("navigation").getByRole("button", { name: names[lang], exact: true }).click();
        }
        await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
      };

      test("no animation is running after load or anywhere on the way down", async ({ page }) => {
        await open(page);
        expect(await noAnimations(page)).toEqual([]);
        await scrollThrough(page, async () => expect(await noAnimations(page)).toEqual([]));
      });

      test("scrolling through leaves the marquee, bars and crowds still and every reveal block shown", async ({ page }) => {
        await countCrowdFrames(page);
        await open(page);
        const marquee = await marqueeState(page);
        expect(marquee.running).toBe(0);
        const bars = page.locator("section#tinhnang [data-bars] i");
        const crowd = await crowdImage(page);
        await page.waitForTimeout(300);
        const heroFrames = await crowdFrames(page);
        await scrollThrough(page);
        await expectBlocksShown(page);
        expect(await bars.evaluateAll((els) => els.reduce((n, el) => n + el.getAnimations().length, 0))).toBe(0);
        const together = page.locator("section#cungnhau [data-scene]");
        await together.scrollIntoViewIfNeeded();
        await expect(together).toHaveAttribute("data-heat", "0.00");
        const sceneImage = () => together.locator("canvas").evaluate((c: HTMLCanvasElement) => c.toDataURL());
        const still = await sceneImage();
        await page.waitForTimeout(1000);
        expect(await sceneImage()).toBe(still);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.waitForTimeout(300);
        expect(await crowdImage(page)).toBe(crowd);
        expect(await crowdFrames(page)).toBeLessThanOrEqual(heroFrames + 2);
        expect((await marqueeState(page)).x).toBe(marquee.x);
      });

      test("the nav and the anchor links jump at once", async ({ page }) => {
        await open(page);
        await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
        for (const id of ["quay", "tinhnang", "xem"]) {
          await page.getByRole("navigation").locator(`a[data-nav-link="${id}"]`).click();
          // read at once: a smooth scroll would still be near the top
          const top = await page.evaluate((target) => document.getElementById(target)!.getBoundingClientRect().top, id);
          expect(Math.abs(top - 64)).toBeLessThanOrEqual(1);
        }
        await page.getByRole("navigation").getByRole("link", { name: "BS KARA" }).click();
        expect(await page.evaluate(() => scrollY)).toBe(0);
      });
    });
  }
}

/** Reduced motion by the system setting: the film swaps its shot with no cross-fade while time and progress advance. */
test.describe("film under the system reduced motion setting", () => {
  test.use({ reducedMotion: "reduce" });
  for (const lang of ["vi", "en"] as const) {
    test(`${lang}: the shot swap is instant, the timecode and progress advance`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.clock.install();
      await gotoPage(page, lang);
      await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1_000);
      const frame = page.locator("[data-film]");
      await frame.getByRole("button", { name: lang === "vi" ? "Phát video" : "Play video", exact: true }).click();
      await page.clock.runFor(6_100);
      await expect(page.locator("[data-timecode]")).toHaveText("0:00:06");
      const shown = frame.locator('[data-on="true"]');
      await expect(shown).toHaveCount(1);
      await expect(shown).toHaveCSS("transition-duration", "0s");
      await expect(shown).toHaveCSS("opacity", "1");
      expect(await page.evaluate(() => document.getAnimations().filter((a) => a instanceof CSSTransition).length)).toBe(0);
      const track = (await page.locator("[data-progress]").boundingBox())!;
      const filled = (await page.locator("[data-progress] i").boundingBox())!;
      expect(filled.width / track.width).toBeGreaterThan(0.15);
    });
  }
});

/** Pressing the toggle again resumes every effect it stopped. */
for (const lang of ["vi", "en"] as const) {
  test(`${lang}: unpressing the toggle resumes the marquee, grain and bars`, async ({ page }) => {
    await withoutWebGl(page); // software WebGL starves the polls under load; the mic is not under test here
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    const button = page.getByRole("navigation").getByRole("button", { name: names[lang], exact: true });
    const bars = page.locator("section#tinhnang [data-bars] i");
    await expect.poll(() => grain(page)).toEqual(["running"]); // hydrated and running before the first press
    await button.click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    expect(await noAnimations(page)).toEqual([]);
    await button.click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "run");
    await expect.poll(() => grain(page)).toEqual(["running"]);
    await expect.poll(async () => (await marqueeState(page)).running).toBe(1);
    await expect.poll(() => bars.first().evaluate((el) => el.getAnimations().length)).toBe(1);
  });
}
