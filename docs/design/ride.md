# Ride

The Ride tab in [frontend/](../../frontend/): choose one of your own routes (or free
mode), invite riders, preview the route, then ride it in a 3D map, alone or with the
group the **Ride** button creates ([route-groups.md](route-groups.md)). The routes come
from the API in [routes.md](routes.md); the route creator that makes them is in
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
| Page of a joined ride | `app/(app)/ride/[groupId]/page.tsx` | Where accepting an invitation lands; renders `JoinedRideView` |
| Screen | `views/ride/RideOverview.tsx` | Shows the picker; the group that **Ride** creates is ridden at `/ride/<id>` (it replaces `/ride`) |
| Joined ride | `views/ride/JoinedRideView.tsx`, `hooks/useRouteGroup.ts` | Loads the group of `/ride/<id>` and rides in it at once, whether the rider created the group, accepted an invitation or joined back; quitting, leaving or finishing replaces the page with the Map tab (`/map`) |
| Group ride | `views/ride/GroupRideView.tsx`, `views/ride/GroupRideSession.tsx` | Ride mode on the group's route, or a free ride when it has none; the session owns the GPS and the live channel, so they outlive a change of route |
| Change route | `views/ride/ChangeRouteControl.tsx`, `views/ride/ChangeRouteDialog.tsx`, `hooks/useGroupRouteChange.ts` | The leader's route button on the ride map and the picker it opens; see [Changing the route](#changing-the-route) |
| Setup state | `hooks/useRideSetup.ts` | The routes, what is selected (default: the newest route, or free mode with no routes) and the invitees |
| Join back | `hooks/useActiveGroupPrompt.ts`, `views/ride/ActiveGroupDialog.tsx` | Before **Ride** creates a group, asks whether to join the group that is still rolling; see [Join back](#join-back) |
| Starting | `hooks/useStartGroupRide.ts`, `services/routeGroupApi.ts` | `POST /api/routes/groups/`; errors of `invitees` and `route` become the message under the button |
| Picker | `views/ride/RoutePickerView.tsx` | "Ride" heading, preview, the Route and Invitations sections, the Ride button |
| Sections | `views/ride/RideRouteSection.tsx`, `views/ride/InvitationsSection.tsx` | The chosen route (or free mode) with **Change**; the invited riders with **Add** and a remove X each |
| Dialogs | `views/ride/RouteChoiceDialog.tsx`, `views/ride/RideChoiceList.tsx`, `views/ride/InviteRiderDialog.tsx` | Choose the route (Free mode first) with **Save**; add a rider by username; both are centered panel dialogs |
| Preview | `components/route/RoutePreview.tsx` | Placeholder (or free mode), loading and failure states, or the preview map |
| Rows | `components/route/RouteItemBody.tsx`, `components/route/FreeModeItemBody.tsx`, `components/rider/RiderAvatar.tsx` | The inside of a route row, of the free mode row, and a rider's picture or initials |
| List | `components/route/RouteChoiceList.tsx` | Skeleton, error, empty and ready states of the routes (used by the route list screen) |
| Ride mode | `views/ride/RideModeView.tsx` | Full-bleed 3D map with the quit and recenter buttons |
| Free ride | `views/ride/FreeRideWaitingView.tsx`, `FreeRideSessionView.tsx`, `FinishFreeRideDialog.tsx` | Ride with no route: waits for the first fix, then shows the rider and the group, recording nothing; see [Free ride](#free-ride) |
| Free ride map | `hooks/useFreeRideMap.ts` | The pitched map that follows the rider; draws no path |
| Quit | `views/ride/ConfirmQuitRideDialog.tsx`, `hooks/useQuitRide.ts` | "Quit this ride?" dialog opened by the X, and saving the unfinished ride before leaving |
| Routes | `hooks/useMyRoutes.ts` | `GET /api/routes/`, with `reload` |
| Route | `hooks/useRouteDetail.ts` | `GET /api/routes/<uuid>/` for the selected route, with `retry` |
| Preview map | `hooks/useRoutePreviewMap.ts` | Route line, start, checkpoint and finish markers, framed in view |
| Ride map | `hooks/useRideMap.ts` | Pitched map with 3D buildings, the ride lines, the start, checkpoint and finish markers and the other riders |
| Group channel | `hooks/useGroupRide.ts`, `hooks/useGroupChannel.ts`, `hooks/useSharePosition.ts`, `services/groupConnection.ts` (over the shared `services/socketConnection.ts`), `services/groupMessages.ts` | Joins the websocket of the group, sends the rider's position every 4 s and collects the others' (one bulk message per interval); see [Group ride](#group-ride) |
| Riders | `views/ride/RidersControl.tsx`, `views/ride/RidersDialog.tsx`, `views/ride/RiderRow.tsx`, `hooks/useMenuPopover.ts`, `hooks/useRiderRemoval.ts`, `views/ride/InviteRiderDialog.tsx` | The users button under the X and its dialog listing the riders of the ride: locate for the connected ones, invite and remove for the leader; see [Group ride](#group-ride) |
| Live group | `context/LiveGroupProvider.tsx`, `hooks/useLiveGroup.ts` | The group of the ride, kept up to date while it goes on (riders invited, removed, joined); read by `useGroupRide` and `RidersControl` |
| Rider markers | `hooks/useRiderMarkers.ts`, `services/riderBubbleMarker.ts`, `services/riderMarkers.ts`, `services/riderForecast.ts`, `services/pathAhead.ts`, `services/streetLines.ts`, `services/pathWalk.ts` | One bubble marker per other rider, moved on between reports along the street at their last speed (`riderForecast`, `pathAhead`, `streetLines`) and removed when they go quiet |
| Edge indicators | `hooks/useEdgeIndicators.ts`, `services/edgeIndicators.ts`, `views/ride/EdgeIndicators.tsx` | Non-interactive bubbles on the map edge pointing to you and to each rider who is out of view |
| Rider | `hooks/useRiderFollow.ts`, `services/riderMotion.ts` | The "You" marker and the camera that follows it, gliding between fixes, with `recenter` and `focusOn` (look at another rider) |
| Heading | `hooks/useRiderHeading.ts` | The direction the rider is moving in, from their last positions |
| Progress | `hooks/useRideProgress.ts` | Where the rider is on the track (the last spot reached) |
| Ride lines | `hooks/useRideLines.ts` | The lines to draw from that progress |
| Arrival | `hooks/useRideArrival.ts` | Detects the finish (the time of the first GPS fix at the end); vibrates on arrival |
| Elapsed | `hooks/useRideElapsed.ts` | The seconds since ride mode opened, ticking once a second until the finish |
| Save | `hooks/useSaveRideSummary.ts`, `views/ride/RideSaveStatus.tsx` | Saves the finished ride on the server once, and shows saving, saved, or a failure with Try again |
| Max speed | `hooks/useRideMaxSpeed.ts`, `services/rideSpeed.ts` | The top speed of the ride from the GPS readings |
| Stats strip | `views/ride/RideStatsPanel.tsx` | The time and current speed under the map, and a button for all the other stats of the ride |
| Summary | `views/ride/RideSummarySheet.tsx` | The "You've arrived!" modal sheet with time, distance and average speed |
| Wake lock | `hooks/useWakeLock.ts` | Keeps the screen on while riding (Screen Wake Lock API) |
| Way to start | `hooks/useStreetRoute.ts` | Street route (path, distance, duration) from the rider to a point, asked again every 50 m: the way to the route start here, the way to the place in a [ride to a place](map.md#riding-to-a-place) (Directions API) |
| Track maths | `services/routeProgress.ts`, `services/rideLines.ts` | Distance along the track, and the split of the track |
| Ride layers | `services/rideMapLayers.ts` | The Mapbox line layers of a ride |
| API | `services/routesApi.ts`, `services/rideSummariesApi.ts` | `fetchRoutes`, `fetchRoute` (and `createRoute`); `createRideSummary` |
| Format | `services/formatRoute.ts` | "42.1 km", "42 min", "1 h 05 min", "42:10", "24.5", "26" |

## Picker

`RoutePreview` and `RouteChoiceList` live in `components/route/` because the
[route list](route-management.md) uses them too (the list with `size="fill"`, the preview
with `size="compact"`). The picker uses the preview the same way, so both screens have the
same map, and the route rows are the shared `RouteItemBody`. The group-ride look is in the
style guide's [Group rides](../ui-ux/group.html) page.

- The tab bar is hidden here (`useHideTabBar`), so the picker is a full-height
  screen with its own way out: an **X** at the top right (`screen-header`,
  labeled "Close"). It goes back to the screen the rider came from
  (`router.back()`), or to Home when the app was opened directly on `/ride`.
  The raised Ride button is therefore only seen on the other tabs.
- Top to bottom: the header with the X, the **compact preview map**
  (`route-preview`, `min(35dvh, 18rem)`), the **Route** section, the **Invitations**
  section, and the **Ride** button pinned at the bottom edge with the safe-area padding.
  The middle (`route-screen-scroll`) scrolls when the sections add up to more than the
  screen, between the header and the pinned button; with many invitees the screen scrolls
  instead of squashing the map.
- **Route section.** One row, the selected route (icon, name, distance and estimated time)
  or **Free mode** (primary icon tile, "No route, ride wherever you want"), with **Change**
  on the heading's right. The default is the **newest route**; a rider with no routes starts
  in free mode. While the routes load the row is a skeleton and Ride is disabled.
- **Change** opens `RouteChoiceDialog`, a centered panel dialog ("Choose a route"): **Free mode first,
  then the routes**, newest first, in a box exactly four rows tall that scrolls. The chosen
  row has `aria-pressed` and a check, as before. **Save** applies the choice and closes the
  sheet; the X or Esc closes it and leaves the choice as it was. Free mode is **not a button
  below Ride any more**: it is a row of this list, so it is chosen like a route. Loading and
  failure ("Could not load your routes", with Try again) show under the list, so free mode is
  always choosable.
- **Preview.** A route's path is fetched when it is chosen (the list does not carry points)
  and the map frames it with a start flag and a finish flag; the previous route stays on
  the map until the next has loaded. Free mode shows "Free mode: no route to follow".
  Ride is enabled when free mode is chosen, or the **chosen** route has loaded (not a
  previous one).
- **Invitations section.** Empty: "Riding solo. Add riders by username to ride together."
  **Add** opens `InviteRiderDialog` (the guide's centered panel dialog with a form, label above the field):
  the field completes the name as it is typed (`UsernameField`: after a 200 ms pause it asks `GET /api/auth/users/search/?q=`
  and lists up to five matching riders, without the ones already added, under the field; arrow keys and Enter or a tap pick one).
  Whatever is in the field is then checked against `GET /api/auth/users/lookup/`, so an unknown name is
  refused **in the dialog** ("No rider with this username."), not when Ride is pressed; so
  is your own name ("You lead this ride already.") and a name already added. Each invited
  rider is a row with their picture or initials, their name and a trash button (`Remove <name>`), not an X, so it is not mistaken for closing the screen.
  At nine invitees (`MAX_INVITEES`, ten riders with you) **Add** goes away and a line says
  the group is full. Nobody is notified yet: that happens when Ride is pressed.
- **Ride** creates the group (`POST /api/routes/groups/`, see
  [route-groups.md](route-groups.md#api)), which also notifies the invitees, then opens the
  ride. While it works the button shows the loading state; a failure (unknown name, network)
  appears as an alert above the button and the setup stays as it is.
- **Join back.** Pressing **Ride** first asks the server for the active group
  (`GET /api/routes/groups/active/`, see [route-groups.md](route-groups.md#active-group)); the button
  shows its loading state meanwhile. With none (or if the check fails: not knowing must not block a
  ride) the group is created as usual. With one, `ActiveGroupDialog` opens
  ("Join your group ride?", the route name or Free mode and "Led by ana · 3 riders"): **Join back**
  goes to `/ride/<id>`, **Ride another** creates the new group the rider set up, and Esc closes
  the dialog with nothing started. The new group then becomes the active one for everybody else. Home
  shows the same group in its own section, see [frontend-screens.md](frontend-screens.md#placeholder-content).
- States: skeleton row while loading; "Could not load this route" with Try again in the
  preview.

## Ride mode

- **Ride** swaps the picker for `RideModeView`. Like the route creator and
  the picker it hides the tab bar (`useHideTabBar`), except on its map-failure
  screen, which has no exit of its own.
- The map is pitched at 60 degrees, zoom 16.5, with the buildings of the
  Mapbox streets data extruded (`fill-extrusion`, `services/buildingsLayer.ts`)
  and the route drawn as in the other maps, with start and finish markers and a numbered
  checkpoint for every point the rider chose in between (see [Checkpoints](#checkpoints)).
  The map colors and the light and dark styles are the same as the
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
  (bottom center, see below) resumes it (an 800 ms ease to the rider's position, heading, the ride zoom of 16.5 and the ride
  pitch of 60°, so a pinch-out or a tilt of the camera is undone too). Without a
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
  is hidden, so the strip carries the bottom safe area). Two boxes and a button: **Time**
  (`useRideElapsed`, as a stopwatch `min:sec`, `h:mm:ss` from an hour up) and
  **Speed** in km/h. Time starts at 0:00 when ride mode opens (the way to the
  start counts, and it does not wait for a GPS fix), counts up each second, and
  stops at the finish, where it matches the summary. Speed is
  the GPS reading (`coords.speed`, passed on by `useGeolocation`, m/s rounded
  to km/h); it is a dash when the device gives none. It is not a blocking modal
  on purpose: the rider keeps the map while the numbers stay in view. The locate
  button sits at the middle of the map's bottom edge, just above the strip.
- **All the stats.** The chevron button at the end of the strip (`ride-panel-toggle`, "Show all stats" /
  "Hide all stats", `aria-expanded`) shows or hides a grid of the rest of the stats of the
  [summary](#ride-mode), four in one row (a compact `body2` value so "1 h 05 min" still fits a 390px phone): **Distance** of the route, **Estimated** time, **Avg km/h** (the
  kilometres covered so far over the elapsed time; at the finish it is the summary's: the route's distance
  over the time) and **Max** km/h (from [Ride speeds](#ride-speeds)). The grid
  starts hidden, to leave the map its room, and the strip grows upwards when it opens. A free ride has no
  route, so its grid has only the max speed (`useRideMaxSpeed` runs there too). Under the four stats
  come the [checkpoint times](#checkpoint-times) (the start and the finish, at least). All the stats start over
  with a new ride, see [Changing the route](#changing-the-route).
- **Arrival** (`useRideArrival`): the rider has arrived when the progress on
  the track is within 40 m of its end (`ARRIVAL_METERS`). The phone vibrates
  and `RideSummarySheet` opens: a modal sheet ("You've arrived!", the guide's
  `sheet-modal` with a close X) with the route name and three `route-stats`:
  **Time**, **Distance** and **Avg km/h**, then the route's estimated time
  the [checkpoint times](#checkpoint-times) and a **Done** button. Done only closes the sheet, like its X and Esc: the rider stays on the
  map, in the group and connected to its live channel, so the others keep seeing them and they
  keep seeing the others. Finishing the route does not leave the group; the X on the map does
  (it needs no confirmation once the rider has arrived), and replaces the screen with the Map tab
  (`router.replace('/map')`, so Back does not return to the ride). Time is the strip's clock, stopped at the
  first GPS fix at the end (that fix's own timestamp, `GeolocationPosition.timestamp`,
  passed on by `useGeolocation`). Stops are not paused, so Time is the elapsed
  time, and Distance and Avg km/h use the route's own length, not the path the
  rider actually took.
  Every modal `<dialog>` is opened by `useModalDialog`, which also closes it when
  the screen goes away. `cacheComponents` makes Next keep a left route hidden
  instead of unmounting it, and a modal left open there keeps blocking the whole
  document, so after leaving a ride (Quit, with the confirm dialog open)
  no button of the next screen could be tapped.
  The guide shows it in [patterns.html](../ui-ux/patterns.html) ("Ride summary"),
  with `map-scrim` standing in for the dialog backdrop.
  **Saving the ride**: when the summary appears, `useSaveRideSummary` posts the
  ride once to `POST /api/routes/<uuid>/summaries/` ([routes.md](routes.md#route-summaries))
  with the time ride mode opened as `start_at`, the arrival time as `end_at`
  (the same two instants the Time box measures) and the top speed below. The sheet
  shows "Saving your ride…", then "Ride saved."; if the request fails it shows
  "Could not save your ride." with **Try again**, and Done and the X still work
  (an unsaved ride is lost when the rider leaves). A fix older than the ride
  (the browser may reuse a cached one) is moved to one second after the start so
  the server accepts it (`createRideSummary` does this for every save).
  Quitting before the finish saves an unfinished ride (see the X below). Saved rides
  are listed in the [ride history](ride-history.md).
- <a id="ride-speeds"></a>**Ride speeds** (`useRideMaxSpeed`, `services/rideSpeed.ts`): each new GPS fix
  (counted once per `timestamp`) is compared with the top speed so far, in km/h, and
  no list of readings is kept. The top speed freezes when the rider arrives and is sent
  with the ride. With no speed from the device it is null, which the history shows as
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
  a `map-controls` block of one, so it is the same translucent button as the
  other map controls), within reach of either thumb whichever hand is on the
  throttle. The rarely used **X** stays at the top right, out of the way of
  accidental taps.
- **X** (top right, `Quit ride`) asks first while the ride is in progress:
  `ConfirmQuitRideDialog` (the guide's confirm dialog, a native
  `<dialog class="dialog" role="alertdialog">`) says "Quit this ride? The ride so
  far is saved to your ride history, marked as not finished." with **Keep
  riding** (outline, first) and **Quit ride** (`button-error`). Keep riding and
  Esc close the dialog and the ride goes on.
  **Quit ride** saves the ride so far, then leaves (`useQuitRide`): `start_at` is
  when ride mode opened, `end_at` is now, `is_finished` is `false`, and the top speed
  so far goes with it. While it saves, both buttons are disabled and Quit shows
  the loading state. If the save fails the dialog stays open with the error and
  the button reads **Quit anyway**, which leaves without saving, so a bad
  connection never traps the rider. Leaving goes back to the picker with the same
  route still selected. After arrival the ride is already saved, so the X leaves
  at once with no dialog and no second summary. The tab bar stays hidden, as it is
  in the picker. Nothing is recorded while riding a route (no track, no turn-by-turn); the
  server keeps only the summary of the ride.

## Checkpoints

The points the rider chose when drawing the route (its `waypoints`, see [routes.md](routes.md#waypoints))
are on the map the whole time, in the picker preview and in ride mode alike (`addRouteMarkers` in
`services/routeMapLayers.ts`): the start flag, the finish flag, and between them one **numbered marker**
per point, numbered like in the route creator (the start is 1). They are plain markers, not buttons.

- **Ride mode gets them from the group**: `GroupRouteSerializer` includes `waypoints`, and
  `RideRoute` carries them, because a member cannot read the leader's route through the route endpoint.
- **A route without waypoints** (saved before they were stored) shows only the start and the finish, and has
  no checkpoint times.
- **The shared page of a route** (`/routes/<id>`) does not show them: that endpoint never returned the waypoints
  ([route-sharing.md](route-sharing.md)).

### Checkpoint times

<a id="checkpoint-times"></a>Ride mode records when the rider reaches the start and then each checkpoint (`useCheckpointTimes`): the waypoints
between the first and the last, in route order. A stop counts as reached in any of these ways
(`CHECKPOINT_METERS`, 40 m, like the finish):

- **Along the track.** The rider's progress on the track is within 40 m of it. `measureCheckpoints`
  (`services/routeProgress.ts`) places each stop along the track, never before the one ahead of it. This covers
  a gap in the GPS: a stop passed between two fixes shares the later fix.
- **Beside it on another street.** The hook also follows how far along the track the rider has got while they are
  off it (`trackPassing`): the spot of the track closest to them, only forward and only up to 400 m ahead of the
  last one, and only while they are within 100 m of the track (`PASSING_METERS`). Riding down a parallel street
  marks each checkpoint as the rider draws level with it. This is kept apart from `useRideProgress`, so it does
  not move the route line or the arrival at the finish, which still need the rider on the track. Until anything is
  known of how far the rider has got, the stretch ahead is the whole track once the first 400 m have found nothing:
  a rider who closes the app and joins the group back (see [Join back](#picker)) starts with no progress, and
  may be on a parallel street anywhere along the route, so the checkpoint they draw level with is marked.
- **Near it, wherever the rider is.** The rider's position is within 40 m of the stop in a straight line. Once it
  is known how far the rider has got, this only counts for a stop that is no more than 100 m ahead of them along
  the track (`PASSING_METERS`). A route that comes back past itself, or a checkpoint next to the start, puts the
  rider in a straight line from stops far ahead of them, and marking those (and every stop before them) was what
  showed the first checkpoint as 0:00 as soon as ride mode opened. Until the progress is known (the rider is
  still away from the track, or has just joined back) any stop near them counts.

Reaching a stop reaches all those before it (the furthest one reached decides), like the route line colors the
whole stretch behind the rider: a checkpoint skipped by taking another street is marked as soon as the rider
draws level with it, goes past it or comes back to the route, with the time of that fix.

The start counts once the rider is there, not when ride mode opens, as they may still be riding to it. The time
kept is that of the first GPS fix that showed it. A stop is recorded once, and the times are only ever added to:
the group reloads the route as new arrays whenever someone joins or leaves, and that must not erase them. They
freeze when the rider arrives, since the ride is saved with them then. A new route (the leader changed it)
remounts the ride (`key` on the route id) and starts them over, as the other stats, and so does joining the group
back: the ride mode of the new screen knows nothing of the one before. The finish is still reached by arrival along
the track (`useRideArrival`).

- **Where they show.** `CheckpointTimes` (`components/route/`), a flat `list` with **the start, every checkpoint
  of the route and the finish**, one row each, in route order, so a route with no points in between still lists
  its start and finish. A stop not reached yet is gray (`avatar`, `list-item-pending`): "Not reached yet" and a
  dash. Once reached it is colored (`avatar-primary`, the green of the map markers; a checkpoint that is a saved place is `avatar-place`, the blue of its map marker, with its kind's icon and its name as the title, while any other checkpoint is titled by its address or "Checkpoint N") and shows **the hour** it was
  reached at (`At 09:12`, the reader's locale), followed by **the average speed since the stop before it**
  (`At 09:12 · 24.5 km/h`) and, on the right, **the time it took** from the moment ride mode opened as a
  stopwatch (`8:41`). The speed of a leg is its length along the route over the time between the two stops:
  `measureLegs` (`services/routeProgress.ts`) measures each leg, from the start to the first checkpoint and on
  to the finish, and `useRouteLegs` hands the lengths to `CheckpointTimes` as `legKilometres`. The **start's leg
  is the ride to it**: from the moment ride mode opened until the rider got there, over the straight-line
  distance from their first known position to the start (`useApproachKilometres`, passed as
  `approachKilometres`; the real path is not recorded, so this is a lower bound). A rider who opens ride mode
  already at the start (within 40 m) has no such leg, and the history's summary does not keep where the ride
  began, so the start shows no speed there. A stop shows no speed when the route has no stored waypoints (old
  routes), or when it and the stop before it were marked at the same moment (passing several checkpoints at
  once marks them together, so there is no time between them). A stop marked late, because the rider only came
  beside it after a detour or after joining the group back, has the time of the fix that showed it, so the speed of
  the leg that begins there is overstated.
  **The next stop, still gray, shows the speed so far** of the leg the rider is on (`Not reached yet · 24.5 km/h so
  far`): the distance from the last stop reached to the rider's latest fix over the time between them
  (`currentLeg`, from `useCheckpointTimes`). The distance is how far the rider has got along the track from that
  stop or the straight line to it, whichever is longer, so a rider on another street still has a speed. It shows
  nothing before the rider reaches the start, or at the same fix that marked the last stop, and the history does
  not have it (a finished ride has no position). The start shows the flag, the finish shows the checkered
  flag and is reached on arrival; the checkpoints show their number (the first is 2, like the markers) and their
  count is the route's waypoints between the first and the last (`countCheckpoints`). It is in the expanded ride
  stats, in the "You've arrived!" sheet and in the history's ride summary ([ride-history.md](ride-history.md)).
  In the strip it scrolls within 30% of the screen so many checkpoints do not squeeze the map. The guide shows
  it in [patterns.html](../ui-ux/patterns.html).
- **Saved with the ride.** The times go as `reached_at` in the save at the finish (`useSaveRideSummary`) and in the
  unfinished one of a quit (`useQuitRide`, with the checkpoints reached so far); see
  [routes.md](routes.md#route-summaries). A free ride has no checkpoints.

## Riding to a place

The Map tab's search starts a ride to a picked place with the screen of ride mode but no route, group or
summary of a route: the path is recalculated from the rider's current position, and the summary saved at the end
is a `destination` one. See
[map.md](map.md#riding-to-a-place).

## Free ride

A ride in **free mode** (chosen as a row of the route dialog, see [Picker](#picker); there is
no Free ride button any more) has no route to follow, and **nothing of it is drawn or recorded**:
no path is shown on the map and the rider's positions are not collected into a track, so there is
no route and no ride summary to save. It is a group of its own like any ride, so riders invited to
it see each other on the map.

- **Start** (`GroupRideSession`): a free ride cannot start without a position, so until the first
  GPS fix arrives `FreeRideWaitingView` shows the status ("Finding your location", "Location
  is turned off", "Location unavailable") with an X back to the picker. The fix (snapped to a
  street when possible, as in ride mode) then opens `FreeRideSessionView`.
- **Screen** (`FreeRideSessionView`): the same layout as ride mode: pitched 3D map that follows
  the rider (`useFreeRideMap`, which reuses `useRiderFollow`/`useRiderHeading`), the stats strip
  (time and speed), the locate button, no tab bar, screen kept on. Only the rider and the other
  riders show on the map. The top-right button is a checkered flag, **Finish ride**, not an X:
  there is no destination, so the rider ends it whenever they want.
- **Finish ride** opens `FinishFreeRideDialog` ("Finish this ride?", **Keep riding** first, and
  "A free ride is not recorded, so nothing is saved"). Confirming goes back to the picker and
  takes the rider out of the group like any exit (see [Group ride](#group-ride)). Nothing is
  sent to the server, so there is no failure to retry.

## Key decisions

- **Every ride has its own page, `/ride/<group id>`**: **Ride** creates the group and replaces
  `/ride` with that page, so a reload (or the app being closed and opened from Home's **Join
  back**) reopens the same ride; the timer starts again. The price is that quitting returns to
  the Map tab (not the picker), so the route and invitations are chosen again for the next ride. The ride stays open for the
  rider until they quit it ([route-groups.md](route-groups.md#active-group)).
- **A ride is always a group**: even alone, **Ride** creates a `RouteGroup`, so there is one
  path for solo and shared rides. Quitting and riding again creates a new group (and
  notifies the invitees again); the earlier one stays on the server.
- **The list does not include points**: so the picker fetches one route when
  selected, and only that route's thousands of path points are sent.
- **Shared map pieces**: both maps and the route creator use `useMapInstance`
  (create the map, remove it, keep it sized to its container) and the layer
  helpers in `services/routeMapLayers.ts`. The container is observed with a
  `ResizeObserver` because Mapbox only resizes on window resize, and hiding
  the tab bar changes the map's height after it was created.
- **The rider is not required to start**: a ride can be previewed or started
  without location permission; the map then shows the route only.

## Group ride

Ride mode and the free ride share the group's live channel
([route-groups.md](route-groups.md#live-channel)); `useGroupRide` is the one hook both call.

- **Sharing.** Once the socket has signed in and the server said `ready`
  (`services/groupConnection.ts`), `useSharePosition` sends the rider's position at once and
  then **every 4 seconds** (`POSITION_INTERVAL_MS`): the street position shown on the map
  (or the raw fix when it cannot be snapped), the speed in km/h and the accuracy. Nothing is
  sent while the position is unknown. The phone's clock is not used: the server stamps each
  position when it receives it.
- **Receiving.** The server does not forward each rider's report; every 4 s it sends **one `positions` message
  with the positions of all the other riders that changed** ([route-groups.md](route-groups.md#live-channel)).
  `useGroupChannel` merges the whole message into the riders' positions in a single state update, so a group
  of any size is one message and one render per interval. Each position is dated with the server's stamp moved
  by how far this phone's clock is from the server's (`server_time` of the message), not with the moment the
  message arrived, so a position that waited up to an interval for its batch is known to be that old.
- **Signing in.** The socket is same-origin, `wss://<host>/ws/routes/groups/<id>/`; Next's
  rewrite forwards the upgrade to Django (checked with `next dev` and `next start`, see
  [asgi-websockets.md](asgi-websockets.md)). The first message carries the access token, which
  is renewed first when less than a minute is left (`getAccessToken`). A `4401` close renews it
  once and retries; a `4403` (not in the group) or a second `4401` stops for good. Any other
  drop reconnects after 1, 2, 4, 8, then every 15 seconds, and `ready` resets that. A pending
  retry is also tried at once when the app becomes visible again or the browser comes back online,
  because a phone that was locked may have slept through the timer.
- <a id="background"></a>**Staying visible.** A web page is only allowed to run while it is shown: when
  the screen locks or another app takes over, browsers throttle or freeze its timers, its sockets and
  its GPS watch. The ride therefore keeps the screen on with the wake lock ([Ride mode](#ride-mode),
  `useWakeLock`) so it does not lock while the rider is on the app, and nothing plays in the
  background. Leaving the app for another one still pauses the sharing, because the lock is released
  whenever the page is hidden. When the app becomes visible again the wake lock is requested again,
  the GPS watch is registered again (`useGeolocation`), a position is sent at once
  (`useSharePosition`) and the socket reconnects at once. Sharing that continues with the app in the
  background needs a native app with background location, which this PWA is not. A rider who comes
  back after being away finds the ride on Home ([Join back](#join-back)).
- **Others on the map.** Each rider who reported recently is a **bubble above a dot**
  (`rider-marker`, the style guide's [Group rides](../ui-ux/group.html)): their picture, or
  their initials, in a bubble with the dot on their exact position, in the primary green so
  it differs from the ink "You" dot. The marker is named for screen readers
  (`role="img"`, `aria-label` the username) and does not take taps. Names and pictures come
  from the group (`GET /api/routes/groups/<id>/`), positions from the channel; one marker per
  rider is created, moved as the rider moves and removed when the rider goes quiet. See
  [Predicted movement](#predicted-movement).
- **Predicted movement.** <a id="predicted-movement"></a>A rider reports every 4 s, and a report is already old
  when it arrives (it waited for the rider's send and for the server's batch), so a marker that only went to the last report would always show the rider behind where they are.
  `useRiderMarkers` therefore keeps every marker **moving between reports**, at the speed of the last one, along the
  street the rider is on (the position reported is already snapped to a street):
  - **Forecast.** Each report starts a `Forecast` (`services/riderForecast.ts`): a short street path from the reported
    position and a speed in m/s. The speed is the `speed` the report carries (km/h, forwarded by the server and read
    by `parseGroupMessage`), or else the distance between the last two reports over the time between them; under
    1.5 km/h the rider is standing and the marker does not move. The direction is the bearing between the last two
    reports (`estimateHeading`), kept while the rider has not moved 5 m. Position at `now` is the path at
    `speed * (now - report time)`, held at the end of the path.
  - **The street.** The path is made by `findPathAhead` (`services/pathAhead.ts`), long enough for `MAX_FORECAST_MS` at that speed:
    the **route** of the ride when the rider is within 25 m of it, with the route's own turns, walked in the
    direction of the heading; else the **streets drawn on the map** around them (`services/streetLines.ts`: the road
    lines of the style's `road` source layer that `queryRenderedFeatures` finds in the tiles already loaded, so there
    is no request), following the street they are on and, at each junction, the street that bends least (no U-turns,
    at most 110 degrees); else a straight line along the heading, which is what a rider off screen gets, as the map
    has no streets loaded there and nobody sees them. The free ride has no route and uses the streets.
  - **No jumps, no lurches.** A new report moves the forecast to where the rider really was. The marker is drawn at
    `forecast(now) + correction`, and the correction starts as the gap between where the marker was drawn and where the
    new forecast puts it, with the rate the gap was changing at, and fades out critically damped (time constant
    700 ms). Both the position and the speed of the marker are therefore continuous when a report lands, whether
    the rider sped up, slowed down or the report came late.
  - **Signal lost.** If reports stop, the marker goes on at the last speed for `MAX_FORECAST_MS` (15 s: the age of a report, plus a missed one) and then
    waits where it got to, until the rider reports again or is taken off the map (**Stale riders**). A rider who
    is standing, or has no speed to tell by, is not moved.
  - **Measured** in a browser against a street route of 2.4 km, two riders driving it at 29 km/h with fake GPS and
    a third watching: reports every 4.0 s, 17 `positions` messages in 48 s where one message per rider would
    have been 30, the marker never more than 0.5 m off the street (route and free ride), 6 to 9 m behind the
    rider in steady driving (the sender's own delay between the GPS fix and the send) against 33 to 39 m for the
    last report alone, and a speed that stays within 8 to 13 m/s for a rider at 8 m/s. Right after a standstill
    the marker is still until the first report that shows the rider moving, up to one interval.
- **Change route.** The leader also has the **route** button (`ChangeRouteControl`) under the users
  button; see [Changing the route](#changing-the-route).
- **Riders.** The **users** button (`RidersControl`, "Riders") sits under the X (or the flag in a
  free ride) in the same top-right control block, and opens `RidersDialog`, a centered panel dialog with
  every other rider of the group: picture or initials, name and a line under it. The riders on the
  map now say "Connected" and offer **Center the map on ana** in their more-options menu (see
  below); the rest say "Invited" or "Not connected" (accepted but quiet) and have no such option,
  since there is no position to go to. Choosing it closes the dialog and eases the camera to that rider's position at the ride
  zoom over 800 ms (`focusOn` of `useRiderFollow`), which also stops the camera following you, as
  dragging the map does; the locate button at the bottom brings it back to you. It is a one-off
  move: the camera does not keep following the other rider. The camera keeps the current heading
  and pitch. With nobody else in the group the dialog says "Nobody else is here".
- **Off-screen indicators.** When you, or another rider, are out of the map's view (the camera was dragged
  away, or is looking at another rider), a bubble appears on the map edge, one per person, on the line
  towards where they are, with a green arrow pointing the way (`edge-indicator` in the style guide). Riders
  show their picture or initials; yours is the ink disc reading "You". It is only a hint, not a control: it
  takes no taps (`pointer-events: none`), so the map keeps every gesture, and there is nothing to press to
  recenter besides the locate button. A person in view gets no bubble, so while the camera follows you only
  riders appear. `useEdgeIndicators` recomputes them on every map `move` and `resize` and whenever a position
  changes, through `services/edgeIndicators.ts`: a position is out of view when it is behind the camera or
  its `map.project` point is outside the map. The direction is worked out from the camera's own position
  (`getFreeCameraOptions`), bearing and pitch, so it is the true screen direction on the pitched 3D view,
  also for positions behind the camera, where `project` has no answer; the bubble sits where that line from
  the center of the map leaves it, inset 36 px from the sides and top and 80 px from the bottom to clear
  the center button (the controls column at the top right can still cover one). Both ride maps
  (`useRideMap`, `useFreeRideMap`) return the indicators and render them with `views/ride/EdgeIndicators.tsx`.
- **Promoting.** **Promote to leader** asks first with the confirm dialog "Make ana the leader?" (**Cancel**
  first, **Make leader** in the primary color, since it is not destructive: "They will be able to change the
  route and to invite and remove riders. You stay in the ride as a rider."). Confirming calls
  `POST /api/routes/groups/<id>/leader/` (`useRiderPromotion`, [route-groups.md](route-groups.md#changing-the-leader));
  the group answered replaces the shown one, so the leader's controls (route button, invite, remove, promote)
  move at once to the new leader, and the former one keeps the plain list. The other riders hear
  `leader_changed` and read the group again; `useGroupRide` shows the notice "ana leads the ride now" (or
  "You are the leader of the ride now" to the new leader, with a crown icon). The same happens when the leader leaves or quits the
  ride: the next rider who is riding becomes the leader automatically
  ([Leaving](route-groups.md#leaving)).
- **Inviting and removing.** Only the **leader** (the group's author) sees the controls; the
  others get the plain list. **Invite a rider** (an outline button under the list, replaced by a
  note once the group has 10 riders) opens the same `InviteRiderDialog` as the setup, with the
  hint "They get the invitation at once." It takes the place of the riders list while it is open (the list is unmounted, never stacked under it) and the list comes back when the form closes, whether by the X, by Esc or after inviting: the username is checked with the lookup, then
  `POST /api/routes/groups/<id>/invite/` ([route-groups.md](route-groups.md#inviting-and-removing)) notifies the rider
  and the dialog closes; a refusal (already in the group, group full) shows under the field. Every
  row with something to do is selectable (`RiderRow`, a `list-item-main` button with `aria-pressed`): a tap tints
  the row and shows a more-options button (`icon-more`, `More options for ana`) on it, and only one
  row is selected at a time; the button opens an action menu (`useMenuPopover`, in the top layer so the dialog's scrolling cannot cut it off: arrow keys,
  Escape closes only the menu) with **Center the map on ana** (connected riders, for everyone) and, for the
  leader, **Promote to leader** (crown icon, riders who are riding only) and **Remove ana** with the trash icon in the error color, which asks
  first, with the confirm dialog "Remove ana?" (**Cancel**
  first, **Remove** in the error color): the rider is taken out of the group, whether they had
  accepted or were still invited, and can be invited again. A failure keeps the question open with a
  message.
- **Coming back to a ride.** Next keeps a screen the rider left, with its state, and shows it again for
  the same address (`cacheComponents`). A rider who led a group, left it and was invited again lands on
  `/ride/<id>` again, but the group may have another leader by then. `useRouteGroup` therefore forgets the
  group it read when the screen is hidden and reads it again when it comes back (the loading screen shows
  meanwhile), so the leader's controls never outlive the lead.
- **Live group** (`LiveGroupProvider`, `useLiveGroup`). The group is read once when the ride opens
  but its riders change during it, so `GroupRideView` keeps it in a context for the ride screen.
  It is replaced by the group the invite and remove calls answer, and read again
  (`GET /api/routes/groups/<id>/`) whenever the channel announces a rider joining or leaving, and
  every time the channel signs in (`ready`), so everyone's list learns about riders invited or removed
  meanwhile, including the ones missed while this rider's socket was down (a locked phone, or a ride
  screen Next kept hidden and shows again). A rider invited after the
  others opened the ride therefore shows on their map from the moment they connect (the "joined"
  toast is skipped for that first time, as the name is not known yet).
- **Removed riders.** The removed rider's channel is closed (`4403`) at their next position, and the
  others hear "left". Their screen shows the toast "You are no longer in this ride"; the ride stays
  open, as a solo ride that shares nothing, until they leave it.
- **Joins and leaves.** The channel tells the others when a rider signs in or drops
  (`presence`, [route-groups.md](route-groups.md#live-channel)). `usePresenceNotice` turns it
  into a toast at the top of the ride screen (`toast-region`, the `Toast` with the `users`
  icon): "ana joined the ride" / "ana left the ride", the name read from the group's
  participants. One toast at a time, each lasting 5 seconds: a newer one waits its turn, in the order
  it came (at most three wait; the oldest waiting one is dropped), so the "You are the leader of the
  ride now" toast (crown icon) is not lost under the "ana left" of the leader who handed over by
  leaving. The server cannot tell a dropped connection from a rider who really left, so the client
  holds each "left" for **20 seconds** (`PRESENCE_GRACE_MS`): a rider who signs in again meanwhile (a
  locked screen, another app, a network blip) shows neither toast, and their marker stays on the map
  throughout (see **Stale riders**). The group is still read again at once, only the toast waits.
- **Stale riders.** A rider with no report for **30 seconds** (`STALE_AFTER_MS`, seven missed
  reports) is taken off the map: the channel has no leave message, so a closed app would
  otherwise freeze on the others' maps. The saved positions in `ready` are aged by the
  server's clock (`server_time`) against each `recorded_at`, so a rider who left an hour ago
  is not drawn for 30 seconds on arrival, and a phone with a wrong clock does not misjudge.
  The check runs every 4 seconds (`useNow`).
- **Failures are quiet.** If the channel cannot be joined the ride works as a solo ride: no
  other riders are drawn and nothing blocks. There is no connection indicator yet.
- **Finishing.** An accepted rider saves their own summary of the group's route
  (`POST /api/routes/<uuid>/summaries/`, which accepts routes of accepted groups); the
  summary lists as participants the riders connected to the group at that moment (the client sends the
  `group`, see [routes.md](routes.md#ride-participants)), and each rider saves their own copy.

## Changing the route

The leader can change the route of the ride, or go to free mode, at any moment, in ride mode and in
a free ride. The **route** button (`icon-route`, "Change route") is the last of the top-right control
block; riders who are not the leader do not see it, since the route is the group's and
[only the leader manages the group](route-groups.md#key-decisions).

- **Dialog.** It opens `RouteChoiceDialog`, the same centered "Choose a route" dialog as the picker (Free
  mode first, then the leader's routes, with the current choice ticked), through `ChangeRouteDialog`,
  which loads the routes only when it opens. **Save** with the current choice just closes. Otherwise it
  calls `POST /api/routes/groups/<id>/route/` (`useGroupRouteChange`): the button shows the loading
  state, a failure keeps the sheet open with the message, and success replaces the group shown
  (`replaceGroup`) and closes it.
- **Create a route.** Under the list, **Create a route** (outline button, plus icon) lets the leader draw a
  route without leaving the ride. `ChangeRouteDialog` swaps the picker for `RouteCreatorView`, the same
  creator as the map's, drawn from where the leader is, in a `screen-overlay` rendered into the body
  (`createPortal`) so the ride stays mounted underneath: the position keeps being shared and the
  socket stays open, so the others see nobody leave. The button is absent until the leader has a
  position. Saving the route (the usual name sheet) closes the creator, reloads the leader's routes and
  brings the picker back with the new route **chosen**; it is applied to the group only when the leader
  presses **Save**, like any other choice. The X of the creator comes back to the picker as it was.
- **The ride follows the group.** `GroupRideSession` renders ride mode from `group.route` and keys it by
  the route id, so a new route starts a **new ride**: the clock, the top speed, the progress and the map
  start over, and the ride on the old route is **not saved** (it is neither finished nor quit). Going
  to or from free mode swaps the free-ride screen for ride mode the same way. Every rider, the leader
  included, gets the toast "Ride stats were reset for the new route" (or "...for the free ride") once
  their group shows the other route (`useStatsResetNotice`), after "ana changed the route" for the others.
  The strip's open or closed state also starts closed again.
- **The channel is kept.** The GPS and `useGroupRide` live in `GroupRideSession`, above the route
  screens, so changing route does not reconnect the socket. Otherwise every rider would hear the
  leader "leave" and "join" at each change.
- **The others.** The channel sends them `route_changed` ([route-groups.md](route-groups.md#live-channel));
  `useGroupRide` shows the toast "ana changed the route" and reads the group again, and their screens
  switch like the leader's. A rider whose socket was down when it happened keeps the old route until
  the group is read again (a rider joining or leaving does that).

## Not included

Distance left, off-route detection and a way back to the track after leaving
it (only the way to the start is drawn), voice guidance, and terrain elevation.
Neither a route ride nor a free ride records the rider's track, and a free ride is never saved. A free ride does not
pause, and a reload loses it. For group rides: changing
the route of a group while it rides, a trail or history of the other riders, a connection indicator on the ride screen, a camera that keeps following another rider, riders other than the leader inviting or removing, and leaving a group in the middle of
a ride (a rider who quits just stops reporting).
