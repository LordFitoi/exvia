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
| Ride map | `hooks/useRideMap.ts` | Pitched map with 3D buildings, the ride lines and the start and finish markers |
| Rider | `hooks/useRiderFollow.ts`, `services/riderMotion.ts` | The "You" marker and the camera that follows it, gliding between fixes, with `recenter` |
| Heading | `hooks/useRiderHeading.ts` | The direction the rider is moving in, from their last positions |
| Ride lines | `hooks/useRideLines.ts` | Where the rider is on the track, and the lines to draw from it |
| Wake lock | `hooks/useWakeLock.ts` | Keeps the screen on while riding (Screen Wake Lock API) |
| Way to start | `hooks/useApproachPath.ts` | Street path from the rider to the route start (Directions API) |
| Progress | `services/routeProgress.ts`, `services/rideLines.ts` | Distance along the track, and the split of the track |
| Ride layers | `services/rideMapLayers.ts` | The Mapbox line layers of a ride |
| API | `services/routesApi.ts` | `fetchRoutes`, `fetchRoute` (and `createRoute`) |
| Format | `services/formatRoute.ts` | "42.1 km", "42 min", "1 h 05 min" |

## Picker

`RoutePreview` and `RouteChoiceList` live in `components/route/` because the
[route list](route-management.md) uses them too, with a small map
(`size="compact"`) and a list that fills the column (`size="fill"`); the picker
uses the same two sizes, so both screens have the same map.

- The tab bar is hidden here (`useHideTabBar`), so the picker is a full-height
  screen with its own way out: an **X** at the top right (`screen-header`,
  labeled "Close"). It goes back to the screen the rider came from
  (`router.back()`), or to Home when the app was opened directly on `/ride`.
  The raised Ride button is therefore only seen on the other tabs.
- Top to bottom: the header with the X, the preview, the list of routes, the
  **Ride** button. The screen is one full-height column with 24px between its
  parts: the **preview map is compact** (`route-preview`, `min(35dvh, 18rem)`,
  the same as the route list), the **route list takes all the height the other
  parts leave** and scrolls inside its own box (`route-choice-list-fill`), and
  the **Ride button sits at the bottom edge** with the safe-area padding. The
  page itself never scrolls.
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
  The grayscale and the light and dark styles are the same as the
  Map tab.
- The camera faces along the route: the bearing points from the start towards
  the point 10 positions ahead (`services/bearing.ts`), so the first view is
  not "north up" for a route that heads south.
- The rider's position is the GPS fix snapped to a street, as in the Map tab
  (`useGeolocation` plus `useStreetPosition`); when the fix cannot be snapped
  (or the snap has not finished) the raw fix is used, so the rider is always
  shown and followed once the phone has a position. The "You" marker appears
  and **the camera centers on it** by default: the first fix moves the camera
  there at once. Dragging the map stops the following; the locate button
  resumes it (an 800 ms ease to the rider's position and heading). Without a
  position the camera stays at the route start.
- **Heading** (`useRiderHeading`): the compass bearing from the position the
  last reading was taken from to the current one, read only after the rider has
  moved 10 m (closer moves are GPS noise) and blended 60/40 with the previous
  heading so one odd fix does not turn the map. It stays as it was while the
  rider stands still, and is unknown until the first such move, so the camera
  keeps the route's bearing until then. It does not use the phone's compass.
- **Smooth movement** (`useRiderFollow`, `services/riderMotion.ts`): each new
  fix does not move the marker; it starts a 1 s animation (one GPS fix apart)
  from where the marker is shown now to the new position, and from the shown
  bearing to the new heading (the short way round, so 350 to 10 passes through
  0). On every frame the marker and the camera (`jumpTo` with centre and
  bearing) move together, so the marker stays fixed on screen while the map
  turns and slides under it. A fix that lands mid-animation continues from the
  point reached, with no jump. While the recenter ease runs, frames move only
  the marker.
- **Three lines** (`useRideLines`), each over the guide's `--color-surface`
  casing except the dotted one:
  - **Ridden track**, gray (`--color-grey-500`, `.map-route-passed` in the
    guide): from the start to where the rider is on the track. Empty before the
    rider reaches the track. Only what is ahead has color.
  - **Way to the start**, dotted ink (the guide's `.map-route-walk`): only
    while the rider has not yet reached the track (more than 40 m from it). It
    is the street path from the rider to the first point, from the Directions
    API, asked again only after the rider has moved 50 m. It disappears when the
    rider reaches the track, and is empty if no street route exists.
  - **Remaining track**, `--color-primary-light`: from
    where the rider is on the track to the finish. Before the rider is on the
    track it is the whole route.
- **Progress** is the distance along the track of the closest spot to the rider
  (`routeProgress.ts`). It only moves forward: the search starts 30 m behind the
  last spot (GPS jitter) and reaches 400 m ahead, so a loop that returns near
  the start is not mistaken for the start. If that finds nothing within 40 m,
  the whole track is searched once, to pick the ride up again after a shortcut.
  A rider who leaves the track keeps the last spot reached, and no way back is
  drawn.
- **The screen stays on** while riding (`useWakeLock`, Screen Wake Lock API),
  except on the map-failure screen. Browsers release the lock whenever the page
  is hidden (another app, a locked phone), so it is requested again when the
  page is visible; leaving ride mode releases it. Where the API is missing, or
  the browser refuses (low battery, for example), nothing happens beyond a
  console message and the screen follows the device's own timeout. The API
  needs a secure context (HTTPS or localhost).
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

Distance left, off-route detection and a way back to the track after leaving
it (only the way to the start is drawn), voice guidance, recording the ride,
and terrain elevation.
