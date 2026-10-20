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
| Preview map | `hooks/useRoutePreviewMap.ts` | Route line, start and finish markers, framed in view |
| Ride map | `hooks/useRideMap.ts` | Pitched map with 3D buildings, the ride lines, the start and finish markers and the other riders |
| Group channel | `hooks/useGroupRide.ts`, `hooks/useGroupChannel.ts`, `hooks/useSharePosition.ts`, `services/groupConnection.ts` (over the shared `services/socketConnection.ts`), `services/groupMessages.ts` | Joins the websocket of the group, sends the rider's position every 5 s and collects the others'; see [Group ride](#group-ride) |
| Riders | `views/ride/RidersControl.tsx`, `views/ride/RidersDialog.tsx`, `views/ride/RiderRow.tsx`, `hooks/useMenuPopover.ts`, `hooks/useRiderRemoval.ts`, `views/ride/InviteRiderDialog.tsx` | The users button under the X and its dialog listing the riders of the ride: locate for the connected ones, invite and remove for the leader; see [Group ride](#group-ride) |
| Live group | `context/LiveGroupProvider.tsx`, `hooks/useLiveGroup.ts` | The group of the ride, kept up to date while it goes on (riders invited, removed, joined); read by `useGroupRide` and `RidersControl` |
| Rider markers | `hooks/useRiderMarkers.ts`, `services/riderBubbleMarker.ts`, `services/riderMarkers.ts` | One bubble marker per other rider, glided as they move and removed when they go quiet |
| Rider | `hooks/useRiderFollow.ts`, `services/riderMotion.ts` | The "You" marker and the camera that follows it, gliding between fixes, with `recenter` and `focusOn` (look at another rider) |
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
  the username is checked against `GET /api/auth/users/lookup/`, so an unknown name is
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
  Every modal `<dialog>` is opened by `useModalDialog`, which also closes it when
  the screen goes away. `cacheComponents` makes Next keep a left route hidden
  instead of unmounting it, and a modal left open there keeps blocking the whole
  document, so after leaving a ride (Done, or Quit with the confirm dialog open)
  no button of the next screen could be tapped.
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
  no list of readings kept. Readings under 10 km/h (`MOVING_SPEED_KMH`) are stops
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
  rider until they quit or finish it ([route-groups.md](route-groups.md#active-group)).
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
  then **every 5 seconds** (`POSITION_INTERVAL_MS`): the street position shown on the map
  (or the raw fix when it cannot be snapped), the speed in km/h and the accuracy. Nothing is
  sent while the position is unknown. The phone's clock is not used: the server stamps each
  position when it receives it.
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
  rider is created, glided to every new position and removed when the rider goes quiet. Riders
  report every 5 s, so each new position starts a 5 s animation (`useRiderMarkers`, with
  `interpolatePosition` and `runAnimation` of `services/riderMotion.ts`) from where the marker is
  drawn now, so a report that lands mid-glide continues from the point reached with no jump. The
  marker lags the rider by up to one report, which is what keeps it moving without pauses. A
  repeated, unchanged position does not restart the glide.
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
  (`GET /api/routes/groups/<id>/`) whenever the channel announces a rider joining or leaving, so
  everyone's list learns about riders invited or removed meanwhile. A rider invited after the
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
  leaving. A dropped connection that reconnects shows "left" and then "joined", because the
  server cannot tell it from a rider who really left.
- **Stale riders.** A rider with no report for **30 seconds** (`STALE_AFTER_MS`, six missed
  reports) is taken off the map: the channel has no leave message, so a closed app would
  otherwise freeze on the others' maps. The saved positions in `ready` are aged by the
  server's clock (`server_time`) against each `recorded_at`, so a rider who left an hour ago
  is not drawn for 30 seconds on arrival, and a phone with a wrong clock does not misjudge.
  The check runs every 5 seconds (`useNow`).
- **Failures are quiet.** If the channel cannot be joined the ride works as a solo ride: no
  other riders are drawn and nothing blocks. There is no connection indicator yet.
- **Finishing.** An accepted rider saves their own summary of the group's route
  (`POST /api/routes/<uuid>/summaries/`, which accepts routes of accepted groups); the
  summary lists only them as participant, there is no shared ride record yet.

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
- **The ride follows the group.** `GroupRideSession` renders ride mode from `group.route` and keys it by
  the route id, so a new route starts a **new ride**: the clock, the speeds, the progress and the map
  start over, and the ride on the old route is **not saved** (it is neither finished nor quit). Going
  to or from free mode swaps the free-ride screen for ride mode the same way.
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
