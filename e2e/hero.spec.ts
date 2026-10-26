import { expect, gotoPage, test, VIEWPORTS } from "./support";

const copy = {
  vi: {
    h1: "Karaoke cho cả nhóm.",
    accent: "cả nhóm.",
    lede: "TV là sân khấu, điện thoại là micro và điều khiển, MC AI dẫn từng bài. Mở phòng trong mười giây, không cần cài đặt.",
    open: "Mở phòng hát",
    film: "▶ Xem 36 giây",
    meta: ["Web · TV · Máy chiếu", "Miễn phí để bắt đầu"],
    hint: "Kéo để xoay · chạm để bật micro",
    label: "On air",
  },
  en: {
    h1: "Karaoke for the whole group.",
    accent: "the whole group.",
    lede: "The TV is the stage, phones are the mic and the remote, and an AI host introduces every song. A room is open in ten seconds, nothing to install.",
    open: "Open a room",
    film: "▶ Watch 36 sec",
    meta: ["Web · TV · Projector", "Free to start"],
    hint: "Drag to turn · tap to switch the mic on",
    label: "On air",
  },
} as const;

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];

  test.describe(`hero on ${lang}`, () => {
    test("copy, links and idle state at 1440x900", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      await expect(hero).toHaveAttribute("data-live", "false");
      await expect(hero).toHaveAttribute("data-gl", "loading");
      const h1 = hero.getByRole("heading", { level: 1 });
      await expect(h1).toHaveText(c.h1);
      const em = h1.locator("em");
      await expect(em).toHaveText(c.accent);
      const emStyle = await em.evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.fontStyle, s.color, s.fontFamily];
      });
      expect(emStyle[0]).toBe("italic");
      expect(emStyle[1]).toBe("rgb(255, 233, 196)");
      expect(emStyle[2]).toMatch(/playfair/i);
      await expect(hero.getByText(c.lede, { exact: true })).toBeVisible();
      const open = hero.getByRole("link", { name: c.open, exact: true });
      await expect(open).toHaveAttribute("href", "https://kara.bahuynh.com");
      await expect(open).toHaveClass(/solid/);
      await expect(hero.getByRole("link", { name: c.film, exact: true })).toHaveAttribute("href", "#xem");
      for (const m of c.meta) {
        const el = hero.getByText(m, { exact: true });
        await expect(el).toBeVisible();
        await expect(el).toHaveCSS("color", "rgb(141, 139, 135)");
      }
      const hint = hero.getByText(c.hint, { exact: true });
      await expect(hint).toBeVisible();
      await expect(hint.locator("..")).toHaveCSS("opacity", "1");
      const label = hero.getByText(c.label, { exact: true });
      const box = label.locator("..");
      await expect(box).toHaveCSS("color", "rgb(141, 139, 135)");
      await expect(box).toHaveCSS("border-top-width", "1px");
      await expect(box).toHaveCSS("border-top-color", "rgba(255, 255, 255, 0.16)");
      const heroBox = (await hero.boundingBox())!;
      const lb = (await box.boundingBox())!;
      expect(lb.y - heroBox.y).toBeCloseTo(84, 0);
      expect(lb.x + lb.width / 2).toBeCloseTo(720, 0);
      const lyric = hero.locator('[aria-hidden="true"]').last();
      await expect(lyric).toHaveCSS("opacity", "0");
    });

    test("hero height follows the small viewport, minimum 640", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      expect((await page.locator("header#top").boundingBox())!.height).toBe(900);
      await page.setViewportSize({ width: 1440, height: 560 });
      expect((await page.locator("header#top").boundingBox())!.height).toBe(640);
    });

    test("wordmark, cone and CSS mic", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      const heroBox = (await hero.boundingBox())!;
      const word = hero.locator('div[aria-hidden="true"]', { hasText: "BS KARA" });
      await expect(word).toHaveAttribute("aria-hidden", "true");
      await expect(word).toHaveText("BS KARA");
      const ws = await word.evaluate((el) => {
        const s = getComputedStyle(el);
        const k = getComputedStyle(el.querySelectorAll("span")[1]);
        const b = getComputedStyle(el.querySelectorAll("span")[0]);
        return {
          weight: s.fontWeight,
          size: s.fontSize,
          variation: s.fontVariationSettings,
          select: s.userSelect,
          bs: b.color,
          kFill: k.color,
          kStroke: k.webkitTextStrokeWidth,
          kStrokeColor: k.webkitTextStrokeColor,
        };
      });
      expect(ws.weight).toBe("900");
      expect(ws.size).toBe("230.4px");
      expect(ws.variation).toContain("125");
      expect(ws.select).toBe("none");
      expect(ws.bs).toBe("rgb(243, 239, 232)");
      expect(ws.kFill).toBe("rgba(0, 0, 0, 0)");
      expect(ws.kStroke).toBe("1.5px");
      expect(ws.kStrokeColor).toBe("rgba(243, 239, 232, 0.55)");
      const wb = (await word.boundingBox())!;
      expect(wb.x + wb.width / 2).toBeCloseTo(720, 0);
      expect(wb.y + wb.height / 2 - heroBox.y).toBeCloseTo(heroBox.height * 0.42, 0);
      const zs = await Promise.all(
        [word, hero.locator("[data-mic]")].map((l) => l.evaluate((el) => Number(getComputedStyle(el).zIndex))),
      );
      expect(zs[0]).toBeLessThan(zs[1]);

      const cone = hero.locator('div[aria-hidden="true"]').first();
      const cs = await cone.evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.opacity, s.pointerEvents, s.backgroundImage, s.top];
      });
      expect(cs[0]).toBe("0.75");
      expect(cs[1]).toBe("none");
      expect(cs[2]).toContain("rgba(255, 233, 196, 0.2)");

      const mic = hero.locator("[data-mic]");
      await expect(mic).toHaveAttribute("aria-hidden", "true");
      await expect(mic).toBeVisible();
      const mb = (await mic.boundingBox())!;
      expect(mb.width).toBe(120);
      expect(mb.height).toBe(330);
      expect(mb.x + mb.width / 2).toBeCloseTo(720, 0);
    });

    test("bottom-left copy and bottom-right hint at 1440", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      const h1 = (await hero.getByRole("heading", { level: 1 }).boundingBox())!;
      const hint = hero.getByText(c.hint, { exact: true });
      const hb = (await hint.boundingBox())!;
      const heroBox = (await hero.boundingBox())!;
      expect(h1.x).toBeLessThan(200);
      expect(h1.y).toBeGreaterThan(heroBox.height / 2);
      expect(hb.x).toBeGreaterThan(720);
      expect(hb.y).toBeGreaterThan(heroBox.height / 2);
      expect(1440 - (hb.x + hb.width)).toBeLessThan(200);
      expect(await hint.locator("..").evaluate((el) => getComputedStyle(el.parentElement!).textAlign)).toBe("right");
    });

    test("tablet keeps the lede and a 4 % gutter", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      await expect(hero.getByText(c.lede, { exact: true })).toBeVisible();
      const h1 = (await hero.getByRole("heading", { level: 1 }).boundingBox())!;
      expect(h1.x).toBeCloseTo(30.72, 1);
    });

    test("phone layout at 375x812", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      const heroBox = (await hero.boundingBox())!;
      expect(heroBox.height).toBe(812);
      const word = hero.locator('div[aria-hidden="true"]', { hasText: "BS KARA" });
      const wb = (await word.boundingBox())!;
      expect(wb.y + wb.height / 2 - heroBox.y).toBeCloseTo(heroBox.height * 0.31, 0);
      await expect(hero.getByText(c.lede, { exact: true })).toBeHidden();
      await expect(hero.getByRole("paragraph")).toHaveCount(0);
      const hint = (await hero.getByText(c.hint, { exact: true }).boundingBox())!;
      const h1 = (await hero.getByRole("heading", { level: 1 }).boundingBox())!;
      expect(hint.y + hint.height).toBeLessThanOrEqual(h1.y);
      expect(hint.x).toBeLessThan(h1.x + 40);
      expect(hint.x).toBeLessThan(120);
      const a = (await hero.getByRole("link", { name: c.open, exact: true }).boundingBox())!;
      const b = (await hero.getByRole("link", { name: c.film, exact: true }).boundingBox())!;
      const sameLine = Math.abs(a.y - b.y) < 2;
      if (!sameLine) expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
      else expect(b.x + b.width).toBeLessThanOrEqual(375);
    });
  });
}

