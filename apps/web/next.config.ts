import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Keep saved links from earlier names working. Temporary redirects allow
  // a rollback to a build that still serves either earlier route.
  redirects: async () => [
    { source: "/guild", destination: "/constructs", permanent: false },
    {
      source: "/guild/:constructId",
      destination: "/constructs/:constructId",
      permanent: false,
    },
    { source: "/buddies", destination: "/constructs", permanent: false },
    {
      source: "/buddies/:constructId",
      destination: "/constructs/:constructId",
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
