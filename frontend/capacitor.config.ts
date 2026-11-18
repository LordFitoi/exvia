import type { CapacitorConfig } from "@capacitor/cli";

const PRODUCTION_URL = "https://exvia.up.railway.app";
const APP_BACKGROUND = "#141a21";
const serverUrl = process.env.CAPACITOR_SERVER_URL ?? PRODUCTION_URL;

// The app is server-rendered (see docs/design/frontend-native.md), so the native
// shell loads the hosted site instead of bundling static files from webDir.
const config: CapacitorConfig = {
  appId: "app.exvia.mobile",
  appName: "Exvia",
  webDir: "capacitor-www",
  backgroundColor: APP_BACKGROUND,
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    errorPath: "index.html",
  },
};

export default config;
