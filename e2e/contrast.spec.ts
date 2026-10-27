import { withoutWebGl } from "./mic";
import { expect, gotoPage, showAllReveals, skipTransitions, test, VIEWPORTS } from "./support";
import type { Page } from "@playwright/test";

type Sample = {
  rect: { left: number; top: number; right: number; bottom: number };
  text: string;
  where: string;
  ratio: number;
  need: number;
  fg: string;
  fgRaw: [number, number, number, number];
  bg: string;
  unknown: boolean;
  fixed: boolean;
};

/**
 * Measures every visible text node: its computed colour (with opacity of itself and its ancestors) over the
 * background composited from the computed background colours of its ancestors. A gradient or image background
 * is not a colour: it is reported as `unknown` so it is never passed silently.
 */
async function measure(page: Page): Promise<Sample[]> {
  return page.evaluate(() => {
    type RGBA = [number, number, number, number];
    const parse = (v: string): RGBA => {
      const m = v.match(/rgba?\(([^)]+)\)/);
      if (!m) return [0, 0, 0, 0];
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return [p[0], p[1], p[2], p[3] ?? 1];
    };
    const over = (top: RGBA, under: RGBA): RGBA => {
      const a = top[3] + under[3] * (1 - top[3]);
      if (a === 0) return [0, 0, 0, 0];
      return [0, 1, 2].map((i) => (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / a).concat(a) as RGBA;
    };
    const lum = (c: RGBA) => {
      const [r, g, b] = c.slice(0, 3).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: RGBA, b: RGBA) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const hex = (c: RGBA) => `rgba(${c.map((v, i) => (i < 3 ? Math.round(v) : +v.toFixed(2))).join(",")})`;
    const out: Sample[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent!.trim();
      const el = node.parentElement!;
      if (!text || ["SCRIPT", "STYLE", "NOSCRIPT", "TITLE"].includes(el.tagName)) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || rect.right <= 0 || rect.left >= innerWidth) continue; // empty or scrolled out of view sideways
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      // exceptions: the outlined "KARA" and the reel rows other than the highlighted one
      if (cs.color === "rgba(0, 0, 0, 0)" && parseFloat(cs.getPropertyValue("-webkit-text-stroke-width")) > 0) continue;
      const row = el.closest("[data-reel] li");
      if (row && !row.hasAttribute("data-hit")) continue;
      let opacity = 1;
      let unknown = false;
      let fixed = false;
      let hidden = false;
      const layers: RGBA[] = [];
      for (let a: Element | null = el; a; a = a.parentElement) {
        const s = getComputedStyle(a);
        opacity *= Number(s.opacity);
        if (s.display === "none" || s.visibility === "hidden") hidden = true;
        const box = a.getBoundingClientRect();
        if (s.overflow !== "visible" && (box.width <= 1 || box.height <= 1)) hidden = true; // visually hidden text
        if (s.position === "fixed") fixed = true;
        const bg = parse(s.backgroundColor);
        if (bg[3] > 0) layers.push(bg);
        if (s.backgroundImage !== "none") unknown = true;
      }
      if (hidden || opacity === 0) continue;
      let bg: RGBA = [0, 0, 0, 1];
      for (const l of layers.reverse()) bg = over(l, bg);
      const fgRaw = parse(cs.color);
      const fg = over([fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * opacity], bg);
      const size = parseFloat(cs.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
      const tag = (e: Element) => e.tagName.toLowerCase() + [...e.classList].map((c) => "." + c.replace(/^_?[A-Za-z0-9-]{6}_/, "")).join("");
      out.push({
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
        fgRaw: [fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * opacity],
        text: text.slice(0, 40),
        where: (el.parentElement ? tag(el.parentElement) + " > " : "") + tag(el),
        ratio: ratio(fg, bg),
        need: large ? 3 : 4.5,
        fg: hex(fg),
        bg: hex(bg),
        unknown,
        fixed,
      });
    }
    return out;
  });
}

const fmt = (s: Sample) => `${s.where} "${s.text}" ${s.fg} on ${s.bg}: ${s.ratio.toFixed(2)} < ${s.need}`;

/**
 * Text over a gradient, the grain, a glow or a canvas has no computed background colour: read the pixels
 * behind it instead. Text is made transparent, the page is screenshot once, and the lowest ratio of the text
 * colour against any pixel of the text box is the measure. The page is at the top, so viewport and page
 * coordinates agree (the fixed nav included).
 */
async function pixelRatios(page: Page, samples: Sample[]): Promise<void> {
  const todo = samples.filter((s) => s.unknown).sort((a, b) => a.rect.top - b.rect.top);
  const height = page.viewportSize()!.height;
  const NAV = 120; // the fixed nav covers the top of the viewport: keep the text below it
  const fixed = todo.filter((s) => s.fixed);
  const rest = todo.filter((s) => !s.fixed);
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await readChunk(page, fixed, 0);
  while (rest.length) {
    const start = Math.max(0, rest[0].rect.top - NAV);
    const chunk = rest.filter((s) => s.rect.top >= start + (start ? NAV : 0) && s.rect.bottom <= start + height);
    if (chunk.length === 0) throw new Error(`text taller than the viewport: ${fmt(rest[0])}`);
    await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), start);
    await readChunk(page, chunk, start);
    for (const s of chunk) rest.splice(rest.indexOf(s), 1);
  }
}

