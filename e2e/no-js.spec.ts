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
