import type { Metadata, Viewport } from "next";

import AuthProvider from "@/context/AuthProvider";
import "@/styles/exvia-ui/exvia-ui.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Exvia", template: "%s | Exvia" },
  description: "Clans, rides and rider profiles.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
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
      </body>
    </html>
  );
}
