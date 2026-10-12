import type { MetadataRoute } from "next";

const BRAND_GREEN = "#00a76f";
const SPLASH_BACKGROUND = "#ffffff";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Exvia",
    short_name: "Exvia",
    description: "Clans, rides and rider profiles.",
    lang: "en",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["fullscreen", "standalone"],
    orientation: "portrait",
    background_color: SPLASH_BACKGROUND,
    theme_color: BRAND_GREEN,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
