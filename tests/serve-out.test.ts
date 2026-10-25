import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("serve-out", () => {
  it("exits non-zero with 'run pnpm build first' when out/ is missing", () => {
    const empty = mkdtempSync(join(tmpdir(), "serve-out-"));
    const run = spawnSync(process.execPath, [resolve("scripts/serve-out.mjs"), "--port", "0"], {
      cwd: empty,
      encoding: "utf8",
    });
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("run pnpm build first");
  });
});
