import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

export const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
  narrow: { width: 320, height: 640 },
} as const;

export const PATHS = { vi: "/", en: "/en/" } as const;

/** Collects console errors and uncaught page errors raised on `page`. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** `test` fails any test that logs a console error or throws a page error. */
export const test = base.extend({
  page: async ({ page }, provide) => {
    const errors = collectErrors(page);
    await provide(page);
    expect(errors, "console and page errors").toEqual([]);
  },
});

export { expect };

export async function gotoPage(page: Page, lang: keyof typeof PATHS) {
  const response = await page.goto(PATHS[lang]);
  expect(response?.status()).toBe(200);
  return response;
}

/** Runs axe with the WCAG 2.2 AA tags on the current page and expects 0 violations. */
export async function checkAxe(page: Page) {
  // axe reads a hidden or half-faded chapter block as low contrast: show every block fully first
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('[data-reveal="pending"]').forEach((el) => (el.dataset.reveal = "in"));
    document
      .getAnimations()
      .filter((a) => (a.effect as KeyframeEffect).target?.hasAttribute("data-reveal"))
      .forEach((a) => a.finish());
  });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

/**
 * Makes CSS transitions finish at once. Use it where a test checks an end state, not the motion:
 * a loaded CI runner can stall a transition part-way for seconds. Assert any `transition-*` values
 * before calling it.
 */
export async function skipTransitions(page: Page) {
  await page.addStyleTag({
    content: "*, *::before, *::after { transition-duration: 0s !important; transition-delay: 0s !important; }",
  });
}

type Probe = "accent" | "dim" | "radius";

/** Names every element that matches `probe` as `parent > element`, each `tag.class` with the CSS-module hash removed. */
async function listElements(page: Page, probe: Probe): Promise<string[]> {
  return page.evaluate((mode) => {
    const ACCENT = "rgb(255, 74, 43)";
    const DIM = "rgb(85, 83, 79)";
    const tag = (el: Element) =>
      el.tagName.toLowerCase() + [...el.classList].map((c) => "." + c.replace(/^_?[A-Za-z0-9-]{6}_/, "")).join("");
    const name = (el: Element) => (el.parentElement ? `${tag(el.parentElement)} > ` : "") + tag(el);
    const found: string[] = [];
    for (const el of document.querySelectorAll("body, body *")) {
      const cs = getComputedStyle(el);
      const props: string[] = [];
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim() !== "");
      if (mode === "dim") {
        if (ownText && cs.color === DIM) props.push("color");
      } else if (mode === "radius") {
        if (["TopLeft", "TopRight", "BottomRight", "BottomLeft"].some((c) => cs[`border${c}Radius` as "borderTopLeftRadius"] !== "0px")) props.push("radius");
      } else {
        if (ownText && cs.color === ACCENT) props.push("color");
        if (cs.backgroundColor === ACCENT) props.push("background");
        const sides = ["Top", "Right", "Bottom", "Left"] as const;
        if (sides.some((s) => cs[`border${s}Color`] === ACCENT && cs[`border${s}Width`] !== "0px" && cs[`border${s}Style`] !== "none")) props.push("border");
        if (cs.outlineColor === ACCENT && cs.outlineStyle !== "none" && cs.outlineWidth !== "0px") props.push("outline");
      }
      if (props.length) found.push(`${name(el)} [${props.join(",")}]`);
    }
    return [...new Set(found)];
  }, probe);
}

/** Elements whose own text, background, border or outline computes to `rgb(255, 74, 43)`, as `parent > element [properties]`. */
export const accentElements = (page: Page) => listElements(page, "accent");

/** Elements with own text in the dim token `rgb(85, 83, 79)`. */
export const dimTextElements = (page: Page) => listElements(page, "dim");

/** Elements with a non-zero border radius on any corner. */
export const roundedElements = (page: Page) => listElements(page, "radius");
