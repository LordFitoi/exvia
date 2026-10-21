import type { Metadata, Viewport } from "next";

import AuthProvider from "@/context/AuthProvider";
import { SITE_URL } from "@/services/siteConfig";
import PinchZoomLock from "@/components/layout/PinchZoomLock";
import ServiceWorkerRegistration from "@/components/layout/ServiceWorkerRegistration";
import "@/styles/exvia-ui/exvia-ui.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Exvia", template: "%s | Exvia" },
  description: "Clans, rides and rider profiles.",
  applicationName: "Exvia",
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, title: "Exvia", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141a21" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegistration />
        <PinchZoomLock />
      </body>
    </html>
  );
}
