# Ride

The Ride tab in [frontend/](../../frontend/): pick one of your own routes,
preview it, then ride it in a 3D map. The routes come from the API in
[routes.md](routes.md); the route creator that makes them is in
[map.md](map.md#route-creator). The shell and tab bar are in
[frontend-screens.md](frontend-screens.md).

## Navigation

`/ride` (authenticated only) is the **center** item of the tab bar: a round,
filled primary button with a checkered flag (`icon-flag-checkered`) raised
above the bar and labeled "Ride" ([navigation.css](../ui-ux/navigation.css),
`tab-bar-action`). Five items: Home, Map, **Ride**, Clans, Profile. It is the
only filled shape in the bar, since it is the app's main action (Von
Restorff); it is still one `<nav>` of links, with `aria-current` on the active
one.

## Pieces

| Piece | File | Job |
|-------|------|-----|
| Page | `app/(app)/ride/page.tsx` | Renders `RideOverview` |
| Screen | `views/ride/RideOverview.tsx` | Holds the selected route id and whether the ride is on; shows the picker or ride mode |
| Picker | `views/ride/RoutePickerView.tsx` | "Ride" heading, preview, route list, Ride button |
| Preview | `components/route/RoutePreview.tsx` | Placeholder, loading and failure states, or the preview map |
| List | `components/route/RouteChoiceList.tsx` | Skeleton, error, empty and ready states of the routes |
| Ride mode | `views/ride/RideModeView.tsx` | Full-bleed 3D map with the quit and recenter buttons |
| Routes | `hooks/useMyRoutes.ts` | `GET /api/routes/`, with `reload` |
| Route | `hooks/useRouteDetail.ts` | `GET /api/routes/<id>/` for the selected route, with `retry` |
| Preview map | `hooks/useRoutePreviewMap.ts` | Route line, start and finish markers, framed in view |
| Ride map | `hooks/useRideMap.ts` | Pitched map with 3D buildings, the route, the rider, and camera follow |
| API | `services/routesApi.ts` | `fetchRoutes`, `fetchRoute` (and `createRoute`) |
| Format | `services/formatRoute.ts` | "42.1 km", "42 min", "1 h 05 min" |

## Picker

`RoutePreview` and `RouteChoiceList` live in `components/route/` because the
[route list](route-management.md) uses them too, with a small map
(`size="compact"`) and a list that fills the column (`size="fill"`); here they
are `fill` and `rows`.

- The tab bar is hidden here (`useHideTabBar`), so the picker is a full-height
  screen with its own way out: an **X** at the top right (`screen-header`,
  labeled "Close"). It goes back to the screen the rider came from
  (`router.back()`), or to Home when the app was opened directly on `/ride`.
  The raised Ride button is therefore only seen on the other tabs.
- Top to bottom: the header with the X, the preview, the list of routes, the
  **Ride** button. The screen is one full-height column with 24px between its
  parts: the **preview map takes all the height the other parts leave**
  (`route-preview-fill`, at least 12rem; about 45% of an 844px-high phone), the
  route list below it is a scroll box **exactly four rows tall**
  (`route-choice-list`; fewer routes shrink it), and the **Ride button sits at
  the bottom edge** with the safe-area padding. The page itself never scrolls.
- Before a route is selected the preview shows "Select a route" and Ride is
  disabled. The list is the user's routes, newest first, each row showing the
  name, distance and estimated time (from the server). The selected row has
  `aria-pressed` and a check (`button.list-item`). The list scrolls inside its
  own box and keeps its scroll position while a route loads.
- Selecting a row fetches that route's path (the list does not carry points)
  and the map frames it with a start flag and a finish flag. The previous
  route stays on the map until the next one has loaded, so it does not blink;
  Ride is enabled only when the **selected** route has loaded, not a previous
  one.
- States: skeleton rows while loading; "Could not load your routes" with Try
  again; "No routes yet" with a link to the map; "Could not load this route"
  with Try again in the preview.

## Ride mode

- **Ride** swaps the picker for `RideModeView`. Like the route creator and
  the picker it hides the tab bar (`useHideTabBar`), except on its map-failure
  screen, which has no exit of its own.
- The map is pitched at 60 degrees, zoom 16.5, with the buildings of the
  Mapbox streets data extruded (`fill-extrusion`, `services/buildingsLayer.ts`)
  and the route drawn as in the other maps, with start and finish markers.
  The grayscale class and the light and dark styles are the same as the
  Map tab.
- The camera faces along the route: the bearing points from the start towards
  the point 10 positions ahead (`services/bearing.ts`), so the first view is
  not "north up" for a route that heads south.
- The rider's position is the same GPS fix snapped to a street as in the Map
  tab (`useGeolocation` plus `useStreetPosition`). Once it is known the "You"
  marker appears and the camera eases to it on every update. Dragging the map
  stops the following; the locate button resumes it. Without a position the
  camera stays at the route start.
- **X** (top right, `Quit ride`) returns to the picker with the same route
  still selected; the tab bar stays hidden, as it is in the picker. Nothing is stored about a ride
  yet: no progress, no recording, no turn-by-turn.

## Key decisions

- **Not a separate page for ride mode**: it is state in `RideOverview`, so
  quitting is instant and the selection survives. A reload while riding goes
  back to the picker, since the ride is not stored.
- **The list does not include points**: so the picker fetches one route when
  selected, and only that route's thousands of path points are sent.
- **Shared map pieces**: both maps and the route creator use `useMapInstance`
  (create the map, remove it, keep it sized to its container) and the layer
  helpers in `services/routeMapLayers.ts`. The container is observed with a
  `ResizeObserver` because Mapbox only resizes on window resize, and hiding
  the tab bar changes the map's height after it was created.
- **The rider is not required to start**: a ride can be previewed or started
  without location permission; the map then shows the route only.

## Not included

Following the route (distance left, progress, off-route detection), voice
guidance, recording the ride, keeping the screen awake during a ride, and
terrain elevation. Add the wake lock first if rides run longer than the
screen timeout.
