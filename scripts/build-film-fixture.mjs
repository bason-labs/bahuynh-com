import { spawnSync } from "node:child_process";
import { cpSync } from "node:fs";

// Builds out-film/: the site with a film configured (e2e/fixtures/film.config.ts) plus the fixture
// files at /film/. Only the e2e specs use it; it is never deployed.
const build = spawnSync("pnpm", ["exec", "next", "build"], {
  stdio: "inherit",
  env: { ...process.env, FILM_FIXTURE: "1" },
});
if (build.status !== 0) process.exit(build.status ?? 1);
cpSync("e2e/fixtures/film", "out-film/film", { recursive: true });
console.log("build-film-fixture: ok out-film/");
