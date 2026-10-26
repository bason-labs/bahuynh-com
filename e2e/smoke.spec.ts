import { expect, gotoPage, test, VIEWPORTS } from "./support";

const pages = [
  { lang: "vi", h1: "Karaoke cho cả nhóm." },
  { lang: "en", h1: "Karaoke for the whole group." },
] as const;

for (const { lang, h1 } of pages) {
  for (const key of ["mobile", "desktop"] as const) {
    test(`${lang} page at ${key}`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[key]);
      await gotoPage(page, lang);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

test("fonts load for the display text", async ({ page }) => {
  await gotoPage(page, "vi");
  const checks = await page.evaluate(async () => {
    const text = "Không ai hát một mình.";
    const specs = [
      '900 16px "Archivo"',
      'italic 500 16px "Playfair Display"',
      '500 16px "JetBrains Mono"',
      '400 16px "Be Vietnam Pro"',
    ];
    const results: Record<string, boolean> = {};
    for (const spec of specs) {
      const faces = await document.fonts.load(spec, text);
      results[spec] = faces.length > 0 && document.fonts.check(spec, text);
    }
    const faces = await document.fonts.load('16px "Be Vietnam Pro"', "Ố");
    results.Ố = faces.length > 0 && document.fonts.check('16px "Be Vietnam Pro"', "Ố");
    return results;
  });
  expect(checks).toEqual({
    '900 16px "Archivo"': true,
    'italic 500 16px "Playfair Display"': true,
    '500 16px "JetBrains Mono"': true,
    '400 16px "Be Vietnam Pro"': true,
    Ố: true,
  });
});

test.describe("static host behaviour", () => {
  test("a directory gives its index.html", async ({ request }) => {
    const res = await request.get("/en/");
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('<html lang="en"');
  });

  test("a missing file gives 404.html with status 404", async ({ request }) => {
    const res = await request.get("/no-such-page/");
    expect(res.status()).toBe(404);
    expect(await res.text()).toContain('href="/en/"');
  });

  test("/en answers 301 to /en/", async ({ request }) => {
    const res = await request.get("/en", { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers().location).toBe("/en/");
  });

  test("text assets are gzipped when asked and responses set no cookie", async ({ playwright, baseURL }) => {
    const raw = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "Accept-Encoding": "gzip" } });
    const html = await raw.get("/");
    const headers = html.headers();
    expect(headers["content-encoding"]).toBe("gzip");
    expect(html.headers()["set-cookie"]).toBeUndefined();
    expect(await html.text()).toContain('<html lang="vi"');
    const missing = await raw.get("/no-such-page/");
    expect(missing.headers()["set-cookie"]).toBeUndefined();
    await raw.dispose();
  });
});

test.describe("language is never negotiated", () => {
  test("Accept-Language en-US still returns the Vietnamese page, no redirect", async ({ playwright, baseURL }) => {
    const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "Accept-Language": "en-US" } });
    const res = await ctx.get("/", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('<html lang="vi"');
    await ctx.dispose();
  });

  test("/?lang=en returns the Vietnamese page", async ({ request }) => {
    const res = await request.get("/?lang=en", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('<html lang="vi"');
  });
});
