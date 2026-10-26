import type { Locator, Page } from "@playwright/test";
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

const scene = {
  vi: {
    room: "Phòng 7108 · 8 người",
    count: "1.248",
    label: "Lượt thả cảm xúc tối nay",
    tap: "Chạm để thả cảm xúc",
    buttons: ["Vỗ tay", "Hay quá", "Encore", "Cháy"],
    words: ["Vỗ tay!", "Hay quá!", "Encore!", "Cháy!"],
    after: "1.254",
  },
  en: {
    room: "Room 7108 · 8 people",
    count: "1,248",
    label: "Reactions tonight",
    tap: "Tap to send a reaction",
    buttons: ["Clap", "So good", "Encore", "Fire"],
    words: ["Clap!", "So good!", "Encore!", "Fire!"],
    after: "1,254",
  },
} as const;

const sceneOf = (page: Page) => page.locator("section#cungnhau [data-scene]");
const counter = (page: Page) => sceneOf(page).locator("[data-count]");
const words = (page: Page) => sceneOf(page).locator("[data-word]");
const canvasOf = (page: Page) => sceneOf(page).locator("canvas");
const num = (text: string | null) => Number((text ?? "").replace(/[.,]/g, ""));

/** Fake clock paused after load, canvases hidden so fake time does not draw every frame. */
async function frozen(page: Page, lang: "vi" | "en") {
  await page.clock.install();
  await gotoPage(page, lang);
  await sceneOf(page).scrollIntoViewIfNeeded();
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
  await page.evaluate(() => document.querySelectorAll("canvas").forEach((c) => (c.style.display = "none")));
}

/** Makes Math.random answer `window.__random`, so each reaction's delta is chosen by the test. */
async function seedRandom(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __random: number }).__random = 0;
    Math.random = () => (window as unknown as { __random: number }).__random;
  });
}
const setRandom = (page: Page, value: number) =>
  page.evaluate((v) => ((window as unknown as { __random: number }).__random = v), value);

/** Where a word sits, as fractions of the scene. */
async function wordFraction(word: Locator) {
  return word.evaluate((el) => {
    const box = { width: el.parentElement!.clientWidth, height: el.parentElement!.clientHeight };
    const style = (el as HTMLElement).style;
    return { x: parseFloat(style.left) / box.width, y: parseFloat(style.top) / box.height };
  });
}

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

