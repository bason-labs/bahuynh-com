import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";
import type { MicPose } from "../src/features/landing/mic/scene";
import { PATHS } from "./support";

export type { MicPose };

const CHUNKS = "out/_next/static/chunks";

/** The built file that holds three.js (it contains the `threeMarker` from budget.json). */
export function micChunkFile(): string {
  const { threeMarker } = JSON.parse(readFileSync("budget.json", "utf8")) as { threeMarker: string };
  const found = readdirSync(CHUNKS).filter(
    (name) => name.endsWith(".js") && readFileSync(join(CHUNKS, name), "utf8").includes(threeMarker),
  );
  if (found.length !== 1) throw new Error(`expected one three.js chunk in ${CHUNKS}, found ${found.length}`);
  return found[0];
}

export const isMicChunk = (url: string) => url.endsWith(`/${micChunkFile()}`);

/** Holds the 3D chunk until the returned function is called. */
export async function holdMicChunk(page: Page): Promise<() => void> {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route(`**/${micChunkFile()}`, async (route) => {
    await gate;
    await route.continue();
  });
  return release;
}

/** Makes `getContext("webgl"...)` return null, as a browser without WebGL does. */
export const withoutWebGl = (page: Page) =>
  page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (/webgl/i.test(type)) return null;
      return (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });

export const readPose = (page: Page) =>
  page.evaluate(() => JSON.parse(JSON.stringify(window.__micPose)) as MicPose);

export const hero = (page: Page) => page.locator("header#top");

export async function gotoLoading(page: Page, lang: keyof typeof PATHS) {
  await page.goto(PATHS[lang], { waitUntil: "domcontentloaded" });
}

/** Software WebGL is slow: allow the chunk, shader compile and first frame up to 20 s. */
export const expectGl = (page: Page, state: "3d" | "fallback" | "loading", timeout = 20_000) =>
  expect(hero(page)).toHaveAttribute("data-gl", state, { timeout });

/** Wider than the 560 px phone breakpoint but small, so software WebGL stays cheap in long tests. */
export const SMALL_DESKTOP = { width: 800, height: 600 } as const;

/**
 * Slows `requestAnimationFrame` to one frame per `interval` ms. Software WebGL draws the scene on every
 * frame and starves other tests that run at the same time; specs that count frames, not time, use this.
 */
export const throttleFrames = (page: Page, interval = 250) =>
  page.addInitScript((ms) => {
    const raf = window.requestAnimationFrame.bind(window);
    const caf = window.cancelAnimationFrame.bind(window);
    const pending = new Map<number, { timer: number; frame: number }>();
    let next = 0;
    window.requestAnimationFrame = (callback) => {
      const id = ++next;
      const entry = { timer: 0, frame: 0 };
      entry.timer = window.setTimeout(() => {
        entry.frame = raf((time) => {
          pending.delete(id);
          callback(time);
        });
      }, ms);
      pending.set(id, entry);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      const entry = pending.get(id);
      if (!entry) return;
      window.clearTimeout(entry.timer);
      caf(entry.frame);
      pending.delete(id);
    };
  }, interval);
