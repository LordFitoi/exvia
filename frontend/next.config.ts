import type { NextConfig } from "next";

const DEFAULT_BACKEND_URL = "http://localhost:8000";
const BACKEND_URL = process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL;
const BACKEND_URL_PREFIXES = ["api", "admin"];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Django routes end in "/"; Next only forwards it when trailingSlash is on.
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
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
