import type { Page } from "@playwright/test";
import { accentElements, dimTextElements, expect, gotoPage, roundedElements, skipTransitions, test, VIEWPORTS } from "./support";

const SPOT = "rgb(255, 233, 196)";

const copy = {
  vi: {
    accents: ["36 giây.", "Quay.", "một mình.", "đêm hát cần.", "hát gì?"],
    mic: "Micro 3D. Kéo để xoay, chạm để bật.",
    play: "Phát",
    tap: "Chạm để thả cảm xúc",
  },
  en: {
    accents: ["36 seconds.", "Spin.", "alone.", "night out needs.", "singing tonight?"],
    mic: "3D microphone. Drag to turn, tap to switch it on.",
    play: "Play",
    tap: "Tap to send a reaction",
  },
} as const;

const IDS = ["xem", "quay", "cungnhau", "tinhnang", "batdau"];

type Font = { family: string; weight: string; wdth: number | null; transform: string; style: string };

/** Computed typeface facts of the first element matching `selector`. */
async function font(page: Page, selector: string): Promise<Font> {
  return page.locator(selector).first().evaluate((el) => {
    const cs = getComputedStyle(el);
    const wdth = cs.fontVariationSettings.match(/"wdth"\s+(\d+)/);
    return {
      family: cs.fontFamily,
      weight: cs.fontWeight,
      wdth: wdth ? Number(wdth[1]) : null,
      transform: cs.textTransform,
      style: cs.fontStyle,
    };
  });
}

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];

  test.describe(`look on ${lang}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
    });

    test("each chapter heading: accent phrase in Playfair italic #ffe9c4, the rest Archivo 900 uppercase", async ({ page }) => {
      for (const [i, id] of IDS.entries()) {
        const h2 = page.locator(`section#${id} h2`);
        const em = h2.locator("em");
        await expect(em).toHaveCount(1);
        await expect(em).toHaveText(c.accents[i]);
        const lead = await h2.evaluate((el) => getComputedStyle(el));
        expect(lead.fontFamily).toMatch(/^Archivo,/);
        expect(lead.fontWeight).toBe("900");
        expect(lead.textTransform).toBe("uppercase");
        const accent = await em.evaluate((el) => {
          const cs = getComputedStyle(el);
          return { family: cs.fontFamily, style: cs.fontStyle, color: cs.color, transform: cs.textTransform };
        });
        expect(accent.family).toMatch(/^"Playfair Display",/);
        expect(accent.style).toBe("italic");
        expect(accent.color).toBe(SPOT);
        expect(accent.transform).toBe("none");
      }
    });

    test("typefaces: wordmark and headings Archivo 900 at width 112 to 125, accents Playfair italic, labels and buttons JetBrains Mono uppercase, body Be Vietnam Pro", async ({
      page,
    }) => {
      const archivo = /^Archivo,/;
      const mono = /^"JetBrains Mono",/;
      const wordmark = await font(page, "header#top [aria-hidden='true'] span");
      expect(wordmark.family).toMatch(archivo);
      expect(wordmark.weight).toBe("900");
      expect(wordmark.wdth).toBeGreaterThanOrEqual(112);
      expect(wordmark.wdth).toBeLessThanOrEqual(125);
      for (const id of IDS) {
        const h2 = await font(page, `section#${id} h2`);
        expect(h2.family).toMatch(archivo);
        expect(h2.weight).toBe("900");
        expect(h2.wdth).toBeGreaterThanOrEqual(112);
        expect(h2.wdth).toBeLessThanOrEqual(125);
        const em = await font(page, `section#${id} h2 em`);
        expect(em.family).toMatch(/^"Playfair Display",/);
        expect(em.style).toBe("italic");
      }
      expect((await font(page, "h1 em")).style).toBe("italic");
      for (const selector of ["nav ul a", "section#xem b + span", "a.btn", "button.btn", "footer"]) {
        const label = await font(page, selector);
        expect(label.family, selector).toMatch(mono);
        expect(label.transform, selector).toBe("uppercase");
      }
      for (const selector of ["body", "section#xem p", "section#tinhnang article p"]) {
        expect((await font(page, selector)).family, selector).toMatch(/^"Be Vietnam Pro",/);
      }
    });

    test("feature cards, chapter frames, buttons and the reel have 1 px borders and square corners", async ({ page }) => {
      // the card grid carries the outer 1 px border; each card only its inner hairlines (the last one has none)
      const frames = ["section#tinhnang div:has(> article)", "[data-film]", "[data-reel] >> xpath=../..", "[data-scene]", "a.btn", "button.btn"];
      for (const selector of [...frames, "section#tinhnang article"]) {
        const items = page.locator(selector);
        expect(await items.count(), selector).toBeGreaterThan(0);
        const sides = await items.evaluateAll((els) =>
          els.map((el) => {
            const cs = getComputedStyle(el);
            return {
              widths: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].filter((w) => w !== "0px"),
              radius: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius],
            };
          }),
        );
        for (const s of sides) {
          if (selector !== "section#tinhnang article") expect(s.widths.length, `${selector} has a border`).toBeGreaterThan(0);
          expect(s.widths.every((w) => w === "1px"), `${selector} border widths ${s.widths}`).toBe(true);
          expect(s.radius, selector).toEqual(["0px", "0px", "0px", "0px"]);
        }
      }
    });

    test("only the registered elements have a rounded corner", async ({ page }) => {
      const allowed = [
        "a.logo > i", // nav logo disc
        "div.hint.mono > b", // idle live dot
        "div.rec.mono > b", // REC live dot
        "button.playBig", // round play button
        "div.vis > div.phone", // phone outline in feature 02
        "div.phone > i", // the rows inside the phone drawing (prototype .v-phone i)
        "div.wave > i", // the bars of the reactions wave (prototype .v-wave i)
      ];
      const rounded = (await roundedElements(page)).map((entry) => entry.replace(/ \[radius\]$/, "").replace(/^div > /, ""));
      expect([...new Set(rounded)].sort()).toEqual([...allowed].sort());
    });

    test("the dim token colours only the unhighlighted reel rows", async ({ page }) => {
      expect(await dimTextElements(page)).toEqual(["ul.list > li [color]"]);
      const stray = await page.evaluate(() =>
        [...document.querySelectorAll("li")]
          .filter((li) => getComputedStyle(li).color === "rgb(85, 83, 79)")
          .filter((li) => !li.closest("[data-reel]") || li.hasAttribute("data-hit")).length,
      );
      expect(stray).toBe(0);
    });

    test("the grain overlay covers the viewport at opacity 0.06 above the content, inert and hidden from assistive technology", async ({
      page,
    }) => {
      const grain = page.locator(".grain");
      await expect(grain).toHaveCount(1);
      await expect(grain).toHaveAttribute("aria-hidden", "true");
      await expect(grain).toHaveCSS("opacity", "0.06");
      await expect(grain).toHaveCSS("pointer-events", "none");
      await expect(grain).toHaveCSS("position", "fixed");
      const box = (await grain.boundingBox())!;
      expect(box.x).toBeLessThanOrEqual(0);
      expect(box.y).toBeLessThanOrEqual(0);
      expect(box.x + box.width).toBeGreaterThanOrEqual(VIEWPORTS.desktop.width);
      expect(box.y + box.height).toBeGreaterThanOrEqual(VIEWPORTS.desktop.height);
      const z = await page.evaluate(() => {
        const own = Number(getComputedStyle(document.querySelector(".grain")!).zIndex);
        const others = [...document.querySelectorAll("main *, footer, footer *")]
          .map((el) => Number(getComputedStyle(el).zIndex))
          .filter((n) => !Number.isNaN(n));
        return { own, max: Math.max(...others) };
      });
      expect(z.own).toBeGreaterThan(z.max);
      expect(await page.getByRole("img").count()).toBe(await page.locator("img").count());
      expect(await page.locator("body").ariaSnapshot()).not.toContain("grain");
    });
  });
}

