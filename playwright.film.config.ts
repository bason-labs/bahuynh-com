import { defineConfig, devices } from "@playwright/test";

// The film specs run against out-film/ (pnpm build:film-fixture), a build with a film configured.
export default defineConfig({
  testDir: "e2e",
  testMatch: "film-config.spec.ts",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:4174" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm preview:film",
    url: "http://localhost:4174",
    reuseExistingServer: !process.env.CI,
  },
});
