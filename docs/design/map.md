# Map

The Map tab in [frontend/](../../frontend/): a full-bleed grayscale
[Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) map centered on the
rider, with a dot and a "You" label at their current position. The shell and
tab bar are described in [frontend-screens.md](frontend-screens.md); the map
components come from the style guide ([map.css](../ui-ux/map.css), "Map" in
[patterns.html](../ui-ux/patterns.html)).

## Route and pieces

`/map` (authenticated only, second tab, `icon-pin`).

| Piece | File | Job |
|-------|------|-----|
| Page | `app/(app)/map/page.tsx` | Renders `MapOverview` |
| Screen | `views/map/MapOverview.tsx` | Reads the position and picks the map or a waiting/blocked message |
| Map | `views/map/UserMap.tsx` | The canvas, the "center on me" button, the load-failure message |
| Message | `views/map/MapStatusView.tsx` | Title plus `StateView` under the "Map" heading |
| Position | `hooks/useGeolocation.ts` | `watchPosition` state: `pending`, `ready`, `denied`, `unavailable` |
| Mapbox | `hooks/useUserMap.ts` | Creates the map and the "You" marker, keeps the marker on the latest position |
| Types | `types/geolocation.ts` | `Coordinates`, `GeolocationState` |

## Behavior

- The map is only mounted once there is a first position, so it always opens
  centered on the rider (zoom 15). Until then, and when location is denied or
  unavailable, the screen shows a `StateView` explaining what to do instead of
  an empty map.
- The position is watched continuously (high accuracy). Each update moves the
  marker; the camera does not follow, so the rider can pan freely. The locate
  button (top right) flies back to the current position.
- A timeout or lost signal after a first fix keeps the last known position;
  only a permission denial clears it.
- The marker is the guide's `marker-me` dot (pulsing halo) with a
  `marker-label` reading "You" below it. It is a plain DOM element handed to
  `mapboxgl.Marker`, anchored top-left because `marker-me` centers itself with
  `translate: -50% -50%`.
- Grayscale: the guide's `.map-grayscale` class puts `filter: grayscale(1)` on
  the Mapbox tile canvas only, so the green dot, the label and the controls
  keep their colors. The style is `light-v11` or `dark-v11` following
  `prefers-color-scheme`, switched live with `setStyle`; the marker survives
  because it is not part of the style.
- `mapbox-gl` is loaded with a dynamic `import()` after mount: it touches
  `window` on import, and the page is still prerendered. This also keeps it
  out of the other screens' bundles. Its CSS is imported by `UserMap.tsx`.
- Failures: a rejected import or a 401 from Mapbox (bad token) shows "Map
  unavailable"; a missing token logs to the console and shows the same
  message. Other tile errors are ignored (Mapbox retries them).

## Configuration

`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` must hold a Mapbox **public** token
(`pk.…`). Locally, copy [.env.example](../../frontend/.env.example) to
`frontend/.env.local` (git-ignored) and fill it in.

On Railway the variable is declared on the `frontend` service in
[railway.ts](../../.railway/railway.ts) as `preserve()`: the token is not in
the repo, and `make railway_apply` keeps whatever value the service already
holds instead of deleting it. Set the value once in the Railway dashboard
(`frontend` → Variables) and redeploy: Next inlines `NEXT_PUBLIC_*` at build
time, so changing it needs a new build. Restrict the token to the app's URL in
the Mapbox dashboard, since it is visible to the browser.

## Key decisions

- **CSS grayscale filter over a gray style**: Mapbox's stock styles are
  near-gray but not exactly, and a custom style would need a Mapbox Studio
  account. The filter guarantees gray with the stock styles, at the cost of
  filtering the canvas on the GPU path (negligible here).
- **No `react-map-gl`**: one map, one marker; the imperative API is a few
  lines and avoids another dependency.
- **Service worker untouched**: tiles and the style come from Mapbox origins,
  and the worker ignores cross-origin requests, so no map data is cached or
  broken offline; the map simply does not load without a connection.
- **Location permission is requested on opening the tab**, not at login, so
  the prompt appears when its purpose is obvious.
