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
