# Track mode

A ride mode on the Ride tab, chosen like free mode ([ride.md](ride.md#picker)): the rider rides wherever they want and the
app **records the path ridden**. When they finish, the path becomes a **route** named "Track" and the day (`Track 22 Nov
2026`), made of the fewest waypoints that lead along the same streets, and the ride is saved on it in the
[ride history](ride-history.md). The group, the other riders and the map are those of a free ride
([ride.md](ride.md#free-ride), [route-groups.md](route-groups.md)); the route and ride APIs are the existing ones
([routes.md](routes.md)).

## Pieces

| Piece | File | Job |
|-------|------|-----|
| Group flag | `RouteGroup.is_track` ([models.py](../../apps/routes/models.py)) | Track mode is a free-mode group (no route) with this set; the create and change-route calls take `is_track` ([route-groups.md](route-groups.md#changing-the-route)) |
| Selection | `types/rideSelection.ts`, `services/rideSelection.ts`, `components/route/TrackModeItemBody.tsx` | `{kind: 'track'}`, its row in the route dialog (second, after Free mode) and the conversion to and from the group |
| Session | `views/ride/GroupRideSession.tsx` | A group with no route and `isTrack` renders `TrackRideSessionView`; a new mode remounts the screen, so the recording starts over |
| Screen | `views/ride/TrackRideSessionView.tsx`, `views/ride/FollowRideScreen.tsx` | The free ride's screen with the flag button **Finish track**, and Distance and Avg km/h in the expanded stats |
| Recorder | `hooks/useTrackRecorder.ts` | The path ridden so far and its length |
| Finish | `views/ride/FinishTrackSheet.tsx`, `hooks/useSaveTrack.ts` | The modal sheet that asks to finish and saves; see [Saving](#saving) |
| Route builder | `services/trackRoute.ts`, `services/pathDeviation.ts` | Track in, route (street path, waypoints, time at each) out; see [Building the route](#building-the-route) |

## Recording

`useTrackRecorder` keeps a point (position and the time of the fix) whenever the rider has moved **10 m** from the last point
kept; closer moves are GPS noise. The position is the one the ride map shows (the street position, or the raw fix when it cannot
be snapped). Nothing is recorded until a fix has a time. The points live in the screen's state, so the track is lost when the
screen goes away: a reload, quitting the app or leaving the ride, as with the [free ride](ride.md#free-ride).

## Finishing

The flag button opens `FinishTrackSheet` ("Finish this track?"), with a snapshot of the track and the moment it was asked for
(the ride goes on recording and the clock on ticking underneath; the snapshot is what gets saved). It shows time, distance, average
and top speed and the name the route will get.

- **Keep riding** (and the X and Esc) close it; they are disabled while saving.
- **Save track** saves, then leaves the ride (`onLeave`, like any exit: it leaves the group and goes to the Map tab).
- **Too short.** A track under 100 m (`MIN_TRACK_METERS`) is not worth a route: the sheet says so, and its only way forward is
  **Leave ride**.
- **A failed save** shows the error, turns the button into **Try again** and adds **Leave without saving**, so a bad connection
  never traps the rider.

## Building the route

`buildTrackRoute` turns the track into a route with the least waypoints the streets allow, using the same Directions
call the route creator uses (`fetchStreetPath`, driving profile). Waypoints are the **cuts** of the track:

1. Route the whole track as one leg, from its first point to its last.
2. Judge the street path **both ways** (`judgeLegPath`): every point of the track must be within 30 m
   (`TRACK_TOLERANCE_METERS`) of the path, and every vertex of the path within 30 m of the track. The second half matters:
   without it two neighbouring points the streets join only by a long way round (one-way streets, a river) were accepted, and a
   0.5 km ride was saved as a 5 km route.
3. When it fails, cut the leg at the track point farthest from the path (or, if only the path strays, the track point nearest to
   where it strays most) and go back to 1 for each half. Legs of one level are routed together, six at a time
   (`MAX_PARALLEL_LEGS`), to stay inside the service's rate limit.
4. A leg of two neighbouring points that the streets do not join well (no route, or the detour above) becomes a straight line,
   so the route still goes where the rider went. A leg with no street between its ends is cut at its middle.

The cuts are the waypoints (plain: no name, address or place, like a point tapped on the map with no lookup), the path is the
legs joined, and `reachedAt` is the time of the track point at each waypoint, so the history has times for every checkpoint.
A ride along the streets the router would pick takes **two waypoints and one request**; a ride against them needs a waypoint
per turn that the router would not take.

Limits of a route: at most 500 waypoints (the cutting stops there, and the last legs are left as they are) and 20,000 points
(the path is thinned with Douglas-Peucker, a little more each time, until it fits). Deviations are measured in `pathDeviation.ts`
on a flat projection around the path's first point, skipping any segment whose box is already farther than the closest found:
10,000 points against a 10,000-point path take about 150 ms.

## Saving

`useSaveTrack` runs three steps and shows which one: "Following the streets…" (build), "Saving the route…" (`POST /api/routes/`
with name `Track <day>` and no description) and "Saving the ride…" (`POST /api/routes/<id>/summaries/` with the group, the start
of the ride, the moment finishing was asked, the top speed and `reachedAt`, finished). A retry **goes on from the step that
failed**: the street paths already found are kept (`LegCache`, so a retry asks for none of them again) and a route that was
created is not created twice. Leaving the sheet mid-save aborts the street requests.

## Group and others

Track mode belongs to the group like free mode does: the leader chooses it in the picker or later with the route button, and
**every rider records their own track** and saves their own route and ride when they finish. `GroupSerializer` carries
`is_track`; invitations and the Home section call it "Track mode"; the notification text says "in track mode". Changing to or
from another mode starts the ride over and shows "Ride stats were reset for the track ride".

## Key decisions

- **A flag on the group, not a new route type**: the group already means "what these riders ride", and the leader can change it
  mid-ride, so the other riders follow. The saved ride is an ordinary ride of an ordinary route, so history, sharing and riding
  the route again need nothing new.
- **Cut where the router disagrees**: the waypoints that matter are the ones that make the street router go the rider's way, so
  the route is built by asking the router and fixing what it got wrong, not by thinning the recorded points.
- **Both directions of the check**: see [Building the route](#building-the-route).
- **Verified** in headless Chrome against a local stack and the real Directions API: a 6 km drive replayed as fake GPS saved
  as "Track <day>" with a history entry and a time for every waypoint, a failed route save was retried from the sheet without
  duplicates, and a ride that never moved could only be left. The builder was also run alone against a fake router (turns the
  router would not take, no streets, a long detour, a failure halfway then retried).

## Not included

The track is not kept when the screen is lost (reload, app closed), a track is not paused, the history does not tell a track ride
from a ride of a route (no flag of its own), waypoints get no names or addresses, a route with more than 500 turns the router would
not take keeps the rest as straight legs, and a very long track makes many Directions requests (about two per waypoint).
