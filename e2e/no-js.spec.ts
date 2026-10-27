import { expect, test } from "./support";
import { gotoPage } from "./support";

test.use({ javaScriptEnabled: false });

for (const [lang, h1] of [
  ["vi", "Karaoke cho cả nhóm."],
  ["en", "Karaoke for the whole group."],
] as const) {
  test(`h1 renders without JavaScript on ${lang}`, async ({ page }) => {
    await gotoPage(page, lang);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1);
  });
}

test("the CSS mic and the hero copy are visible without JavaScript", async ({ page }) => {
  await gotoPage(page, "vi");
  const hero = page.locator("header#top");
  const mic = hero.locator("[data-mic]");
  await expect(mic).toBeVisible();
  expect(await mic.boundingBox()).toMatchObject({ width: 120, height: 330 });
  await expect(hero.getByRole("link", { name: "Mở phòng hát" })).toBeVisible();
  await expect(hero.getByText("Kéo để xoay · chạm để bật micro")).toBeVisible();
});

for (const [lang, parts] of [
  ["vi", ["Một đêm hát, 36 giây.", "Từ lúc bật TV đến lúc cả phòng vỗ tay.", "Đêm nay hát gì?", "Bản dựng nháp", "REC", "← → chương", "0:00Bật TV", "0:30Điểm số"]],
  ["en", ["One night of singing, 36 seconds.", "From switching on the TV to the whole room clapping.", "What are we singing tonight?", "Rough cut", "REC", "← → chapters", "0:00TV on", "0:30Score"]],
] as const) {
  test(`the film chapter is present without JavaScript on ${lang}`, async ({ page }) => {
    await gotoPage(page, lang);
    const section = page.locator("section#xem");
    for (const part of parts) {
      await expect(section).toContainText(part);
    }
    await expect(section.getByRole("button")).toHaveCount(8);
  });
}