const live = {
  vi: {
    mic: "Micro 3D. Kéo để xoay, chạm để bật.",
    label: "● Đang hát · Phòng 7108",
    line: "Nâng ly lên cười thật to nào, đêm nay ta hát cho nhau",
  },
  en: {
    mic: "3D microphone. Drag to turn, tap to switch it on.",
    label: "● Live · Room 7108",
    line: "Raise your glass and laugh out loud, tonight we sing for each other",
  },
} as const;

const RED = "rgb(255, 74, 43)";
const tapAt = { desktop: { x: 720, y: 300 }, mobile: { x: 187, y: 300 } } as const;

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];
  const l = live[lang];

  test.describe(`hero live state on ${lang}`, () => {
    test("a tap toggles live, with the label, hint and cone styles", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      const box = hero.getByText(c.label, { exact: true }).locator("..");
      const hint = hero.getByText(c.hint, { exact: true }).locator("..");
      const cone = hero.locator('div[aria-hidden="true"]').first();
      await page.mouse.click(tapAt.desktop.x, tapAt.desktop.y);
      await expect(hero).toHaveAttribute("data-live", "true");
      await expect(box).toHaveCSS("background-color", RED);
      await expect(box).toHaveCSS("border-top-color", RED);
      await expect(box).toHaveCSS("color", "rgb(9, 9, 10)");
      await expect(box).toHaveCSS("box-shadow", "rgba(255, 74, 43, 0.45) 0px 0px 40px 0px");
      await expect(box).toHaveCSS("transition-duration", "0.3s");
      await expect(hint).toHaveCSS("opacity", "0");
      await expect(hint).toHaveCSS("transition-duration", "0.4s");
      await expect(cone).toHaveCSS("opacity", "1");
      await expect(cone).toHaveCSS("filter", "saturate(1.6) hue-rotate(-12deg)");
      await page.mouse.click(tapAt.desktop.x, tapAt.desktop.y);
      await expect(hero).toHaveAttribute("data-live", "false");
      await expect(box).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(box).toHaveCSS("color", "rgb(141, 139, 135)");
      await expect(hint).toHaveCSS("opacity", "1");
      await expect(cone).toHaveCSS("opacity", "0.75");
    });

    test("clicks on the hero's links, buttons and text never toggle", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      await page.evaluate(() => document.querySelectorAll("a").forEach((a) => a.addEventListener("click", (e) => e.preventDefault())));
      for (const target of [
        hero.getByRole("link", { name: c.open, exact: true }),
        hero.getByRole("link", { name: c.film, exact: true }),
        hero.getByRole("heading", { level: 1 }),
        hero.getByText(c.lede, { exact: true }),
        hero.getByText(c.meta[0], { exact: true }),
        hero.getByText(c.hint, { exact: true }),
        hero.getByText(c.label, { exact: true }),
      ]) {
        await target.click();
        await expect(hero).toHaveAttribute("data-live", "false");
      }
      await expect(hero.locator("i")).toHaveCount(0);
    });

    test("a drag of 6 px does not toggle, 5 px does", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      const { x, y } = tapAt.desktop;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 6, y, { steps: 3 });
      await page.mouse.up();
      await expect(hero).toHaveAttribute("data-live", "false");
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 5, y, { steps: 3 });
      await page.mouse.up();
      await expect(hero).toHaveAttribute("data-live", "true");
    });

    test("the mic control is a named toggle button, also without WebGL", async ({ page }) => {
      await page.addInitScript(() => {
        HTMLCanvasElement.prototype.getContext = () => null;
      });
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      const mic = hero.getByRole("button", { name: l.mic, exact: true });
      await expect(mic).toHaveAttribute("aria-pressed", "false");
      await expect(mic).toHaveAttribute("type", "button");
      await mic.focus();
      await page.keyboard.press("Enter");
      await expect(mic).toHaveAttribute("aria-pressed", "true");
      await expect(hero).toHaveAttribute("data-live", "true");
      await expect(hero.locator("i")).toHaveCount(3);
      await page.keyboard.press("Space");
      await expect(mic).toHaveAttribute("aria-pressed", "false");
      await expect(hero).toHaveAttribute("data-live", "false");
    });

    test("each toggle makes three rings on the grille that are gone after 2.4 s", async ({ page }) => {
      // ring removal is a 2.4 s timer: drive it with the fake clock so a slow CI machine cannot stretch it
      await page.clock.install();
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      const rings = hero.locator("i");
      for (const expected of ["true", "false"]) {
        await page.mouse.click(tapAt.desktop.x, tapAt.desktop.y);
        await expect(hero).toHaveAttribute("data-live", expected);
        await expect(rings).toHaveCount(3);
        const info = await rings.evaluateAll((els) =>
          els.map((el) => {
            const s = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return {
              delay: s.animationDelay,
              duration: s.animationDuration,
              timing: s.animationTimingFunction,
              border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`,
              events: s.pointerEvents,
              hidden: el.getAttribute("aria-hidden"),
              cx: r.x + r.width / 2,
              cy: r.y + r.height / 2,
            };
          }),
        );
        const mic = (await hero.locator("[data-mic]").boundingBox())!;
        expect(info.map((i) => i.delay)).toEqual(["0s", "0.25s", "0.5s"]);
        for (const i of info) {
          expect(i.duration).toBe("1.6s");
          expect(i.timing).toBe("ease-out");
          expect(i.border).toBe(`1px solid ${RED}`);
          expect(i.events).toBe("none");
          expect(i.hidden).toBe("true");
          expect(Math.abs(i.cx - (mic.x + 60))).toBeLessThanOrEqual(2);
          expect(Math.abs(i.cy - (mic.y + 50))).toBeLessThanOrEqual(2);
        }
        await page.clock.runFor(2_400);
        await expect(rings).toHaveCount(0);
      }
    });

    test("the lyric shows its label and 13 dim words, hidden from the accessibility tree", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      const lyric = hero.locator('div[aria-hidden="true"]').last();
      await expect(lyric).toHaveCSS("opacity", "0");
      await page.mouse.click(tapAt.desktop.x, tapAt.desktop.y);
      await expect(lyric).toHaveCSS("opacity", "1");
      await expect(lyric).toHaveCSS("transition-duration", "0.4s");
      const label = lyric.getByText(l.label, { exact: true });
      await expect(label).toHaveCSS("color", RED);
      await expect(label).toHaveCSS("font-family", /mono/i);
      await expect(lyric).toContainText(l.line);
      await expect(lyric.getByText(l.line.split(" ").at(-1)!, { exact: true })).toHaveCSS("color", "rgba(243, 239, 232, 0.5)");
      const words = lyric.getByText(/\S/).filter({ hasNot: page.locator("span") });
      await expect(words).toHaveCount(14);
      expect(l.line.split(" ")).toHaveLength(13);
      expect(await hero.ariaSnapshot()).not.toContain(l.line.split(" ")[0]);
    });

    test("words are sung 330 ms apart, restart after the last, and reset when idle", async ({ page }) => {
      await page.clock.install();
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      await page.clock.pauseAt(Date.now() + 60_000);
      const hero = page.locator("header#top");
      const sung = () =>
        hero.evaluate((h) => {
          const lyric = [...h.querySelectorAll('div[aria-hidden="true"]')].at(-1)!;
          return [...lyric.children].slice(1).filter((w) => getComputedStyle(w).color === "rgb(243, 239, 232)").length;
        });
      await page.mouse.click(tapAt.desktop.x, tapAt.desktop.y);
      await expect(hero).toHaveAttribute("data-live", "true");
      await page.waitForTimeout(200);
      await page.clock.runFor(329);
      await page.waitForTimeout(100);
      expect(await sung()).toBe(0);
      await page.clock.runFor(1);
      await expect.poll(sung).toBe(1);
      await page.clock.runFor(4290 - 330);
      await expect.poll(sung).toBe(13);
      await page.clock.runFor(330);
      await expect.poll(sung).toBe(0);
      await page.clock.runFor(330);
      await expect.poll(sung).toBe(1);
      await page.mouse.click(tapAt.desktop.x, tapAt.desktop.y);
      await expect(hero).toHaveAttribute("data-live", "false");
      await expect.poll(sung).toBe(0);
      await page.mouse.click(tapAt.desktop.x, tapAt.desktop.y);
      await page.waitForTimeout(200);
      await page.clock.runFor(330);
      await expect.poll(sung).toBe(1);
    });

    test("lyric sits above the h1 on a phone and right of the copy on desktop", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoPage(page, lang);
      const hero = page.locator("header#top");
      await page.mouse.click(tapAt.mobile.x, tapAt.mobile.y);
      await expect(hero).toHaveAttribute("data-live", "true");
      const lyric = hero.locator('div[aria-hidden="true"]').last();
      await expect(lyric).toHaveCSS("opacity", "1");
      const lb = (await lyric.boundingBox())!;
      const h1 = (await hero.getByRole("heading", { level: 1 }).boundingBox())!;
      expect(lb.y + lb.height).toBeLessThanOrEqual(h1.y);
      expect(lb.x).toBeLessThan(h1.x + 40);
      await expect(lyric).toHaveCSS("text-align", "left");
      await expect(lyric.getByText(l.line.split(" ").at(-1)!, { exact: true })).toHaveCSS("color", "rgba(243, 239, 232, 0.5)");
      await expect(hero.getByText(c.hint, { exact: true }).locator("..")).toHaveCSS("opacity", "0");

      await page.setViewportSize(VIEWPORTS.desktop);
      const copyCol = (await hero.getByRole("heading", { level: 1 }).locator("..").boundingBox())!;
      const lyricDesktop = (await lyric.boundingBox())!;
      expect(lyricDesktop.x).toBeGreaterThanOrEqual(copyCol.x + copyCol.width);
    });
  });
}

test.describe("touch swipe on the mic", () => {
  test.use({ hasTouch: true, viewport: VIEWPORTS.mobile });

  test("a 300 px swipe up scrolls the page and does not toggle", async ({ page }) => {
    await gotoPage(page, "vi");
    const hero = page.locator("header#top");
    const client = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", y: number) =>
      client.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x: 187, y }],
      });
    await touch("touchStart", 600);
    for (let y = 600; y >= 300; y -= 30) await touch("touchMove", y);
    await touch("touchEnd", 300);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
    await expect(hero).toHaveAttribute("data-live", "false");
  });
});
