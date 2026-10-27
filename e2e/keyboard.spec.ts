import type { Page } from "@playwright/test";
import { expect, gotoPage, skipTransitions, test, VIEWPORTS } from "./support";

const names = {
  vi: "Micro 3D. Kéo để xoay, chạm để bật.",
  en: "3D microphone. Drag to turn, tap to switch it on.",
} as const;

for (const lang of ["vi", "en"] as const) {
  test(`${lang}: Enter turns the hero live, Space turns it idle, the page does not scroll`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    const hero = page.locator("header#top");
    const mic = hero.getByRole("button", { name: names[lang], exact: true });
    await mic.focus();
    await expect(mic).toBeFocused();
    const before = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("Enter");
    await expect(hero).toHaveAttribute("data-live", "true");
    await expect(mic).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Space");
    await expect(hero).toHaveAttribute("data-live", "false");
    await expect(mic).toHaveAttribute("aria-pressed", "false");
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });
}

const reaction = {
  vi: { tap: "Chạm để thả cảm xúc", words: ["Vỗ tay!", "Hay quá!", "Encore!", "Cháy!"] },
  en: { tap: "Tap to send a reaction", words: ["Clap!", "So good!", "Encore!", "Fire!"] },
} as const;

for (const lang of ["vi", "en"] as const) {
  test(`${lang}: Enter and Space on the scene's reaction control each react once, the page does not scroll`, async ({
    page,
  }) => {
    // words are removed by a 2.3 s timer: hold the clock so a slow machine cannot expire one mid-check
    await page.clock.install();
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 500); // page time: it may be ahead after a slow load
    const scene = page.locator("section#cungnhau [data-scene]");
    const tap = scene.getByRole("button", { name: reaction[lang].tap, exact: true });
    const count = scene.locator("[data-count]");
    const words = scene.locator("[data-word]");
    const read = async () => Number(((await count.textContent()) ?? "").replace(/[.,]/g, ""));
    await tap.focus();
    await expect(tap).toBeFocused();
    const before = await page.evaluate(() => window.scrollY);
    let total = await read();
    expect(total).toBe(1248);
    for (const [i, key] of (["Enter", "Space"] as const).entries()) {
      await page.keyboard.press(key);
      await expect(words).toHaveCount(i + 1);
      const delta = (await read()) - total;
      expect([1, 2, 3]).toContain(delta);
      total += delta;
      const word = words.nth(i);
      expect(reaction[lang].words as readonly string[]).toContain(await word.textContent());
      const at = await word.evaluate((el) => ({
        x: parseFloat(el.style.left) / el.parentElement!.clientWidth,
        y: parseFloat(el.style.top) / el.parentElement!.clientHeight,
      }));
      expect(at.x).toBeGreaterThanOrEqual(0.2);
      expect(at.x).toBeLessThanOrEqual(0.8);
      expect(at.y).toBeGreaterThanOrEqual(0.35);
      expect(at.y).toBeLessThanOrEqual(0.65);
      expect(await page.evaluate(() => window.scrollY)).toBe(before);
    }
  });
}

// ---- Page-wide keyboard order, focus ring, hidden elements and traps (REQ-LAND-042) ----

const STOPS = {
  vi: [
    "BS KARA", "Trang chủ", "Video", "Quay bài", "Cùng nhau", "Tính năng", "Tiếng Việt", "English",
    "Dừng chuyển động", "Mở phòng hát", names.vi, "Mở phòng hát", "▶ Xem 36 giây",
    "Trình phát video. Phím mũi tên trái, phải để chuyển chương.", "Phát video", "Phát",
    "0:00 Bật TV", "0:06 Quét mã", "0:12 Chọn bài", "0:18 MC dẫn", "0:24 Cả phòng hát", "0:30 Điểm số",
    "Quay bài", "Chạm để thả cảm xúc", "Vỗ tay", "Hay quá", "Encore", "Cháy",
    "Mở phòng hát", "Xem lại video", "Quyền riêng tư",
  ],
  en: [
    "BS KARA", "Home", "Film", "Spin", "Together", "Features", "Tiếng Việt", "English",
    "Pause motion", "Open a room", names.en, "Open a room", "▶ Watch 36 sec",
    "Video player. Left and right arrow keys change chapter.", "Play video", "Play",
    "0:00 TV on", "0:06 Scan", "0:12 Pick songs", "0:18 The host", "0:24 Everyone sings", "0:30 Score",
    "Spin", "Tap to send a reaction", "Clap", "So good", "Encore", "Fire",
    "Open a room", "Watch again", "Privacy",
  ],
} as const;

