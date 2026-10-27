import { withoutWebGl } from "./mic";
import { expect, gotoPage, showAllReveals, skipTransitions, test, VIEWPORTS } from "./support";

const SECTIONS = ["header#top", "section#xem", "section#quay", "section#cungnhau", "section#tinhnang", "section#batdau", "footer"];

for (const lang of ["vi", "en"] as const) {
  for (const state of ["idle", "live"] as const) {
    test(`${lang}, ${state}: at 320x640 nothing scrolls sideways or is cut off at the right edge`, async ({ page }) => {
      await withoutWebGl(page);
      await page.setViewportSize(VIEWPORTS.narrow);
      await gotoPage(page, lang);
      if (state === "live") {
        await skipTransitions(page);
        await page.mouse.click(160, 300);
        await expect(page.locator("header#top")).toHaveAttribute("data-live", "true");
      }
      await showAllReveals(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
      const cut = await page.evaluate(() =>
        [...document.querySelectorAll("body *")]
          .filter((el) => !el.closest("[data-marquee]") && el.tagName !== "CANVAS")
          // the grain and the spotlight cone: empty, aria-hidden, click-through layers that are bleeds by design
          .filter((el) => !(el.getAttribute("aria-hidden") === "true" && el.textContent === "" && getComputedStyle(el).pointerEvents === "none"))
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && r.right > 320.5)
          .map(({ el, r }) => `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className) : ""} right=${r.right}`),
      );
      expect(cut).toEqual([]);
    });
  }
}

test.describe("200 % zoom", () => {
  // a 1440x900 window at 200 % is a 720x450 CSS-pixel viewport at device scale factor 2
  test.use({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 });

  for (const lang of ["vi", "en"] as const) {
    test(`${lang}: no text is clipped by its container or overlaps other text in any chapter`, async ({ page }) => {
      await withoutWebGl(page);
      await gotoPage(page, lang);
      await showAllReveals(page);
      const problems = await page.evaluate((roots) => {
        const out: string[] = [];
        const visible = (el: Element) => {
          for (let e: Element | null = el; e; e = e.parentElement) {
            const cs = getComputedStyle(e);
            if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
          }
          return true;
        };
        const name = (el: Element) => el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className : "");
        for (const root of roots) {
          const top = document.querySelector(root)!;
          const texts: { el: Element; rect: DOMRect }[] = [];
          for (const el of top.querySelectorAll("*")) {
            if (!visible(el)) continue;
            const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent!.trim() !== "");
            if (own.length === 0) continue;
            // the text container: the nearest ancestor-or-self that is not inline
            let box: Element = el;
            while (getComputedStyle(box).display === "inline" && box.parentElement) box = box.parentElement;
            if (box.scrollWidth > box.clientWidth + 1 && getComputedStyle(box).clip === "auto" && !/sr|announce/.test(String(box.className))) {
              out.push(`${root}: ${name(box)} clipped (${box.scrollWidth} > ${box.clientWidth})`);
            }
            const range = document.createRange();
            for (const node of own) {
              range.selectNodeContents(node);
              for (const r of range.getClientRects()) {
                // drop what an ancestor with overflow other than visible hides
                let shown = true;
                for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
                  const cs = getComputedStyle(a);
                  if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
                  const ar = a.getBoundingClientRect();
                  if (r.right <= ar.left || r.left >= ar.right || r.bottom <= ar.top || r.top >= ar.bottom) shown = false;
                }
                if (shown && r.width > 1 && r.height > 1) texts.push({ el, rect: r });
              }
            }
          }
          for (let i = 0; i < texts.length; i++) {
            for (let j = i + 1; j < texts.length; j++) {
              const a = texts[i];
              const b = texts[j];
              if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
              const w = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
              const h = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
              if (w > 1 && h > 1) out.push(`${root}: ${name(a.el)} overlaps ${name(b.el)} (${Math.round(w)}x${Math.round(h)})`);
            }
          }
        }
        return out;
      }, SECTIONS);
      expect(problems).toEqual([]);
    });
  }
});
