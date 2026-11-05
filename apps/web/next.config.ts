import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // The Guild was first called Buddies, at /buddies. Its old links, saved or
  // shared, still open the Guild and its constructs. They are temporary
  // redirects, so no browser caches them past a rollback to a build that
  // still serves /buddies.
  redirects: async () => [
    { source: "/buddies", destination: "/guild", permanent: false },
    {
      source: "/buddies/:constructId",
      destination: "/guild/:constructId",
      permanent: false,
    },
  ],
  partialPrefetching: true,
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
