import type { NextConfig } from "next";

const DEFAULT_BACKEND_URL = "http://localhost:8000";
const BACKEND_URL = process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL;
const BACKEND_URL_PREFIXES = ["api", "admin"];
// Matches every user agent, so metadata is always rendered in <head> instead of
// being streamed into <body> for agents missing from Next's built-in bot list
// (Instagram's in-app browser, plain fetchers, new crawlers).
const ALL_USER_AGENTS = /.*/;

const nextConfig: NextConfig = {
  cacheComponents: true,
  htmlLimitedBots: ALL_USER_AGENTS,
  partialPrefetching: true,
  // Django routes end in "/"; Next only forwards it when trailingSlash is on.
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  // The browser must always revalidate the service worker so updates reach installed apps.
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      ],
    },
  ],
  rewrites: async () => ({
    beforeFiles: [
      ...BACKEND_URL_PREFIXES.flatMap((prefix) => [
        { source: `/${prefix}`, destination: `${BACKEND_URL}/${prefix}/` },
        {
          source: `/${prefix}/:path*/`,
          destination: `${BACKEND_URL}/${prefix}/:path*/`,
        },
      ]),
      { source: "/static/:path*", destination: `${BACKEND_URL}/static/:path*` },
      { source: "/media/:path*", destination: `${BACKEND_URL}/media/:path*` },
    ],
    afterFiles: [],
    fallback: [],
  }),
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