// The mic control and the crowd reaction control cover their whole box, so their ring sits inside it (Q-0001-53).
const INSET = new Set<string>([names.vi, names.en, "Chạm để thả cảm xúc", "Tap to send a reaction"]);

type Stop = {
  name: string;
  hidden: boolean;
  navLink: boolean;
  inRail: boolean;
  outline: [string, string, string, string];
};

/** The focused element: its accessible name (aria-hidden text left out), whether it is hidden, and its ring. */
const readFocus = (page: Page) =>
  page.evaluate((): Stop => {
    const el = document.activeElement as HTMLElement;
    const parts: string[] = [];
    const walk = (node: Node) => {
      if (node.nodeType === 3) parts.push(node.textContent ?? "");
      else if (node instanceof HTMLElement && node.getAttribute("aria-hidden") !== "true") node.childNodes.forEach(walk);
    };
    const label = el.getAttribute("aria-label");
    if (!label) walk(el);
    const cs = getComputedStyle(el);
    return {
      name: label ?? parts.join(" ").replace(/\s+/g, " ").trim(),
      hidden: el.closest('[inert], [aria-hidden="true"]') !== null,
      navLink: el.matches("[data-nav-link]"),
      inRail: el.closest("[data-scroll-rail]") !== null,
      outline: [cs.outlineWidth, cs.outlineStyle, cs.outlineColor, cs.outlineOffset],
    };
  });

/** Presses Tab (or Shift+Tab) `count` times from where focus is and returns each stop. */
async function walk(page: Page, key: "Tab" | "Shift+Tab", count: number): Promise<Stop[]> {
  const stops: Stop[] = [];
  for (let i = 0; i < count; i++) {
    await page.keyboard.press(key);
    stops.push(await readFocus(page));
  }
  return stops;
}

const focusedId = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement & { __stop?: number };
    el.__stop ??= Math.random();
    return el === document.body ? 0 : el.__stop;
  });

