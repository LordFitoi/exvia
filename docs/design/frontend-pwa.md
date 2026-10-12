# Frontend PWA

The Next.js app in [frontend/](../../frontend/) installs to the home screen
and opens as its own full-screen app, without browser chrome. Screens and
navigation are described in [frontend-screens.md](frontend-screens.md).

## Pieces

| File | Job |
|------|-----|
| [manifest.ts](../../frontend/src/app/manifest.ts) | Web app manifest, served at `/manifest.webmanifest` |
| [layout.tsx](../../frontend/src/app/layout.tsx) | Icons, Apple web app tags, `theme-color` per color scheme, `viewport-fit=cover` |
| [public/sw.js](../../frontend/public/sw.js) | Service worker: offline fallback and asset caching |
| [ServiceWorkerRegistration.tsx](../../frontend/src/components/layout/ServiceWorkerRegistration.tsx) | Registers the worker, production builds only |
| [offline/page.tsx](../../frontend/src/app/offline/page.tsx) | Page shown when a screen is not available offline |
| [not-found.tsx](../../frontend/src/app/not-found.tsx), [error.tsx](../../frontend/src/app/error.tsx) | Styled 404 and error states, each with a way out |
| `public/icons/` | 192 and 512 icons, a maskable 512 icon, the 180 Apple touch icon |

## Display mode

`display: "standalone"` with `display_override: ["fullscreen", "standalone"]`,
so browsers that support it open the app full screen and the rest fall back to
standalone. `orientation` is `portrait`; `start_url` and `scope` are `/`.

- **Android (Chrome)**: installs with the fullscreen override, so system bars
  are hidden until the user swipes. Because fullscreen ignores `theme_color`,
  the status bar color only applies if you remove `fullscreen` from the
  override.
- **iOS (Safari)**: no manifest `display` support for fullscreen; the app opens
  standalone via `appleWebApp.capable`. `statusBarStyle` is `default` on
  purpose: `black-translucent` draws the clock in white over the page, which is
  unreadable on the light theme. The page already pads for the safe areas
  (`--safe-top`, `--safe-bottom`), so switching later needs no layout change.
- **Install**: there is no in-app install button. Chrome and Edge show their
  own install prompt; on iOS the user uses Share, then Add to Home Screen.

## Icons

Brand green (`#00a76f`) full-bleed square with the white navigation arrow
used on the login screen. `icon-maskable-512.png` keeps the arrow inside the
80% safe zone so Android can crop it into any shape; the other icons use a
larger arrow. The PNGs were generated once with Pillow from the arrow path
of the style guide's `icon-navigation`; there is no generator in the repo, so
regenerate them by redrawing that polygon on a `#00a76f` square.

## Service worker

Cache name `exvia-v3`; bump it when the worker's caching rules change so the
old cache is deleted on activate. The worker only handles same-origin `GET`
requests and never touches `/api/`, `/admin/` or `/static/`.

| Request | Strategy |
|---------|----------|
| Navigation | Network first with a 5s timeout; every OK response is cached. On failure, the cached copy, else a redirect to `/offline/` |
| `/_next/static/*`, `/icons/*` | Cache first (the build hashes file names) |
| Everything else (RSC prefetches, API) | Not intercepted |

- `/offline/` and an icon are precached on install.
- Cached pages are the static app shells. They hold no user data: the
  session and all account data come from the API in the browser, so a cached
  `/profile/` shows the login screen if the session is gone, and it is empty
  offline.
- **Redirect, not rewrite**: serving the offline HTML at the failed URL makes
  Next hydrate it against the wrong route and show its 404, so the worker
  redirects to `/offline/` instead.
- **No page JS on `/offline/`**: it only renders server components and a
  `Link`, because a client chunk that was never loaded cannot be fetched
  offline and would trip the error boundary.
- **Timeout**: a connection that hangs (weak signal) would otherwise block
  navigation until the browser gives up.
- `next.config.ts` serves `/sw.js` with `Cache-Control: no-cache` so installed
  apps pick up new worker versions.
- The worker is registered only when `NODE_ENV` is `production`; in `next dev`
  a cached shell would hide changes from hot reload. Test PWA behavior with
  `pnpm build && pnpm start`.

## Verified

With a production build in headless Chrome: the manifest parses with no
errors and `Page.getInstallabilityErrors` is empty (outside incognito); the
worker activates and controls the page; precache holds `/offline/`; with the
server stopped, a visited screen loads from cache and an unvisited URL lands
on the offline page. Not tested on real devices: the iOS home-screen flow and
Android fullscreen need a phone and an HTTPS origin (the Railway domain
qualifies; `localhost` also counts as secure).

## Not included

- Push notifications and background sync.
- Offline data: nothing from the API is cached, so offline screens are shells.
- A custom install prompt, iOS splash images and manifest screenshots.
