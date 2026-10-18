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
| Screen | `views/ride/RideOverview.tsx` | Holds the selected route id and the stage (picker, route ride or free ride); shows the matching view |
| Picker | `views/ride/RoutePickerView.tsx` | "Ride" heading, preview, route list, Ride and Free ride buttons |
| Preview | `components/route/RoutePreview.tsx` | Placeholder, loading and failure states, or the preview map |
| List | `components/route/RouteChoiceList.tsx` | Skeleton, error, empty and ready states of the routes |
| Ride mode | `views/ride/RideModeView.tsx` | Full-bleed 3D map with the quit and recenter buttons |
| Free ride | `views/ride/FreeRideView.tsx`, `FreeRideWaitingView.tsx`, `FreeRideSessionView.tsx`, `FinishFreeRideDialog.tsx` | Ride with no route: waits for the first fix, then records the track; see [Free ride](#free-ride) |
| Free ride logic | `hooks/useTrackRecorder.ts`, `hooks/useFinishFreeRide.ts`, `hooks/useFreeRideMap.ts` | Records the fixes, saves the route and the ride, and draws the map |
| Track maths | `services/trackRecorder.ts`, `services/trackOptimizer.ts` | Which fixes enter the track, and how the track is shrunk before it is saved |
| Quit | `views/ride/ConfirmQuitRideDialog.tsx`, `hooks/useQuitRide.ts` | "Quit this ride?" dialog opened by the X, and saving the unfinished ride before leaving |
| Routes | `hooks/useMyRoutes.ts` | `GET /api/routes/`, with `reload` |
| Route | `hooks/useRouteDetail.ts` | `GET /api/routes/<uuid>/` for the selected route, with `retry` |
| Preview map | `hooks/useRoutePreviewMap.ts` | Route line, start and finish markers, framed in view |
| Ride map | `hooks/useRideMap.ts` | Pitched map with 3D buildings, the ride lines and the start and finish markers |
| Rider | `hooks/useRiderFollow.ts`, `services/riderMotion.ts` | The "You" marker and the camera that follows it, gliding between fixes, with `recenter` |
| Heading | `hooks/useRiderHeading.ts` | The direction the rider is moving in, from their last positions |
| Progress | `hooks/useRideProgress.ts` | Where the rider is on the track (the last spot reached) |
| Ride lines | `hooks/useRideLines.ts` | The lines to draw from that progress |
| Arrival | `hooks/useRideArrival.ts` | Detects the finish (the time of the first GPS fix at the end); vibrates on arrival |
| Elapsed | `hooks/useRideElapsed.ts` | The seconds since ride mode opened, ticking once a second until the finish |
| Save | `hooks/useSaveRideSummary.ts`, `views/ride/RideSaveStatus.tsx` | Saves the finished ride on the server once, and shows saving, saved, or a failure with Try again |
| Speeds | `hooks/useRideSpeeds.ts`, `services/rideSpeed.ts` | Max, lowest and mean speed of the ride from the GPS readings |
| Stats strip | `views/ride/RideStatsPanel.tsx` | The time and current speed under the map |
| Summary | `views/ride/RideSummarySheet.tsx` | The "You've arrived!" modal sheet with time, distance and average speed |
| Wake lock | `hooks/useWakeLock.ts` | Keeps the screen on while riding (Screen Wake Lock API) |
| Way to start | `hooks/useApproachPath.ts` | Street path from the rider to the route start (Directions API) |
| Track maths | `services/routeProgress.ts`, `services/rideLines.ts` | Distance along the track, and the split of the track |
| Ride layers | `services/rideMapLayers.ts` | The Mapbox line layers of a ride |
| API | `services/routesApi.ts`, `services/rideSummariesApi.ts` | `fetchRoutes`, `fetchRoute` (and `createRoute`); `createRideSummary` |
| Format | `services/formatRoute.ts` | "42.1 km", "42 min", "1 h 05 min", "42:10", "24.5", "26" |

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
  (bottom center, see below) resumes it (an 800 ms ease to the rider's position, heading and the ride zoom of 16.5, so
  a pinch-out is undone too). Without a
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
- **Stats strip** (`RideStatsPanel`): the screen is the map above a strip, not an
  overlay, so it never covers the map (`ride-screen`, `ride-panel`; the tab bar
  is hidden, so the strip carries the bottom safe area). Two boxes: **Time**
  (`useRideElapsed`, as a stopwatch `min:sec`, `h:mm:ss` from an hour up) and
  **Speed** in km/h. Time starts at 0:00 when ride mode opens (the way to the
  start counts, and it does not wait for a GPS fix), counts up each second, and
  stops at the finish, where it matches the summary. Speed is
  the GPS reading (`coords.speed`, passed on by `useGeolocation`, m/s rounded
  to km/h); it is a dash when the device gives none. It is not a blocking modal
  on purpose: the rider keeps the map while the numbers stay in view. The locate
  button sits at the middle of the map's bottom edge, just above the strip.
- **Arrival** (`useRideArrival`): the rider has arrived when the progress on
  the track is within 40 m of its end (`ARRIVAL_METERS`). The phone vibrates
  and `RideSummarySheet` opens: a modal sheet ("You've arrived!", the guide's
  `sheet-modal` with a close X) with the route name and three `route-stats`:
  **Time**, **Distance** and **Avg km/h**, then the route's estimated time
  and a **Done** button. Done ends the ride and opens the Map tab (`router.replace('/map')`, so Back does
  not return to the finished ride); the X on the map still goes back to the
  picker. Closing the sheet
  (X, Esc) keeps the map open. Time is the strip's clock, stopped at the
  first GPS fix at the end (that fix's own timestamp, `GeolocationPosition.timestamp`,
  passed on by `useGeolocation`). Stops are not paused, so Time is the elapsed
  time, and Distance and Avg km/h use the route's own length, not the path the
  rider actually took.
  The guide shows it in [patterns.html](../ui-ux/patterns.html) ("Ride summary"),
  with `map-scrim` standing in for the dialog backdrop.
  **Saving the ride**: when the summary appears, `useSaveRideSummary` posts the
  ride once to `POST /api/routes/<uuid>/summaries/` ([routes.md](routes.md#route-summaries))
  with the time ride mode opened as `start_at`, the arrival time as `end_at`
  (the same two instants the Time box measures) and the speeds below. The sheet
  shows "Saving your ride…", then "Ride saved."; if the request fails it shows
  "Could not save your ride." with **Try again**, and Done and the X still work
  (an unsaved ride is lost when the rider leaves). A fix older than the ride
  (the browser may reuse a cached one) is moved to one second after the start so
  the server accepts it (`createRideSummary` does this for every save).
  Quitting before the finish saves an unfinished ride (see the X below). Saved rides
  are listed in the [ride history](ride-history.md).
- **Ride speeds** (`useRideSpeeds`, `services/rideSpeed.ts`): each new GPS fix
  (counted once per `timestamp`) adds its `coords.speed` to running totals, with
  no list of readings kept. Readings under 3 km/h (`MOVING_SPEED_KMH`) are stops
  and are ignored; the rest give the max, the lowest and the mean, in km/h. The
  totals freeze when the rider arrives and are sent with the ride. With no
  speed from the device (or only stops) they are null, which the history shows as
  a dash.
- **The screen stays on** while riding (`useWakeLock`, Screen Wake Lock API),
  except on the map-failure screen. Browsers release the lock whenever the page
  is hidden (another app, a locked phone), so it is requested again when the
  page is visible; leaving ride mode releases it. Where the API is missing, or
  the browser refuses (low battery, for example), nothing happens beyond a
  console message and the screen follows the device's own timeout. The API
  needs a secure context (HTTPS or localhost).
- **Locate button placement.** The recenter button is the one control a rider
  needs while moving, so it sits **centered above the stats strip** (`map-control-bottom-center`,
  a filled primary round button, since the raised, translucent one blends into
  the grayscale map), within reach of either thumb whichever hand is on the
  throttle. The rarely used **X** stays at the top right, out of the way of
  accidental taps.
- **X** (top right, `Quit ride`) asks first while the ride is in progress:
  `ConfirmQuitRideDialog` (the guide's confirm dialog, a native
  `<dialog class="dialog" role="alertdialog">`) says "Quit this ride? The ride so
  far is saved to your ride history, marked as not finished." with **Keep
  riding** (outline, first) and **Quit ride** (`button-error`). Keep riding and
  Esc close the dialog and the ride goes on.
  **Quit ride** saves the ride so far, then leaves (`useQuitRide`): `start_at` is
  when ride mode opened, `end_at` is now, `is_finished` is `false`, and the speeds
  so far go with it. While it saves, both buttons are disabled and Quit shows
  the loading state. If the save fails the dialog stays open with the error and
  the button reads **Quit anyway**, which leaves without saving, so a bad
  connection never traps the rider. Leaving goes back to the picker with the same
  route still selected. After arrival the ride is already saved, so the X leaves
  at once with no dialog and no second summary. The tab bar stays hidden, as it is
  in the picker. Nothing is recorded while riding a route (no track, no turn-by-turn); the
  server keeps only the summary of the ride.

## Free ride

The **Free ride** button (outline, `icon-route`) sits under **Ride** in the picker and needs
no selected route. It opens a ride with no route to follow: the rider's own track is
recorded, and on finishing it is saved as a new route and then as a ride of that route.

- **Start** (`FreeRideView`): a free ride cannot start without a position, so until the first
  GPS fix arrives `FreeRideWaitingView` shows the status ("Finding your location", "Location
  is turned off", "Location unavailable") with an X back to the picker. The fix (snapped to a
  street when possible, as in ride mode) then opens `FreeRideSessionView`, so `start_at` is the
  time the session opened.
- **Screen** (`FreeRideSessionView`): the same layout as ride mode: pitched 3D map that follows
  the rider (`useFreeRideMap`, which reuses `useRiderFollow`/`useRiderHeading`), the stats strip
  (time and speed), the locate button, no tab bar, screen kept on. The recorded track is
  drawn live as the route line (`addRouteLine`). The top-right button is a checkered flag,
  **Finish ride**, not an X: there is no destination, so the rider ends it whenever they want.
- **Recording** (`useTrackRecorder`, `services/trackRecorder.ts`): each new GPS fix (once per
  `timestamp`) is added to the track unless its `accuracy` is over 30 m (a guess that would
  draw a spike; a missing accuracy counts as good) or it is within 5 m of the last point kept
  (standing still, or GPS noise, adds nothing). The raw fix is recorded, not the street-snapped
  one, so paths off the road network (bike paths, parks) are kept. `useGeolocation` now passes
  `coords.accuracy` on for this.
- **Optimizing** (`services/trackOptimizer.ts`), run once when the ride is saved: coordinates are
  rounded to 6 decimals (about 0.1 m); consecutive repeated points are removed; then
  Douglas-Peucker (`simplifyPath`) drops every point a straight line can replace within 5 m,
  keeping the first and last. The longitude is stretched by the cosine of the mean latitude
  before simplifying, so the 5 m tolerance is the same in every direction. A track of
  hundreds of fixes along a street becomes a handful of points; a corner stays.
- **Finish ride** opens `FinishFreeRideDialog` ("Finish this ride?", **Keep riding** first). Confirming
  (`useFinishFreeRide`) saves, in order: the route with `POST /api/routes/`
  (name "Free ride 18 Oct, 14:32" from the start time, empty description, the optimized track
  as `points`, no `waypoints`; the server calculates its distance and time), then the ride with
  `POST /api/routes/<uuid>/summaries/` using that route, `is_finished: true`, the start and
  now as the times, and the speeds. On success the rider lands on the Map tab, as after **Done**
  in ride mode. The temporary name is changed from the route list like any route.
- **Failure**: the dialog stays open with the error and the button reads **Leave without
  saving**; **Keep riding** clears the error and recording goes on, so finishing again
  is the retry. If the route was saved but the ride was not, the retry reuses that route
  instead of making another.
- **Nothing to save**: with fewer than two points recorded (the rider has not moved) the dialog
  says so and the button reads **Leave**, which goes back to the picker with nothing saved.

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
it (only the way to the start is drawn), voice guidance, and terrain elevation.
Riding a route records nothing; only a free ride records its track. A free ride does not
snap its track to the roads, does not pause, and a reload loses it.
