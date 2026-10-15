# Map

The Map tab in [frontend/](../../frontend/): a full-bleed grayscale
[Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) map centered on the
rider, with a dot and a "You" label at their current position, always
snapped to the nearest street, and a button that opens the
[route creator](#route-creator). The shell and
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
| Street snap | `hooks/useStreetPosition.ts` | Snaps each GPS fix to the nearest street; keeps the last street position |
| Snap request | `services/streetSnapApi.ts` | Mapbox Directions call that returns the snapped point, or `null` |
| Mapbox | `hooks/useUserMap.ts` | Creates the map and the "You" marker, keeps the marker on the latest position |
| Map instance | `hooks/useMapInstance.ts` | Creates a map once the token is known, keeps it sized to its container, removes it on unmount; used by the creator and the [Ride](ride.md) maps |
| Base map | `services/baseMap.ts` | Shared by both maps: dynamic `mapbox-gl` import, style following the color scheme, 401 handling, the "You" marker element |
| Token | `services/mapboxConfig.ts` | Reads `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` for the map and the snap request |
| Types | `types/geolocation.ts` | `Coordinates`, `GeolocationState`, `StreetPositionState` |

## Behavior

- The map is only mounted once there is a first position, so it always opens
  centered on the rider (zoom 15). Until then, and when location is denied or
  unavailable, the screen shows a `StateView` explaining what to do instead of
  an empty map.
- The position is watched continuously (high accuracy). Each update moves the
  marker; the camera does not follow, so the rider can pan freely. The locate
  button (top right) flies back to the current position.
- Only street positions are shown. Every fix is sent to the Mapbox Directions
  API as a zero-length `driving` route with a 50 m radius; the snapped
  waypoint is what the map and marker use, never the raw GPS point. A new fix
  aborts the previous request. With no street within 50 m (422 `NoSegment`)
  or a failed request, the marker stays on the last street position; if there
  has been none yet, the screen shows "Get on a street" or "Street not found"
  instead of the map.
- A timeout or lost signal after a first fix keeps the last known position;
  only a permission denial clears it.
- The marker is the guide's `marker-me` dot (pulsing halo) with a
  `marker-label` reading "You" below it. It is a plain DOM element handed to
  `mapboxgl.Marker`, anchored top-left because `marker-me` centers itself with
  `translate: -50% -50%`.
- Grayscale: `services/grayscaleStyle.ts` grays the colors of the loaded
  style's own layers (on every `style.load`, before the app adds its layers),
  so the route lines, the green dot, the label and the controls keep their
  colors. The style is `light-v11` or `dark-v11` following
  `prefers-color-scheme`, switched live with `setStyle`; the marker survives
  because it is not part of the style.
- `mapbox-gl` is loaded with a dynamic `import()` after mount: it touches
  `window` on import, and the page is still prerendered. This also keeps it
  out of the other screens' bundles. Its CSS is imported by `UserMap.tsx`.
- Failures: a rejected import or a 401 from Mapbox (bad token) shows "Map
  unavailable"; a missing token logs to the console and shows the same
  message. Other tile errors are ignored (Mapbox retries them).

## Route creator

The **route button** (an icon-only button with the `icon-route` glyph, in the
top right `map-controls` group under the locate button, labeled "Routes") opens
a menu (`views/map/RouteMenu.tsx`) with **Create a new route** and **Preview
routes**. The first swaps the map for `RouteCreatorView`, the second for
`RouteListView` ([route-management.md](route-management.md)). `MapOverview`
holds the mode (`browse`, `create` or `list`), so the creator reuses the street
position already resolved and no second location lookup happens. While the creator is open the
bottom tab bar is hidden (`useHideTabBar`), so the map and the sheet use the
full height and the cancel button is the way out.

| Piece | File | Job |
|-------|------|-----|
| Screen | `views/routes/RouteCreatorView.tsx`, `views/routes/RouteEditor.tsx` | The creator is a thin wrapper; `RouteEditor` is the shared screen (also used to [edit a route](route-management.md#edit)): full-bleed map, cancel and locate controls, bottom sheet with the point list and the save button |
| List | `views/routes/RoutePointList.tsx` | Numbered points with coordinates and a remove button each; a hint while empty |
| Modal | `views/routes/SaveRouteDialog.tsx` | Name (required, 100) and description (optional, 255), then saves through the `saveRoute` it is given: `POST /api/routes/` here, `PUT` when editing |
| Points | `hooks/useRouteDraft.ts` | The ordered points; snaps each tap to a street, routes each leg, and adds, removes and moves points |
| Sheet | `views/routes/RouteSheet.tsx`, `hooks/useSheetGrab.ts` | The bottom sheet and its collapse gesture |
| Reorder | `hooks/useDragReorder.ts` | Press-and-hold drag gesture (and Alt+Arrow keys) for the point list |
| Map | `hooks/useRouteMap.ts` | Map lifecycle, tap and marker-tap handlers, keeps line and markers in sync with the points |
| Layers | `services/routeMapLayers.ts` | The route line (GeoJSON source plus casing and line layer) and the numbered markers |
| Street path | `services/streetRouteApi.ts`, `services/routePath.ts` | Directions request for one leg; joins the legs into the full path |
| API | `services/routesApi.ts`, `services/authorizedRequest.ts` | `createRoute`; calls as the signed-in user, refreshing an expired access token once |
| Toast | `components/feedback/Toast.tsx` | Confirmation after saving, dismissed after 5 seconds |

Behavior:

- Tapping the map adds a point **in tap order**. The tap is snapped with the
  same Directions request as the rider's position (`snapToStreet`, 50 m,
  `driving` profile); the snapped spot, not the tap, becomes the point. With no
  street within 50 m, or a failed request, an error alert appears in the sheet
  and no point is added. Taps while a lookup is running are ignored, so the
  order cannot be scrambled by slow responses; the sheet badge reads
  "Routing…" and Save is disabled meanwhile.
- Each point after the first also fetches the **street path from the previous
  point** (Mapbox Directions, `driving`, `overview=full`, GeoJSON geometry) and
  keeps it as that point's `path` without the shared first vertex. If Mapbox
  finds no street route to the spot (no route, or a 422), an alert says so and
  the point is not added. The route is therefore never a straight line across
  blocks: every leg follows streets.
- A point is removed with the X in its list row or by tapping its marker
  (marker taps do not add a point). Remaining points are renumbered. Removing
  the last point just drops its leg; removing a middle or first point fetches
  one new leg joining its neighbours (or none, for the first). If that request
  fails the point stays and an alert explains it, so a straight shortcut never
  appears.
- **Collapsing the sheet**: the handle and the header form the grab area.
  Dragging it down more than 32 px slides the sheet down by the height of its
  body (plus the gap above it), leaving only the handle and the header (and an
  error alert, if one is showing) at the bottom edge, so more map shows;
  dragging up slides it back. The change starts as soon as the finger has gone
  far enough, once per press, and animates `transform` for 300 ms. The offset
  comes from a `ResizeObserver` on the body, so it stays right while points are
  added or removed during the collapse. The body is `inert` while collapsed, so
  its hidden buttons cannot be focused. The handle is also a button
  (`aria-expanded`): a tap or the keyboard does the same. The grab area has
  `touch-action: none` so the drag does not scroll the page; the list below
  keeps its own scrolling. Error alerts stay visible while collapsed, because a
  tap on the map can still fail with a message. The state is local to the sheet
  and resets with the creator.
- **Reordering**: press and hold a row for 400 ms (the phone vibrates briefly),
  then move up or down; the row follows the finger and the others slide to
  open the gap, and the list autoscrolls near its top and bottom edges. A
  shorter press, or a finger that moves before the hold ends, is left to the
  browser so the list still scrolls. The remove button is not part of the
  gesture. Dropping on a new position calls `movePoint`, which re-fetches only
  the legs whose previous point changed (a point that keeps its predecessor
  keeps its leg), in parallel, and renumbers markers and rows. If any new leg
  has no street route, the old order is kept and an alert explains it. The
  drop is not optimistic: the row returns to its slot while the legs load
  ("Routing…"), then the list updates, so the map line is never out of step
  with the order. Keyboard users focus a row and press Alt+ArrowUp or
  Alt+ArrowDown.
- Markers are the guide's `marker` buttons, numbered, the first one
  `marker-start`. The line is the joined street path, drawn with the guide's
  route colors (`--color-primary` over a `--color-surface` casing, resolved
  from the tokens, 7 and 11 px like `.map-route`). Layers are
  re-added on every `style.load`, because switching between the light and
  dark style drops custom layers.
- **Save route** is disabled until there are 2 points and no leg is being
  fetched. It sends the whole street path as `points`, plus the tapped points
  as `waypoints` (so the route can be edited later), so the server's distance
  follows the roads (see
  [routes.md](routes.md#points)). It opens the modal: a native `<dialog>` opened with `showModal()`,
  styled as the guide's bottom sheet (`sheet sheet-modal`), so Esc, focus
  trapping and the backdrop are the browser's. The guide reserves the centered
  `dialog` for confirmations, hence the sheet.
- On success the creator closes and the map shows a toast with the saved
  name, the server's distance and the estimated time. On failure the modal
  stays open with the server's field errors or a form-level alert, and the
  drawn points are kept. The cancel button discards the draft without
  asking: nothing is stored until save.
- The access token is the 15-minute JWT; `requestJsonAuthorized` renews it
  once with the refresh token on a `401`. If the refresh is also rejected the
  tokens are cleared and the modal shows "Your session has expired", and the
  next reload lands on the login screen. `AuthProvider` is not told, so the
  screen itself does not redirect.

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

- **Directions API for snapping**: it accepts a public token and a single
  point (as a repeated waypoint), unlike Map Matching, which needs a trace.
  The `driving` profile is the definition of "street"; change
  `STREET_PROFILE` to allow cycleways or footpaths.

- **Graying the style's colors over a CSS filter**: Mapbox's stock styles are
  near-gray but not exactly, and a custom style would need a Mapbox Studio
  account. A `filter: grayscale(1)` on the canvas would also gray the route
  lines, since they are drawn in the same canvas, so the style's paint colors
  are converted to gray of the same luminance instead.
- **No `react-map-gl`**: one map, one marker; the imperative API is a few
  lines and avoids another dependency.
- **Service worker untouched**: tiles and the style come from Mapbox origins,
  and the worker ignores cross-origin requests, so no map data is cached or
  broken offline; the map simply does not load without a connection.
- **Location permission is requested on opening the tab**, not at login, so
  the prompt appears when its purpose is obvious.
