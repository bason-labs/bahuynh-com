// Developer script (not run by CI or `pnpm build`): writes public/og/vi.png and public/og/en.png from
// the built site. Run `pnpm build` first, then `node scripts/make-og.mjs`, then `pnpm build` again so
// out/og/ holds the new files. REQ-LAND-036.AC-3.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const port = 4175;
const base = `http://localhost:${port}`;
mkdirSync("public/og", { recursive: true });

const server = spawn("node", ["scripts/serve-out.mjs", "--port", String(port)], { stdio: "inherit" });
try {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const browser = await chromium.launch({
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  for (const [lang, path] of [["vi", "/"], ["en", "/en/"]]) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.goto(base + path, { waitUntil: "load" });
    await page.waitForSelector('[data-gl="3d"]', { timeout: 60_000 });
    await page.addStyleTag({
      content: 'nav, .grain, [data-scroll-rail] { display: none !important; }',
    });
    // Let the mic settle on its first frames before the shot.
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `public/og/${lang}.png` });
    console.log(`make-og: public/og/${lang}.png`);
    await page.close();
  }
  await browser.close();
} finally {
  server.kill();
}
