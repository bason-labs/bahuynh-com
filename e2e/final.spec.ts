import type { Page } from "@playwright/test";
import { expect, gotoPage, test, VIEWPORTS } from "./support";

const copy = {
  vi: {
    kicker: "/ Bắt đầu",
    h2: "Đêm nay hát gì?",
    accent: "hát gì?",
    lede: "Mở BS Kara trên TV, gửi mã cho cả nhóm, và cầm micro lên.",
    open: "Mở phòng hát",
    film: "Xem lại video",
    play: "Phát",
    playText: "▶ Phát",
  },
  en: {
    kicker: "/ Start",
    h2: "What are we singing tonight?",
    accent: "singing tonight?",
    lede: "Open BS Kara on the TV, send the code to the group, and pick up the mic.",
    open: "Open a room",
    film: "Watch again",
    play: "Play",
    playText: "▶ Play",
  },
} as const;

const section = (page: Page) => page.locator("section#batdau");
const centreX = (box: { x: number; width: number }) => box.x + box.width / 2;

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];

  test(`chapter 05 text and buttons on ${lang}`, async ({ page }) => {
    await gotoPage(page, lang);
    const s = section(page);
    await expect(s.locator("b")).toHaveText("05");
    await expect(s.getByText(c.kicker, { exact: true })).toBeVisible();
    await expect(s.getByRole("heading", { level: 2 })).toHaveText(c.h2);
    await expect(s.locator("h2 em")).toHaveText(c.accent);
    await expect(s.getByText(c.lede, { exact: true })).toBeVisible();
    const open = s.getByRole("link", { name: c.open, exact: true });
    const film = s.getByRole("link", { name: c.film, exact: true });
    await expect(open).toHaveClass(/solid/);
    await expect(open).toHaveCSS("background-color", "rgb(243, 239, 232)");
    await expect(film).not.toHaveClass(/solid/);
    await expect(film).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(film).toHaveAttribute("href", "#xem");
  });

  test(`the heading is 144 px and everything is centred at 1440 on ${lang}`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    const s = section(page);
    await expect(s.locator("h2")).toHaveCSS("font-size", "144px");
    await expect(s.locator("h2")).toHaveCSS("text-align", "center");
    const sBox = (await s.boundingBox())!;
    const mid = centreX(sBox);
    const boxes = await s.evaluate((el) => {
      const rect = (e: Element) => {
        const r = e.getBoundingClientRect();
        return { x: r.x, width: r.width };
      };
      const kicker = el.querySelector("b")!.parentElement!;
      const [first, last] = [kicker.firstElementChild!, kicker.lastElementChild!];
      const a = first.getBoundingClientRect();
      const z = last.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(el.querySelector("h2")!);
      const lines = [...range.getClientRects()].map((r) => ({ x: r.x, width: r.width }));
      return {
        kicker: { x: a.x, width: z.right - a.x },
        lines,
        lede: rect(el.querySelector("p")!),
        buttons: [...el.querySelectorAll("a")].map(rect),
      };
    });
    expect(Math.abs(centreX(boxes.kicker) - mid)).toBeLessThan(2);
    expect(Math.abs(centreX(boxes.lede) - mid)).toBeLessThan(2);
    const left = Math.min(...boxes.buttons.map((b) => b.x));
    const right = Math.max(...boxes.buttons.map((b) => b.x + b.width));
    expect(Math.abs((left + right) / 2 - mid)).toBeLessThan(2);
    const l = Math.min(...boxes.lines.map((b) => b.x));
    const r = Math.max(...boxes.lines.map((b) => b.x + b.width));
    expect(Math.abs((l + r) / 2 - mid)).toBeLessThan(2);
  });

  test(`a warm light falls from the top centre on ${lang}`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPage(page, lang);
    const light = await section(page).evaluate((el) => {
      const style = getComputedStyle(el, "::before");
      return { width: style.width, image: style.backgroundImage, position: style.position, top: style.top };
    });
    expect(light.width).toBe("700px");
    expect(light.image).toContain("rgba(255, 233, 196, 0.12)");
    expect(light.image).toContain("rgba(0, 0, 0, 0) 70%");
    expect(light.position).toBe("absolute");
    expect(light.top).toBe("0px");
  });

  test(`the open button goes to the app in the same tab on ${lang}`, async ({ page }) => {
    await gotoPage(page, lang);
    const open = section(page).getByRole("link", { name: c.open, exact: true });
    await expect(open).toHaveAttribute("href", "https://kara.bahuynh.com");
    expect(await open.getAttribute("target")).toBeNull();
  });

  test(`nothing is requested from the app host before a link is used on ${lang}`, async ({ page }) => {
    const hosts: string[] = [];
    page.on("request", (req) => hosts.push(new URL(req.url()).hostname));
    await gotoPage(page, lang);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await expect(section(page)).toBeInViewport();
    await page.waitForLoadState("networkidle");
    expect(hosts.length).toBeGreaterThan(0);
    expect(hosts.filter((h) => h.endsWith("bahuynh.com"))).toEqual([]);
    const hints = await page.locator("link[rel=preconnect], link[rel=prefetch], link[rel=dns-prefetch], script[src*='kara.bahuynh.com']").count();
    expect(hints).toBe(0);
  });

  test(`"${c.film}" scrolls to the film and leaves it paused at 20 s on ${lang}`, async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.clock.install();
    await gotoPage(page, lang);
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1_000); // page time: it may be ahead after a slow load
    const frame = page.locator("[data-film]");
    const timecode = page.locator("[data-timecode]");
    await frame.getByRole("button", { name: c.play, exact: true }).click();
    await page.locator("section#xem [data-film] + div button").nth(3).click();
    await page.clock.runFor(2_100);
    await frame.getByRole("button", { name: lang === "vi" ? "Dừng" : "Pause", exact: true }).click();
    await expect(timecode).toHaveText("0:00:20");
    await section(page).scrollIntoViewIfNeeded();
    await expect(section(page)).toBeInViewport();
    await section(page).getByRole("link", { name: c.film, exact: true }).click();
    await expect
      // a smooth scroll of ~4000 px: give a loaded machine time to finish it
      .poll(async () => (await page.locator("section#xem").boundingBox())!.y, { timeout: 20_000 })
      .toBeGreaterThanOrEqual(56);
    await expect.poll(() => page.evaluate(() => scrollY), { timeout: 20_000 }).toBeLessThan(2500);
    await expect(page.locator("section#xem")).toBeInViewport();
    await expect(timecode).toHaveText("0:00:20");
    await expect(frame).toHaveAttribute("data-running", "false");
    await expect(frame.getByRole("button", { name: c.play, exact: true })).toHaveText(c.playText);
  });
}
