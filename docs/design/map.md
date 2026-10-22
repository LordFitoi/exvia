# Map

The Map tab in [frontend/](../../frontend/): a full-bleed grayscale
[Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) map centered on the
rider, with a dot and a "You" label at their current position, always
snapped to the nearest street, a [place search](#riding-to-a-place) at the top and a button that opens the
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
| Search | `views/routes/PlaceSearch.tsx` | The same place search as the route creator, at the top of the map; picking a place starts a [ride to it](#riding-to-a-place) |
| Destination ride | `views/map/DestinationRideView.tsx`, `hooks/useDestinationMap.ts`, `hooks/useDestinationArrival.ts` | Ride mode towards the picked place and its arrival summary (`views/map/DestinationSummarySheet.tsx`) |
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

## Riding to a place

The search field of the [route creator](#route-creator) (`PlaceSearch`, same services, same 100 km
nearest-first list and categories) is also at the top of the map, over the controls, searching near the
rider's street position. Picking a **place** (a category row only lists its places, as there) does not add a point:
it opens **ride mode towards that place** in place of the map (`MapOverview` keeps the picked `Place`;
`key` is the place id, so a new pick restarts the ride).

- **The path is never stored or drawn from a saved route.** `useStreetRoute` asks Mapbox Directions for the
  street route (`fetchStreetRoute`: path, distance and duration) **from the rider's current position to the
  place**, and asks again once the rider has moved 50 m from the spot it was last asked for, so the line follows
  them when they take another street. The previous route stays until the new one arrives; with no street route
  it is empty. The destination is not snapped by the app:
  Directions puts it on the nearest street, so the line ends there.
- **Same screen as [ride mode](ride.md#ride-mode)**: pitched 3D map with buildings that follows the rider and turns
  to their heading (it starts facing the place), the path in the remaining-track color, a checkered finish flag on
  the place, the stats strip, the
  locate button, the screen kept on and the tab bar hidden. It is **solo and not recorded**, like a
  [free ride](ride.md#free-ride): no group, no websocket, no ride summary saved.
- **Stats** (`RideStatsPanel` with `isToGo`; there are no checkpoints): the strip shows time and speed, and the
  expanded grid **Distance left** and **Time left** (the Directions distance and duration of the current route,
  so exact to the 50 m between requests), **Avg km/h** and **Max km/h**. The average is the kilometres the rider has
  covered over the elapsed time. `useRideDistance` adds up the rider's street-position moves of at least 10 m,
  ignoring smaller ones as GPS noise, so a detour counts and standing still does not. At the place the distance
  and time left read 0.
- **Arrival** (`useDestinationArrival`): within 50 m, in a straight line, of the end of the path (or of the place
  while the path has not loaded) the phone vibrates, the clock, the distance covered and the top speed freeze, and
  `DestinationSummarySheet` opens: the "You've arrived!" modal sheet of [ride mode](ride.md#ride-mode) with the
  place name and four `route-stats`: **Time**, **Distance** (the kilometres covered, which stop counting at the
  arrival, so they fall up to 50 m short of the place), **Avg km/h** and **Max km/h**. **Done**, the X and Esc all
  close it **and leave the ride, back to the map**. The summary is only shown: a ride to a place has no route, so
  there is nothing to save it against, and it is lost once closed. The X on the map (**Quit ride**) leaves at any
  time with no confirmation and no summary.

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
| List | `views/routes/RoutePointList.tsx` | Numbered points, each titled with its place or address (or "Point N" when tapped) and its coordinates, and a remove button; a hint while empty |
| Search | `views/routes/PlaceSearch.tsx`, `hooks/usePlaceCompletion.ts`, `hooks/usePlaceSuggestions.ts`, `services/placeSearchApi.ts`, `services/placeParsing.ts`, `services/placeCategories.ts` | The search field over the map: offers matching places and adds the picked one as a point |
| Modal | `views/routes/SaveRouteDialog.tsx` | Name (required, 100) and description (optional, 255), then saves through the `saveRoute` it is given: `POST /api/routes/` here, `PUT` when editing |
| Points | `hooks/useRouteDraft.ts` | The ordered points; snaps each tap to a street, routes each leg, and adds, removes and moves points |
| Sheet | `views/routes/RouteSheet.tsx`, `hooks/useSheetGrab.ts` | The floating sheet and its collapse gesture |
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
- **Searching a place**: the guide's map search field (`map-search`) sits at the
  top of the map, over the controls. After 3 characters and a 300 ms pause it
  asks **two services at once** and merges the answers:
  - **Mapbox Geocoding** (v6) for addresses, streets and areas. It handles house
    numbers well ("calle alcala 50").
  - **Photon** (`photon.komoot.io`, OpenStreetMap data) for businesses and
    landmarks: gas stations, malls, restaurants. Mapbox's own search has almost
    no businesses in some countries (in the Dominican Republic it knows one
    Shell, none of Sigma, Next or Petronan), OpenStreetMap does. Roads, towns
    and buildings are dropped from the Photon answer, since the address search
    covers them. If one service fails the other still answers.
  The OpenStreetMap credit is already in the map's attribution.
  Photon is a free public instance: the typed text and the rider's approximate
  position are sent to it. Swap `PHOTON_URL` in `services/placeSearchApi.ts` for
  a self-hosted Photon (the same API) if its usage limits are ever a problem.
- **Nearest first, and only nearby**: both requests carry the rider's position
  (or the route's center when editing, where the rider's position is not known)
  and a bounding box of **100 km** around it, so a namesake in another country
  never shows. The services only lean towards that position, so 10 matches are
  asked of each and the result is **sorted by distance**, the 6 nearest kept;
  the same place mapped twice within 100 m is shown once. The list is the guide's
  suggestion list (WAI-ARIA combobox, like the username field: arrow keys, Enter
  picks the active row or the first one, Escape closes the list). Each row has
  the name, and under it the address and the distance from the rider.
  - **A category row** ("Gas stations", "Restaurants", "Cafés", "Shopping malls",
    "Supermarkets", "Pharmacies", "Hotels") appears first when the text starts to
    name one, in English or Spanish (`services/placeCategories.ts`). It does not
    add anything: it fills the field with the category and lists its nearest
    places (Photon `/reverse` with the OpenStreetMap tag, such as
    `amenity:fuel`). Typing again goes back to the normal search.
  - **A place row** is added as a point. The camera flies to the place (clear of
    the sheet) and the point is added **as a tapped point would be**: snapped to
    the nearest street within 50 m, with the street leg from the previous point.
    It is titled with the place's name and address ("Next, Avenida Abraham
    Lincoln, Polígono Central, Santo Domingo") instead of "Point N"; points added
    by tapping keep "Point N". The field then clears, ready for the next place.
  - The title is only a draft label: it is not saved with the route, so reopening
    a route to edit shows "Point N" again. A failed search leaves the list as it
    was, since it is only a help. A place with no street within 50 m shows the
    same "No street here" alert as a tap.
  - **Not supported**: crossings of two streets ("Alcalá & Serrano"); neither
    service searches them. Tap the map there.
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
- **Collapsing the sheet**: the header is the grab area (there is no handle bar).
  Dragging it down more than 32 px slides the sheet down by the height of its
  body (plus the gap above it), leaving only the header (and an
  error alert, if one is showing) at the bottom edge, so more map shows;
  dragging up slides it back. The change starts as soon as the finger has gone
  far enough, once per press, and animates `transform` for 300 ms. The offset
  comes from a `ResizeObserver` on the body, so it stays right while points are
  added or removed during the collapse. The body is `inert` while collapsed, so
  its hidden buttons cannot be focused. A chevron button in the
  header (`aria-expanded`, turned over while collapsed): a tap or the keyboard does the same. The grab area has
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
