import { expect, gotoPage, test, VIEWPORTS } from "./support";

const FG = "rgb(243, 239, 232)";
const MUTED = "rgb(141, 139, 135)";

const copy = {
  vi: {
    kicker: "/ Cùng nhau",
    h2: "Không ai hát một mình.",
    accent: "một mình.",
    lede: "Người cầm micro, người chọn bài, người vỗ tay. Mỗi điện thoại trong phòng là một phần của buổi hát. Chạm vào đám đông thử xem.",
    steps: [
      ["Mở phòng trên TV", "Smart TV, máy chiếu hay laptop nối màn hình. Mở trình duyệt là xong."],
      ["Mọi người quét mã", "Mã QR trên TV. Không cần cài ứng dụng, không cần tài khoản để hát."],
      ["Thêm bài, cầm mic", "Ai cũng thêm bài từ điện thoại. MC AI giới thiệu, TV phát, cả phòng hát."],
    ],
  },
  en: {
    kicker: "/ Together",
    h2: "Nobody sings alone.",
    accent: "alone.",
    lede: "One holds the mic, one picks the songs, one claps. Every phone in the room is part of the night. Tap the crowd and see.",
    steps: [
      ["Open a room on the TV", "Smart TV, projector or a laptop on a screen. Open the browser and you're in."],
      ["Everyone scans the code", "A QR code on the TV. No app to install, no account needed to sing."],
      ["Add songs, grab the mic", "Anyone adds songs from their phone. The AI host introduces, the TV plays, the room sings."],
    ],
  },
} as const;

for (const lang of ["vi", "en"] as const) {
  const c = copy[lang];

  test(`the together heading and lede on ${lang}`, async ({ page }) => {
    await gotoPage(page, lang);
    const section = page.locator("section#cungnhau");
    await expect(section.locator("b").first()).toHaveText("03");
    await expect(section.getByText(c.kicker, { exact: true })).toBeVisible();
    await expect(section.getByRole("heading", { level: 2 })).toHaveText(c.h2);
    await expect(section.locator("h2 em")).toHaveText(c.accent);
    await expect(section.getByText(c.lede, { exact: true })).toBeVisible();
  });

  test(`the three steps on ${lang}`, async ({ page }) => {
    await gotoPage(page, lang);
    const items = page.locator("section#cungnhau ol > li");
    await expect(items).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      const item = items.nth(i);
      await expect(item.locator("b")).toHaveText(String(i + 1));
      await expect(item.getByRole("heading", { level: 3 })).toHaveText(c.steps[i][0]);
      await expect(item.locator("p")).toHaveText(c.steps[i][1]);
      expect(await item.locator("b").evaluate((e) => getComputedStyle(e).fontSize)).toBe("44px");
      expect(await item.locator("b").evaluate((e) => getComputedStyle(e).color)).toBe(MUTED);
      expect(await item.locator("h3").evaluate((e) => getComputedStyle(e).color)).toBe(FG);
      expect(await item.locator("p").evaluate((e) => getComputedStyle(e).color)).toBe(MUTED);
    }
  });
}

test("the steps sit in three columns above 900px and stack at 900px and below", async ({ page }) => {
  await gotoPage(page, "vi");
  const boxes = async () => {
    const out = [];
    for (let i = 0; i < 3; i++) out.push((await page.locator("section#cungnhau ol > li").nth(i).boundingBox())!);
    return out;
  };
  await page.setViewportSize(VIEWPORTS.desktop);
  const wide = await boxes();
  expect(Math.abs(wide[0].y - wide[1].y)).toBeLessThan(1);
  expect(Math.abs(wide[1].y - wide[2].y)).toBeLessThan(1);
  expect(wide[0].x).toBeLessThan(wide[1].x);
  expect(wide[1].x).toBeLessThan(wide[2].x);
  await page.setViewportSize({ width: 900, height: 1024 });
  const edge = await boxes();
  expect(edge[1].y).toBeGreaterThan(edge[0].y);
  await page.setViewportSize(VIEWPORTS.tablet);
  const narrow = await boxes();
  expect(Math.abs(narrow[0].x - narrow[1].x)).toBeLessThan(1);
  expect(narrow[1].y).toBeGreaterThan(narrow[0].y + narrow[0].height - 1);
  expect(narrow[2].y).toBeGreaterThan(narrow[1].y + narrow[1].height - 1);
  await page.setViewportSize({ width: 901, height: 900 });
  const just = await boxes();
  expect(Math.abs(just[0].y - just[1].y)).toBeLessThan(1);
});