/** Sets `ratio` of each sample, whose rect is in page coordinates, from the viewport screenshot taken at scroll `top`. */
async function readChunk(page: Page, todo: Sample[], top: number): Promise<void> {
  if (todo.length === 0) return;
  const png = await page.screenshot();
  const ratios: number[] = await page.evaluate(
    async ({ b64, items }) => {
      const img = new Image();
      img.src = "data:image/png;base64," + b64;
      await img.decode();
      const scale = img.width / document.documentElement.clientWidth;
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext("2d", { willReadFrequently: true })!;
      g.drawImage(img, 0, 0);
      const lum = (r: number, gg: number, b: number) => {
        const f = (v: number) => {
          const x = v / 255;
          return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b);
      };
      return items.map(({ rect, fg }) => {
        const x = Math.max(0, Math.floor(rect.left * scale));
        const y = Math.max(0, Math.floor(rect.top * scale));
        const w = Math.max(1, Math.min(c.width, Math.ceil(rect.right * scale)) - x);
        const h = Math.max(1, Math.min(c.height, Math.ceil(rect.bottom * scale)) - y);
        const data = g.getImageData(x, y, w, h).data;
        let worst = Infinity;
        for (let p = 0; p < data.length; p += 4) {
          const a = fg[3];
          const t = lum(a * fg[0] + (1 - a) * data[p], a * fg[1] + (1 - a) * data[p + 1], a * fg[2] + (1 - a) * data[p + 2]);
          const bgL = lum(data[p], data[p + 1], data[p + 2]);
          worst = Math.min(worst, (Math.max(t, bgL) + 0.05) / (Math.min(t, bgL) + 0.05));
        }
        return worst;
      });
    },
    { b64: png.toString("base64"), items: todo.map((s) => ({ rect: { ...s.rect, top: s.rect.top - top, bottom: s.rect.bottom - top }, fg: s.fgRaw })) },
  );
  todo.forEach((s, i) => (s.ratio = ratios[i]));
}

async function expectContrast(page: Page, label: string) {
  await showAllReveals(page);
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  const samples = await measure(page);
  expect(samples.length, `${label}: text nodes measured`).toBeGreaterThan(20);
  // text over a gradient, glow or canvas: replace the computed ratio by the worst pixel
  await page.addStyleTag({ content: "* { color: transparent !important; text-shadow: none !important; -webkit-text-fill-color: transparent !important; }" });
  await pixelRatios(page, samples);
  const low = samples.filter((s) => s.ratio < s.need).map(fmt);
  expect(low, `${label}: text below its threshold`).toEqual([]);
  const near = samples.filter((s) => s.ratio < s.need + 0.3).map(fmt);
  if (near.length) test.info().annotations.push({ type: `${label}: within 0.3 of the threshold`, description: [...new Set(near)].join("\n") });
  return samples;
}

for (const lang of ["vi", "en"] as const) {
  for (const key of ["mobile", "tablet", "desktop"] as const) {
    test(`${lang} at ${key}: every visible text meets its contrast ratio, idle`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[key]);
      await gotoPage(page, lang);
      await skipTransitions(page);
      await expectContrast(page, "idle");
    });
  }
}

for (const lang of ["vi", "en"] as const) {
  for (const key of ["mobile", "tablet", "desktop"] as const) {
    test(`${lang} at ${key}: every visible text meets its contrast ratio, hero live over the glows`, async ({ page }) => {
      await withoutWebGl(page);
      await page.setViewportSize(VIEWPORTS[key]);
      await gotoPage(page, lang);
      await skipTransitions(page);
      const hero = page.locator("header#top");
      await page.mouse.click(VIEWPORTS[key].width / 2, 300);
      await expect(hero).toHaveAttribute("data-live", "true");
      await expect(hero.getByText("On air").locator("..")).toHaveCSS("background-color", "rgb(255, 74, 43)");
      await expect(hero.locator("i")).toHaveCount(0, { timeout: 10_000 });
      const samples = await expectContrast(page, "live");
      const onAir = samples.find((s) => s.text.toLowerCase() === "on air");
      expect(onAir, "the ON AIR label is measured").toBeDefined();
      expect(onAir!.ratio).toBeGreaterThanOrEqual(4.5);
    });

    test(`${lang} at ${key}: every visible text meets its contrast ratio, film playing`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[key]);
      await gotoPage(page, lang);
      await skipTransitions(page);
      const film = page.locator("[data-film]");
      await film.scrollIntoViewIfNeeded();
      await film.getByRole("button", { name: lang === "vi" ? "Phát video" : "Play video", exact: true }).click();
      await expect(film).toHaveAttribute("data-running", "true");
      await expectContrast(page, "film");
    });
  }
}

test("the focus ring has at least 3:1 contrast with the page, the raised panel and the film screen", async ({ page }) => {
  await gotoPage(page, "en");
  await page.keyboard.press("Tab");
  const ring = await page.evaluate(() => {
    const cs = getComputedStyle(document.activeElement!);
    return cs.outlineStyle === "solid" && cs.outlineWidth === "2px" ? cs.outlineColor : `no focus ring: ${cs.outline}`;
  });
  const rgb = (v: string) => (v.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  const lum = (c: number[]) => {
    const [r, g, b] = c.slice(0, 3).map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: number[], b: number[]) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  expect(ring).toBe("rgb(255, 74, 43)");
  // adjacent backgrounds: --bg, --bg-2 (raised panel) and the film's #050506
  for (const bg of [[9, 9, 10], [15, 15, 17], [5, 5, 6]]) expect(ratio(rgb(ring), bg)).toBeGreaterThanOrEqual(3);
});