for (const lang of ["vi", "en"] as const) {
  test(`${lang}: Tab visits every stop in reading order, each ring is 2 px solid #ff4a2b, and Shift+Tab mirrors it`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    await skipTransitions(page); // the large play button animates its outline (transition: all)
    const expected = STOPS[lang];
    const forward = await walk(page, "Tab", expected.length);
    expect(forward.map((s) => s.name)).toEqual(expected);
    for (const s of forward) {
      const offset = INSET.has(s.name) ? "-6px" : "3px";
      expect(s.outline, s.name).toEqual(["2px", "solid", "rgb(255, 74, 43)", offset]);
      expect(s.hidden, s.name).toBe(false);
    }
    // after the last stop focus leaves the page's controls
    await page.keyboard.press("Tab");
    expect((await readFocus(page)).name).not.toBe(expected.at(-1));
    await page.keyboard.press("Shift+Tab");
    const back = [forward.at(-1)!, ...(await walk(page, "Shift+Tab", expected.length - 1))];
    expect(back.map((s) => s.name)).toEqual([...expected].reverse());
  });

  test(`${lang}: Tab and Shift+Tab leave every stop, including the mic control and the film frame`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    const ids: number[] = [];
    for (let i = 0; i < STOPS[lang].length; i++) {
      await page.keyboard.press("Tab");
      ids.push(await focusedId(page));
    }
    expect(new Set(ids).size, "each Tab lands on a new element").toBe(STOPS[lang].length);
    const hero = page.locator("header#top");
    const targets = [
      hero.getByRole("button", { name: names[lang], exact: true }),
      page.locator("[data-film]"),
      page.locator("section#cungnhau [data-scene]").getByRole("button", { name: reaction[lang].tap, exact: true }),
    ];
    for (const target of targets) {
      for (const key of ["Tab", "Shift+Tab"]) {
        await target.focus();
        await expect(target).toBeFocused();
        await page.keyboard.press(key);
        await expect(target).not.toBeFocused();
        expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
      }
    }
  });

  test(`${lang}: Shift+Tab to "${lang === "vi" ? "Quay bài" : "Spin"}" from chapter 03 leaves it below the 56 px bar`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    await page.locator("section#cungnhau").evaluate((el) => el.scrollIntoView({ behavior: "instant", block: "start" }));
    const spin = page.locator("section#quay").getByRole("button", { name: lang === "vi" ? "Quay bài" : "Spin", exact: true });
    const scene = page.locator("section#cungnhau [data-scene]");
    await scene.getByRole("button", { name: reaction[lang].tap, exact: true }).focus();
    // the button is above the viewport now
    expect((await spin.boundingBox())!.y + (await spin.boundingBox())!.height).toBeLessThanOrEqual(0);
    for (let i = 0; i < 5 && !(await spin.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press("Shift+Tab");
    }
    await expect(spin).toBeFocused();
    // the page scrolls smoothly to the focused button: wait for it to stop
    await page.evaluate(
      () =>
        new Promise<void>((done) => {
          let last = -1;
          let still = 0;
          const frame = () => {
            still = window.scrollY === last ? still + 1 : 0;
            last = window.scrollY;
            if (still >= 5) done();
            else requestAnimationFrame(frame);
          };
          frame();
        }),
    );
    const box = (await spin.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(56 + 5);
    expect(box.y + box.height).toBeLessThanOrEqual(900);
  });
}

for (const [label, size, state] of [
  ["1440x900 on the poster", VIEWPORTS.desktop, "poster"],
  ["1440x900 with the film playing", VIEWPORTS.desktop, "playing"],
  ["768x1024 on the poster", VIEWPORTS.tablet, "poster"],
  ["768x1024 with the film playing", VIEWPORTS.tablet, "playing"],
] as const) {
  for (const lang of ["vi", "en"] as const) {
    test(`${lang}: hidden elements are never focused at ${label}`, async ({ page }) => {
      await page.clock.install();
      await page.setViewportSize(size);
      await gotoPage(page, lang);
      const film = page.locator("[data-film]");
      if (state === "playing") {
        await film.getByRole("button", { name: lang === "vi" ? "Phát video" : "Play video", exact: true }).click();
        await expect(film).toHaveAttribute("data-running", "true");
      }
      // hold the film clock: a slow machine must not swap shots or end the film while the page is tabbed
      await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 5_000);
      const tablet = size.width === VIEWPORTS.tablet.width;
      const visible = await page.evaluate(
        () => [...document.querySelectorAll("[data-nav-link]")].filter((a) => (a as HTMLElement).offsetParent !== null).length,
      );
      expect(visible, "nav links shown").toBe(tablet ? 0 : 5);
      const stops = await walk(page, "Tab", 40);
      const named = stops.map((s) => s.name);
      for (const s of stops) {
        expect(s.hidden, s.name).toBe(false);
        expect(s.inRail, s.name).toBe(false);
        if (tablet) expect(s.navLink, s.name).toBe(false);
      }
      const playBig = lang === "vi" ? "Phát video" : "Play video";
      expect(named.includes(playBig), "large play button in the tab order").toBe(state === "poster");
    });
  }
}
