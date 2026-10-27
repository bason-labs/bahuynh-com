import { expect, gotoPage, test, VIEWPORTS } from "./support";

type Target = { name: string; x: number; y: number; width: number; height: number };

/** Every visible pointer target in page coordinates, as `tag.class "accessible text"`. */
async function targets(page: import("@playwright/test").Page): Promise<Target[]> {
  return page.evaluate(() => {
    const found: Target[] = [];
    const sel = 'a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (cs.display === "none" || cs.visibility === "hidden" || r.width <= 1 || r.height <= 1) continue;
      if (el.closest("[aria-hidden='true'], [inert]")) continue;
      const label = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 30);
      found.push({
        name: `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).replace(/\b_?[A-Za-z0-9-]{6}_/g, "").split(" ")[0] : ""} "${label}"`,
        x: r.left + scrollX,
        y: r.top + scrollY,
        width: r.width,
        height: r.height,
      });
    }
    return found;
  });
}

/** WCAG 2.5.8: a target under 24x24 passes if a 24 px circle centred on it meets no other target (or its circle). */
function failures(all: Target[]): string[] {
  const out: string[] = [];
  const circle = (t: Target) => ({ cx: t.x + t.width / 2, cy: t.y + t.height / 2 });
  const small = (t: Target) => t.width < 24 || t.height < 24;
  for (const t of all.filter(small)) {
    const { cx, cy } = circle(t);
    for (const o of all) {
      if (o === t) continue;
      // nearest point of the other target's box to the circle centre
      const nx = Math.max(o.x, Math.min(cx, o.x + o.width));
      const ny = Math.max(o.y, Math.min(cy, o.y + o.height));
      const box = Math.hypot(cx - nx, cy - ny);
      const o2 = circle(o);
      const reach = small(o) ? Math.hypot(cx - o2.cx, cy - o2.cy) >= 24 : box >= 12;
      if (!reach) out.push(`${t.name} (${t.width.toFixed(0)}x${t.height.toFixed(0)}) is within 24 px of ${o.name}`);
    }
  }
  return [...new Set(out)];
}

for (const lang of ["vi", "en"] as const) {
  for (const key of ["mobile", "tablet", "desktop"] as const) {
    test(`${lang} at ${key}: every pointer target is 24x24 or has 24 px of spacing`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[key]);
      await gotoPage(page, lang);
      const all = await targets(page);
      expect(all.length, "targets found").toBeGreaterThan(15);
      for (const label of lang === "vi" ? ["Dừng chuyển động", "Quay bài", "Hay quá", "Phát video"] : ["Pause motion", "Spin", "So good", "Play video"]) {
        expect(all.filter((t) => t.name.includes(label)).length, `${label} is a target`).toBeGreaterThan(0);
      }
      expect(failures(all)).toEqual([]);
    });
  }
}
