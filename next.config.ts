import type { NextConfig } from "next";

// `pnpm build:film-fixture` sets FILM_FIXTURE to build out-film/ with a configured film for the
// e2e specs (AD-2: read here, never in src/**). The default build leaves film.config.ts as it is.
const fixture = process.env.FILM_FIXTURE === "1";

const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: { globalNotFound: true },
  ...(fixture && {
    distDir: "out-film",
    turbopack: {
      resolveAlias: { "../film.config": "./e2e/fixtures/film.config.ts" },
    },
  }),
};

export default config;