/** Every use of #ff4a2b: the element as `parent > element [properties]` and the role that allows it. */
const ACCENT_ROLES: Record<string, string> = {
  "div.rail > i [background]": "scroll-ruler marker",
  "div.rec.mono > b [background]": "live dot",
  "div.prog > i [background]": "progress fill",
  "div.score > sup [color]": "score label",
  "div.row > span.s [color]": "marquee separator",
  "div.lyric > span.lyricLabel [color]": "sung lyric label",
  "header.hero > div.onair.mono [background,border]": "ON AIR live state",
  "header.hero > i.ring [border]": "reaction ring",
};

const unregistered = (found: string[]) => found.filter((entry) => !(entry in ACCENT_ROLES));

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];

  test(`the accent colour only marks its registered roles on ${lang}: idle, live, film playing, lyric half sung, after a reaction`, async ({
    page,
  }) => {
    await page.clock.install();
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    await skipTransitions(page);
    await page.clock.pauseAt(Date.now() + 120_000);
    // fake time also renders every animation frame: stop the canvases so the test stays fast
    await page.evaluate(() => document.querySelectorAll("canvas").forEach((canvas) => (canvas.style.display = "none")));
    const hero = page.locator("header#top");

    const idle = await accentElements(page);
    expect(unregistered(idle), "idle").toEqual([]);
    expect(idle).not.toContain("header.hero > div.onair.mono [background,border]");
    expect(idle).toContain("div.rail > i [background]");

    await hero.getByRole("button", { name: c.mic, exact: true }).click();
    await expect(hero).toHaveAttribute("data-live", "true");
    const live = await accentElements(page);
    expect(unregistered(live), "live").toEqual([]);
    expect(live).toContain("header.hero > div.onair.mono [background,border]");

    // two words of the 13-word line are sung 330 ms apart
    await page.clock.runFor(1_000);
    const sung = await hero.evaluate((h) => {
      const lyric = [...h.querySelectorAll('div[aria-hidden="true"]')].at(-1)!;
      return [...lyric.children].slice(1).filter((w) => getComputedStyle(w).color === "rgb(243, 239, 232)").length;
    });
    expect(sung).toBeGreaterThan(0);
    expect(sung).toBeLessThan(13);
    expect(unregistered(await accentElements(page)), "lyric half sung").toEqual([]);

    const film = page.locator("[data-film]");
    await film.scrollIntoViewIfNeeded();
    await film.getByRole("button", { name: c.play, exact: true }).click();
    await page.clock.runFor(2_000);
    expect(await page.locator("[data-progress] i").evaluate((el) => parseFloat(el.style.width))).toBeGreaterThan(0);
    expect(unregistered(await accentElements(page)), "film playing").toEqual([]);

    const scene = page.locator("section#cungnhau [data-scene]");
    await scene.scrollIntoViewIfNeeded();
    await scene.getByRole("button", { name: c.tap, exact: true }).click();
    await expect(scene.locator("[data-word]")).toHaveCount(1);
    expect(unregistered(await accentElements(page)), "after a reaction").toEqual([]);

    // the focus ring is the one accent outline, on the focused element only
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => {
      const active = document.activeElement!;
      const cs = getComputedStyle(active);
      return { outline: cs.outlineColor, width: cs.outlineWidth, style: cs.outlineStyle, only: [...document.querySelectorAll("*")].filter((el) => getComputedStyle(el).outlineStyle !== "none" && getComputedStyle(el).outlineWidth !== "0px").length };
    });
    expect(ring).toEqual({ outline: "rgb(255, 74, 43)", width: "2px", style: "solid", only: 1 });
  });
}