for (const lang of ["vi", "en"] as const) {
  const sc = scene[lang];
  const tapButton = (page: Page) => sceneOf(page).getByRole("button", { name: sc.tap, exact: true });

  test.describe(`together scene on ${lang}`, () => {
    test("is 702 px high at 1440x900, clamped to 480 and 720, calm, with all three phone lights", async ({ page }) => {
      for (const [height, expected] of [[900, 702], [560, 480], [1200, 720]] as const) {
        await page.setViewportSize({ width: 1440, height });
        await gotoPage(page, lang);
        expect((await sceneOf(page).boundingBox())!.height).toBe(expected);
      }
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      await expect(canvasOf(page)).toHaveAttribute("data-heat", "0.00");
      await expect(canvasOf(page)).toHaveAttribute("data-sparks", "0");
      const found = await canvasOf(page).evaluate((canvas: HTMLCanvasElement) => {
        const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
        const near = (i: number, rgb: number[]) => rgb.every((v, k) => Math.abs(data[i + k] - v) < 30);
        const hits = { red: 0, warm: 0, cool: 0 };
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 250) continue;
          if (near(i, [255, 74, 43])) hits.red++;
          else if (near(i, [255, 233, 196])) hits.warm++;
          else if (near(i, [191, 230, 255])) hits.cool++;
        }
        return hits;
      });
      expect(found.red).toBeGreaterThan(20);
      expect(found.warm).toBeGreaterThan(20);
      expect(found.cool).toBeGreaterThan(20);
      // red glow rising from the bottom: the bottom edge carries more red than the top
      const wash = await canvasOf(page).evaluate((canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext("2d")!;
        const row = (y: number) => ctx.getImageData(0, y, 4, 1).data[0] + ctx.getImageData(0, y, 4, 1).data[3];
        return { top: row(2), bottom: row(canvas.height - 2) };
      });
      expect(wash.bottom).toBeGreaterThan(wash.top);
    });

    test("overlay: room label, counter above its label, four buttons at the bottom centre", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      const box = (await sceneOf(page).boundingBox())!;
      const room = (await sceneOf(page).getByText(sc.room, { exact: true }).boundingBox())!;
      expect(room.x - box.x).toBeLessThan(box.width / 4);
      expect(room.y - box.y).toBeLessThan(80);
      await expect(counter(page)).toHaveText(sc.count);
      const count = (await counter(page).boundingBox())!;
      const label = (await sceneOf(page).getByText(sc.label, { exact: true }).boundingBox())!;
      expect(count.x + count.width).toBeGreaterThan(box.x + box.width * 0.75);
      expect(label.y).toBeGreaterThan(count.y + count.height - 1);
      let centre = 0;
      for (const name of sc.buttons) {
        const b = sceneOf(page).getByRole("button", { name, exact: true });
        await expect(b).toBeVisible();
        const bb = (await b.boundingBox())!;
        expect(bb.height).toBeGreaterThanOrEqual(44);
        expect(bb.y + bb.height).toBeGreaterThan(box.y + box.height - 40);
        centre += bb.x + bb.width / 2;
      }
      expect(Math.abs(centre / 4 - (box.x + box.width / 2))).toBeLessThan(40);
    });

    test("at 375 the room label and the counter stack, both left-aligned", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoPage(page, lang);
      const room = (await sceneOf(page).getByText(sc.room, { exact: true }).boundingBox())!;
      const count = (await counter(page).boundingBox())!;
      const label = (await sceneOf(page).getByText(sc.label, { exact: true }).boundingBox())!;
      expect(count.y).toBeGreaterThanOrEqual(room.y + room.height);
      expect(Math.abs(count.x - room.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(label.x - room.x)).toBeLessThanOrEqual(1);
      await expect(counter(page).locator("..")).toHaveCSS("text-align", "left");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test("a click away from the buttons bursts 26 sparks, floats one word 180 px and raises the counter by 1 to 3", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await frozen(page, lang);
      await sceneOf(page).click({ position: { x: 300, y: 200 } });
      await expect(canvasOf(page)).toHaveAttribute("data-sparks", "26");
      await expect(words(page)).toHaveCount(1);
      expect(sc.words as readonly string[]).toContain(await words(page).textContent());
      const at = await words(page).evaluate((el) => ({ x: parseFloat(el.style.left), y: parseFloat(el.style.top) }));
      expect(Math.abs(at.x - 300)).toBeLessThan(1);
      expect(Math.abs(at.y - 200)).toBeLessThan(1);
      await expect(words(page)).toHaveCSS("animation-duration", "2.2s");
      await expect(words(page)).toHaveCSS("animation-timing-function", "ease-out");
      await words(page).evaluate((el) => el.getAnimations().forEach((a) => a.finish()));
      await expect(words(page)).toHaveCSS("opacity", "0");
      const ty = await words(page).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
      expect(ty).toBe(-180);
      const delta = num(await counter(page).textContent()) - 1248;
      expect([1, 2, 3]).toContain(delta);
      await page.clock.runFor(2299);
      await expect(words(page)).toHaveCount(1);
      await page.clock.runFor(2);
      await expect(words(page)).toHaveCount(0);
    });

    test("the button for a word shows that word at a point inside 20-80 % by 35-65 % and reacts once", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await frozen(page, lang);
      await sceneOf(page).getByRole("button", { name: sc.buttons[1], exact: true }).click();
      await expect(words(page)).toHaveCount(1);
      await expect(words(page)).toHaveText(sc.words[1]);
      const f = await wordFraction(words(page));
      expect(f.x).toBeGreaterThanOrEqual(0.2);
      expect(f.x).toBeLessThanOrEqual(0.8);
      expect(f.y).toBeGreaterThanOrEqual(0.35);
      expect(f.y).toBeLessThanOrEqual(0.65);
      await expect(canvasOf(page)).toHaveAttribute("data-sparks", "26");
      const delta = num(await counter(page).textContent()) - 1248;
      expect([1, 2, 3]).toContain(delta);
    });

    test("three reactions adding 1, 2 and 3 read the localised total", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await seedRandom(page);
      await frozen(page, lang);
      for (const [random, shown] of [[0, 1249], [0.5, 1251], [0.99, 1254]] as const) {
        await setRandom(page, random);
        await tapButton(page).click({ position: { x: 300, y: 200 } });
        expect(num(await counter(page).textContent())).toBe(shown);
      }
      await expect(counter(page)).toHaveText(sc.after);
    });

    test("ten clicks make ten words, ten bursts and 10 to 30 on the counter, with no cap", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await frozen(page, lang);
      for (let i = 0; i < 10; i++) await sceneOf(page).click({ position: { x: 200 + i * 40, y: 200 } });
      await expect(words(page)).toHaveCount(10);
      await expect(canvasOf(page)).toHaveAttribute("data-sparks", "260");
      const total = num(await counter(page).textContent());
      expect(total).toBeGreaterThanOrEqual(1258);
      expect(total).toBeLessThanOrEqual(1278);
    });

    test("a reload reads the start value; nothing is stored or sent", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await seedRandom(page);
      await gotoPage(page, lang);
      await page.waitForLoadState("networkidle");
      const requests: string[] = [];
      page.on("request", (r) => requests.push(r.url()));
      const stored = () =>
        page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }, document.cookie]));
      const before = await stored();
      await setRandom(page, 0.99);
      for (let i = 0; i < 20; i++) await sceneOf(page).getByRole("button", { name: sc.buttons[0], exact: true }).click();
      expect(num(await counter(page).textContent())).toBeGreaterThanOrEqual(1300);
      expect(await stored()).toBe(before);
      expect(requests).toEqual([]);
      await gotoPage(page, lang);
      await expect(counter(page)).toHaveText(sc.count);
    });

    test("the counter is a polite live region and the controls are separate buttons", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      await expect(counter(page)).toHaveAttribute("aria-live", "polite");
      await sceneOf(page).click({ position: { x: 300, y: 200 } });
      const shown = await counter(page).textContent();
      expect(num(shown)).toBeGreaterThan(1248);
      await expect(counter(page)).toHaveText(shown!);
      await expect(tapButton(page)).toHaveCount(1);
      expect(await tapButton(page).locator("button, a, [role=button]").count()).toBe(0);
      for (const name of sc.buttons) {
        const inside = await sceneOf(page)
          .getByRole("button", { name, exact: true })
          .evaluate((b, tap) => document.querySelector(`button[aria-label="${tap}"]`)!.contains(b), sc.tap);
        expect(inside).toBe(false);
      }
      await expect(canvasOf(page)).toHaveAttribute("aria-hidden", "true");
      await expect(words(page).first()).toHaveAttribute("aria-hidden", "true");
      await expect(page.locator("section#cungnhau [data-scene] [role=button]")).toHaveCount(0);
    });
  });
}

