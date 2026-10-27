import type { Page } from "@playwright/test";
import { expect, gotoPage, test, VIEWPORTS } from "./support";

const FG = "rgb(243, 239, 232)";
const MUTED = "rgb(141, 139, 135)";
const AIR = "rgb(255, 74, 43)";

const copy = {
  vi: {
    kicker: "/ Tính năng",
    h2: "Mọi thứ một đêm hát cần.",
    accent: "đêm hát cần.",
    lede: "Không có máy karaoke, không có remote bị mất. Chỉ có TV, điện thoại và bạn bè.",
    cards: [
      ["MC AI", "01", "“Bài tiếp theo dành cho Lan, người vừa trốn hát cả tối…”Giọng đọc tiếng Việt", "MC dẫn từng bài", "Lời giới thiệu viết riêng cho người hát và bài hát, đọc bằng giọng Việt tự nhiên."],
      ["Điện thoại", "02", "", "Điện thoại là điều khiển", "Quét mã là vào phòng. Tìm bài, thêm vào hàng chờ, thả cảm xúc lên TV."],
      ["Chấm điểm", "03", "98Xuất sắc", "Điểm số cho vui", "Hết bài là có điểm và danh hiệu. Không ai bị chê, ai cũng muốn hát thêm."],
      ["Hát tiếp", "04", "Mây Lang Thang+Về Nhà Thôi+Cụng Ly Nào+", "Gợi ý bài tiếp", "Hết ý tưởng? Gợi ý các bài liên quan đến bài đang phát, chạm một lần để thêm."],
      ["Cảm xúc", "05", "", "Cả phòng cùng phản ứng", "Vỗ tay, khen, đòi hát lại. Cảm xúc bay lên TV ngay khi người hát đang hát."],
      ["Màn hình", "06", "TV · PROJECTOR · LAPTOP", "TV nào cũng được", "Smart TV, Android box, máy chiếu. Video nét, tự xử lý máy yếu."],
    ],
  },
  en: {
    kicker: "/ Features",
    h2: "Everything a night out needs.",
    accent: "night out needs.",
    lede: "No karaoke machine, no lost remote. Just a TV, phones and friends.",
    cards: [
      ["AI host", "01", "“Next up is Lan, who has been hiding from the mic all night…”Vietnamese voice", "A host for every song", "An introduction written for the singer and the song, read in a natural Vietnamese voice."],
      ["Phone", "02", "", "Your phone is the remote", "Scan to join. Search, add to the queue, send reactions to the TV."],
      ["Score", "03", "98Brilliant", "A score, for fun", "Every song ends with a score and a title. Nobody gets roasted, everyone wants another go."],
      ["Up next", "04", "Mây Lang Thang+Về Nhà Thôi+Cụng Ly Nào+", "What to sing next", "Out of ideas? Songs related to the one playing, one tap to add."],
      ["Reactions", "05", "", "The whole room reacts", "Clap, cheer, call for an encore. Reactions fly onto the TV while the singer sings."],
      ["Screens", "06", "TV · PROJECTOR · LAPTOP", "Any TV works", "Smart TV, Android box, projector. Sharp video, and it copes with slow devices."],
    ],
  },
} as const;

const section = (page: Page) => page.locator("section#tinhnang");
const cards = (page: Page) => section(page).locator("article");

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];

  test(`the features heading and lede on ${lang}`, async ({ page }) => {
    await gotoPage(page, lang);
    await expect(section(page).locator("b").first()).toHaveText("04");
    await expect(section(page).getByText(c.kicker, { exact: true })).toBeVisible();
    await expect(section(page).getByRole("heading", { level: 2 })).toHaveText(c.h2);
    await expect(section(page).locator("h2 em")).toHaveText(c.accent);
    await expect(section(page).getByText(c.lede, { exact: true })).toBeVisible();
  });

  test(`the six cards in order on ${lang}`, async ({ page }) => {
    await gotoPage(page, lang);
    await expect(cards(page)).toHaveCount(6);
    for (let i = 0; i < 6; i++) {
      const [label, number, visual, title, text] = c.cards[i];
      const card = cards(page).nth(i);
      await expect(card.locator("> div").nth(0).locator("span")).toHaveText([label, number]);
      await expect(card.locator("> div").nth(1)).toHaveText(visual);
      await expect(card.getByRole("heading", { level: 3 })).toHaveText(title);
      await expect(card.locator("p")).toHaveText(text);
      expect(await card.locator("h3").evaluate((e) => getComputedStyle(e).color)).toBe(FG);
      expect(await card.locator("p").evaluate((e) => getComputedStyle(e).color)).toBe(MUTED);
    }
  });

  test(`the dim token is not used for text in the cards on ${lang}`, async ({ page }) => {
    await gotoPage(page, lang);
    const colours = await cards(page).evaluateAll((els) =>
      els.flatMap((el) =>
        [...el.querySelectorAll("span, small, sup, li, h3, p")]
          .filter((n) => [...n.childNodes].some((c) => c.nodeType === 3 && (c.textContent ?? "").trim() !== ""))
          .map((n) => getComputedStyle(n).color),
      ),
    );
    expect(colours.length).toBeGreaterThan(10);
    for (const colour of colours) expect(colour).not.toBe("rgb(85, 83, 79)");
    await expect(cards(page).nth(0).locator("small")).toHaveCSS("color", MUTED);
    await expect(cards(page).nth(3).locator("li > span:last-child").first()).toHaveCSS("color", MUTED);
    await expect(cards(page).nth(2).locator("sup")).toHaveCSS("color", AIR);
  });

  test(`no card is a link or a tab stop and the decorative visuals are hidden on ${lang}`, async ({ page }) => {
    await gotoPage(page, lang);
    const grid = section(page).locator("article").first().locator("..");
    await expect(grid.locator("a, button, [tabindex]")).toHaveCount(0);
    const shapes = cards(page).nth(1).locator("> div").nth(1).locator("> div");
    await expect(shapes).toHaveCount(2);
    for (let i = 0; i < 2; i++) await expect(shapes.nth(i)).toHaveAttribute("aria-hidden", "true");
    await expect(cards(page).nth(4).locator("[data-bars]")).toHaveAttribute("aria-hidden", "true");
    await section(page).getByRole("heading", { level: 2 }).evaluate((el) => {
      const h = el.closest("div")!.parentElement!.parentElement!;
      (h as HTMLElement).tabIndex = -1;
      (h as HTMLElement).focus();
    });
    for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest("section#tinhnang article"))).toBe(false);
  });
}

