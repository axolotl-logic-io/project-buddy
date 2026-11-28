import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // `next dev` would otherwise write its Next.js rules into apps/web/AGENTS.md
  // whenever it detects an AI coding agent. The agent rules live in the root
  // AGENTS.md instead.
  agentRules: false,
  experimental: {
    // Two root layouts, for streamed and complete pages, leave no single
    // layout for an unmatched address: global-not-found.tsx renders it.
    globalNotFound: true,
    // Next's default, "warning", checks every page in development for an
    // instant navigation. "manual-warning" checks only segments that set
    // `instant` themselves, which is how Next's docs say to pin the level.
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
