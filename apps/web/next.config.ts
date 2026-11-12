import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Every page renders per request and waits for the session lookup, as
    // the root layout's `instant = false` declares (src/app/layout.tsx).
    // Next's default, "warning", still checks each page in development for
    // an instant navigation and logs the session read on every request
    // (#874). "manual-warning" checks only segments that set `instant`
    // themselves, which is how Next's docs say to pin the level.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