test("the Vietnamese song titles carry lang=vi on the English page", async ({ page }) => {
  await gotoPage(page, "en");
  const songs = cards(page).nth(3).locator("li > span:first-child");
  await expect(songs).toHaveText(["Mây Lang Thang", "Về Nhà Thôi", "Cụng Ly Nào"]);
  for (let i = 0; i < 3; i++) await expect(songs.nth(i)).toHaveAttribute("lang", "vi");
});

test("at 1440 the grid has two columns of three rows with hairlines, square cards and tall visuals", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop);
  await gotoPage(page, "vi");
  const boxes = await cards(page).evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y + scrollY) };
    }),
  );
  expect(new Set(boxes.map((b) => b.x)).size).toBe(2);
  expect(new Set(boxes.map((b) => b.y)).size).toBe(3);
  expect(boxes.map((b) => b.x > boxes[0].x)).toEqual([false, true, false, true, false, true]);
  const card = cards(page).first();
  await expect(card).toHaveCSS("border-radius", "0px");
  await expect(card).toHaveCSS("border-right-width", "1px");
  await expect(card).toHaveCSS("border-bottom-width", "1px");
  await expect(cards(page).nth(1)).toHaveCSS("border-right-width", "0px");
  await expect(cards(page).nth(5)).toHaveCSS("border-bottom-width", "0px");
  await expect(cards(page).nth(5).locator("> div").nth(1)).toHaveCSS("height", "260px");
  await expect(cards(page).nth(2).locator("> div").nth(1).locator("> div")).toHaveCSS("font-size", "150px");
});

for (const [name, viewport, vis, score] of [
  ["768x1024", VIEWPORTS.tablet, "260px", "150px"],
  ["375x812", VIEWPORTS.mobile, "210px", "110px"],
] as const) {
  test(`at ${name} the grid is one column in order with ${vis} visuals`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await gotoPage(page, "vi");
    const boxes = await cards(page).evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x), y: r.y + scrollY };
      }),
    );
    expect(new Set(boxes.map((b) => b.x)).size).toBe(1);
    for (let i = 1; i < 6; i++) expect(boxes[i].y).toBeGreaterThan(boxes[i - 1].y);
    await expect(cards(page).nth(4)).toHaveCSS("border-bottom-width", "1px");
    await expect(cards(page).nth(5)).toHaveCSS("border-bottom-width", "0px");
    await expect(cards(page).nth(0)).toHaveCSS("border-right-width", "0px");
    await expect(cards(page).nth(0).locator("> div").nth(1)).toHaveCSS("height", vis);
    await expect(cards(page).nth(2).locator("> div").nth(1).locator("> div")).toHaveCSS("font-size", score);
  });
}

test("the 28 bars are staggered, run 1.1 s alternate and move between 12 % and 100 % of 120 px", async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop);
  await gotoPage(page, "vi");
  const bars = cards(page).nth(4).locator("[data-bars] i");
  await expect(bars).toHaveCount(28);
  await expect(bars.first()).toHaveCSS("animation-duration", "1.1s");
  await expect(bars.first()).toHaveCSS("animation-direction", "alternate");
  await expect(bars.first()).toHaveCSS("animation-iteration-count", "infinite");
  const delays = await bars.evaluateAll((els) => els.map((el) => getComputedStyle(el).animationDelay));
  expect(new Set(delays).size).toBeGreaterThan(10);
  // the same markup on a second load: the stagger is a formula, not Math.random()
  await page.reload();
  expect(await bars.evaluateAll((els) => els.map((el) => getComputedStyle(el).animationDelay))).toEqual(delays);
  await expect(cards(page).nth(4).locator("[data-bars]")).toHaveCSS("height", "120px");
  const heightAt = (ms: number) =>
    bars.nth(0).evaluate((el, at) => {
      const a = el.getAnimations()[0];
      a.pause();
      a.currentTime = at;
      return getComputedStyle(el).height;
    }, ms);
  const delay = await bars.nth(0).evaluate((el) => parseFloat(getComputedStyle(el).animationDelay) * 1000);
  expect(parseFloat(await heightAt(delay))).toBeCloseTo(14.4, 0);
  expect(parseFloat(await heightAt(delay + 1100 - 1))).toBeGreaterThan(119);
});
