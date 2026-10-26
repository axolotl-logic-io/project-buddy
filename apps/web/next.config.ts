import type { NextConfig } from "next";

// The redirects next.config answers with before the proxy and the pages.
type Redirects = Awaited<ReturnType<NonNullable<NextConfig["redirects"]>>>;

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The buddies' pages were at /personas until #115; old links and bookmarks
  // still reach them.
  redirects(): Redirects {
    return [
      { source: "/personas", destination: "/buddies", permanent: true },
      {
        source: "/personas/:id",
        destination: "/buddies/:id",
        permanent: true,
      },
    ];
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