for (const lang of ["vi", "en"] as const) {
  const sc = scene[lang];
  const react = (page: Page, times = 1) =>
    (async () => {
      for (let i = 0; i < times; i++) await sceneOf(page).getByRole("button", { name: sc.buttons[0], exact: true }).click();
    })();
  const heatOf = async (page: Page) => Number(await sceneOf(page).getAttribute("data-heat"));

  test.describe(`together crowd heat on ${lang}`, () => {
    test("is calm at 0.00 on load", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoPage(page, lang);
      await expect(sceneOf(page)).toHaveAttribute("data-heat", "0.00");
    });

    test("each reaction raises it by 0.3: 0.30 after one, 0.60 after two", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await frozen(page, lang);
      await react(page);
      expect(await heatOf(page)).toBeCloseTo(0.3, 1);
      await react(page);
      expect(await heatOf(page)).toBeCloseTo(0.6, 1);
    });

    test("four reactions within 0.2 s make it 1.00, not 1.2, and five stay there", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await frozen(page, lang);
      await react(page, 4);
      await expect(sceneOf(page)).toHaveAttribute("data-heat", "1.00");
      await react(page);
      await expect(sceneOf(page)).toHaveAttribute("data-heat", "1.00");
    });

    test("from 1.00 it falls to 0.50 in 2.1 s and to 0.00 by 4.3 s, and stays", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await frozen(page, lang);
      await react(page, 4);
      await expect(sceneOf(page)).toHaveAttribute("data-heat", "1.00");
      await page.clock.runFor(2100);
      expect(Math.abs((await heatOf(page)) - 0.5)).toBeLessThanOrEqual(0.05);
      await page.clock.runFor(2200);
      await expect(sceneOf(page)).toHaveAttribute("data-heat", "0.00");
      await page.clock.runFor(1000);
      await expect(sceneOf(page)).toHaveAttribute("data-heat", "0.00");
    });

    test("a reaction while cooling raises it again from where it is", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await frozen(page, lang);
      await react(page, 2);
      await page.clock.runFor(1000);
      const before = await heatOf(page);
      expect(before).toBeLessThan(0.6);
      await react(page);
      expect(Math.abs((await heatOf(page)) - (before + 0.3))).toBeLessThanOrEqual(0.02);
    });

    test("the crowd canvas draws with the heat: it shows the same heat and fills more of the frame when hot", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.clock.install();
      await gotoPage(page, lang);
      await sceneOf(page).scrollIntoViewIfNeeded();
      await page.clock.pauseAt(new Date(Date.now() + 60_000));
      await page.evaluate(() => document.querySelectorAll("header canvas").forEach((c) => ((c as HTMLElement).style.display = "none")));
      const ink = () =>
        canvasOf(page).evaluate((canvas: HTMLCanvasElement) => {
          const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
          let sum = 0;
          for (let i = 3; i < data.length; i += 4) sum += data[i];
          return sum / (data.length / 4);
        });
      await page.clock.runFor(100);
      const calm = await ink();
      await react(page, 4);
      await page.clock.runFor(50);
      expect(Math.abs(Number(await canvasOf(page).getAttribute("data-heat")) - (await heatOf(page)))).toBeLessThanOrEqual(0.05);
      expect(await ink()).toBeGreaterThan(calm);
    });
  });
}
