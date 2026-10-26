import type { Page } from "@playwright/test";
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
    await gotoPage(page, "vi");
    await expectStillLive(page);
  });
});

test("hero live state with the pause toggle pressed", async ({ page }) => {
  await gotoPage(page, "en");
  await page.getByRole("navigation").getByRole("button", { name: names.en, exact: true }).click();
  await expectStillLive(page);
});

const countCrowdFrames = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __crowdFrames: number };
    w.__crowdFrames = 0;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args: Parameters<typeof clear>) {
      w.__crowdFrames++;
      return clear.apply(this, args);
    };
  });
const crowdFrames = (page: Page) => page.evaluate(() => (window as unknown as { __crowdFrames: number }).__crowdFrames);
const crowdImage = (page: Page) => page.locator("header#top canvas").evaluate((c: HTMLCanvasElement) => c.toDataURL());

async function expectStillCrowd(page: Page) {
  await page.setViewportSize(VIEWPORTS.desktop);
  await gotoPage(page, "vi");
  const canvas = page.locator("header#top canvas");
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
  await page.waitForTimeout(500);
  expect(await crowdFrames(page)).toBeGreaterThan(before + 5);
  await page.getByRole("navigation").getByRole("button", { name: names.vi, exact: true }).click();
  await expectStillCrowdPaused(page);
});

async function expectStillCrowdPaused(page: Page) {
  const canvas = page.locator("header#top canvas");
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
  // running vs stopped is "some frames" vs "none": a loaded CI machine can drop rAF to a few fps
  expect(await idleFor()).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 3000));
  expect(await idleFor()).toBe(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await idleFor()).toBeGreaterThan(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await idleFor()).toBe(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await idleFor()).toBeGreaterThan(0);
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
    const words = await tv.locator('div[aria-hidden="true"]').evaluate((el) =>
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
