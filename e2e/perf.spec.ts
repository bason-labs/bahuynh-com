import { expect, test, type Browser, type BrowserContext } from "@playwright/test";
import { micChunkFile } from "./mic";

// REQ-LAND-045 and REQ-LAND-046.AC-1. Throttled timing is noisy, so CI runs this file as a `warn` step
// (`pnpm e2e:perf`). Lab setup (Q-0016-16): 375x812, 4x CPU slowdown, 150 ms RTT, 1.6 Mbps down, cold cache.
const RUNS = 5;
const SETTLE_MS = 10_000;
const LCP_MAX = 2_500;
const CLS_MAX = 0.1;
const MIC_DELTA_MAX = 100;

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function throttle(context: BrowserContext, page: Parameters<BrowserContext["newCDPSession"]>[0]) {
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
}

/** One cold load of `path`, left alone for `settle` ms; returns the largest contentful paint and the layout shift. */
async function load(browser: Browser, baseURL: string, path: string, { settle, blockMic }: { settle: number; blockMic: boolean }) {
  const context = await browser.newContext({ baseURL, viewport: { width: 375, height: 812 } });
  try {
    const page = await context.newPage();
    await throttle(context, page);
    if (blockMic) await page.route(`**/${micChunkFile()}`, (route) => route.abort());
    await page.addInitScript(() => {
      const perf = { lcp: 0, cls: 0 };
      (window as unknown as { __perf: typeof perf }).__perf = perf;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) perf.lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { hadRecentInput: boolean; value: number }[]) {
          if (!e.hadRecentInput) perf.cls += e.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(path, { waitUntil: "load" });
    await page.waitForTimeout(settle);
    return await page.evaluate(() => (window as unknown as { __perf: { lcp: number; cls: number } }).__perf);
  } finally {
    await context.close();
  }
}

async function runs(browser: Browser, baseURL: string, path: string, opts: { settle: number; blockMic: boolean }) {
  const results = [];
  for (let i = 0; i < RUNS; i++) results.push(await load(browser, baseURL, path, opts));
  return { lcp: results.map((r) => r.lcp), cls: results.map((r) => r.cls) };
}

test.describe.configure({ timeout: 240_000 });

test.beforeAll(async ({ browser }, info) => {
  // The first page a fresh browser renders pays a one-off start-up cost; render one in a throwaway context.
  const context = await browser.newContext();
  await (await context.newPage()).goto(`${info.project.use.baseURL}/`);
  await context.close();
});

for (const path of ["/", "/en/"]) {
  test(`${path}: median LCP at most 2.5 s and median CLS at most 0.1 over ${RUNS} cold loads`, async ({ browser }, info) => {
    const baseURL = info.project.use.baseURL!;
    const { lcp, cls } = await runs(browser, baseURL, path, { settle: SETTLE_MS, blockMic: false });
    console.log(`perf ${path} LCP median ${Math.round(median(lcp))} ms (${lcp.map(Math.round)}), CLS median ${median(cls).toFixed(3)} (${cls.map((c) => c.toFixed(3))})`);
    expect.soft(median(lcp), `${path} median LCP`).toBeLessThanOrEqual(LCP_MAX);
    expect.soft(median(cls), `${path} median CLS`).toBeLessThanOrEqual(CLS_MAX);

    if (path !== "/") return;
    const blocked = await runs(browser, baseURL, path, { settle: 3_000, blockMic: true });
    const delta = Math.abs(median(blocked.lcp) - median(lcp));
    console.log(`perf ${path} LCP median with the 3D chunk blocked ${Math.round(median(blocked.lcp))} ms (${blocked.lcp.map(Math.round)}), change ${Math.round(delta)} ms`);
    expect.soft(delta, `${path} LCP change with the 3D chunk blocked`).toBeLessThanOrEqual(MIC_DELTA_MAX);
  });
}
