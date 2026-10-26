import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";

const port = 4173;
const base = `http://localhost:${port}`;

if (!existsSync("out")) {
  console.log("perf:once skipped: run pnpm build first");
  process.exit(0);
}

const server = spawn("node", ["scripts/serve-out.mjs", "--port", String(port)], { stdio: "ignore" });
try {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const browser = await chromium.launch({
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  // The first page a fresh browser renders pays a one-off start-up cost (about 2.8 s here, whichever
  // page goes first); render the page once in a throwaway context so each measured page is equally cold.
  const warm = await browser.newContext();
  await (await warm.newPage()).goto(base + "/");
  await warm.close();
  for (const path of ["/", "/en/"]) {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.clearBrowserCache");
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await page.addInitScript(() => {
      window.__perf = { lcp: 0, cls: 0 };
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__perf.lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(base + path, { waitUntil: "load" });
    await page.waitForTimeout(1000);
    const { lcp, cls, scripts } = await page.evaluate(() => ({
      ...window.__perf,
      scripts: performance
        .getEntriesByType("resource")
        .filter((r) => r.initiatorType === "script" || r.initiatorType === "link" && r.name.endsWith(".js"))
        .map((r) => new URL(r.name).pathname),
    }));
    const jsGz = [...new Set(scripts)].reduce((n, p) => n + gzipSync(readFileSync(`out${p}`)).length, 0);
    console.log(
      `perf:once ${path} LCP ${Math.round(lcp)} ms, CLS ${cls.toFixed(3)}, first-view JS ${(jsGz / 1024).toFixed(1)} kB gz`,
    );
    await context.close();
  }
  await browser.close();
} catch (error) {
  console.log(`perf:once failed (informational): ${error instanceof Error ? error.message : error}`);
} finally {
  server.kill();
}
