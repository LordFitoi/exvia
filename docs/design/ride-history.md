# Ride history

The finished rides of the signed-in user, from the route button of the Map tab:
a list, newest first, and the summary of each ride. Riding and saving the ride
are in [ride.md](ride.md), the model and API in
[routes.md](routes.md#route-summaries), the menu in
[route-management.md](route-management.md#entry-the-route-menu).

## Entry

The route menu has a third item, **Ride history** (calendar icon). `MapOverview`
adds a `history` mode next to `browse`, `create` and `list`; like the route list
it needs no location, so it opens even while the map is still waiting for a fix.

## Pieces

| Piece | File | Job |
|-------|------|-----|
| List screen | `views/history/RideSummariesView.tsx` | "Ride history" header with an X, the list; holds which ride is open and swaps to its summary |
| List | `views/history/RideSummaryList.tsx` | Skeleton, error, empty and ready states; one row per ride |
| Summary screen | `views/history/RideSummaryView.tsx` | "Ride summary" header with an X (back to the list): route name and day, route preview, stats, checkpoint times, participants |
| Stats | `views/history/RideStatsGrid.tsx` | The two `route-stats` grids |
| Checkpoint times | `components/route/CheckpointTimes.tsx` | The checkpoints the rider reached: the hour and the time from the start |
| Delete | `hooks/useRideSummaryDeletion.ts`, `hooks/useConfirmedDeletion.ts`, `components/feedback/ConfirmDialog.tsx` | Asks first, then `DELETE`s the ride |
| List data | `hooks/useMyRideSummaries.ts` | `GET /api/routes/summaries/`, with `reload` |
| Summary data | `hooks/useRideSummaryDetail.ts` | `GET /api/routes/summaries/<id>/`, with `retry` |
| API | `services/rideSummariesApi.ts` | `fetchRideSummaries`, `fetchRideSummary`, `deleteRideSummary` (and `createRideSummary`) |

Both screens are full height with their own X, so they hide the tab bar
(`useHideTabBar`, held by `RideSummariesView` for both). They reuse the guide's
`list-item`, `route-stats`, `avatar` and `screen-header`; the checkpoint times are one more list of those.

## List

Each row is a button with the checkered-flag tile, the route name, and
`day · time · average km/h` (`15 Oct 2026 · 42:10 · 24.5 km/h`) and a chevron.
The server orders by creation time, newest first (`created_at`), not by when the
ride started. The average on the row is the distance over the time, like the
summary sheet at the finish. States: skeleton rows, "Could not load your rides"
with Try again, "No rides yet".

## Summary

Top to bottom: the route name and the day; the route on a compact preview map
(`RoutePreview`, the same one the route list uses, loaded with `useRouteDetail`);
the stats; the checkpoint times; the participants.

| Stat | Source |
|------|--------|
| Time | `duration`, as a stopwatch (`42:10`) |
| Distance | the route's length |
| Avg km/h | distance over time, stops included, as in the finish sheet |
| Max km/h | fastest GPS reading |

The time is followed by the route's estimated time. A speed the ride did not
record (the device gave none, or the ride was saved before speeds existed) is a
dash. Participants are rows with an initial avatar and the username.

The **checkpoint times** list the start, every checkpoint of the route and the finish ([ride.md](ride.md#checkpoint-times)).
The start and each checkpoint the ride reached are colored (entry 0 of `reached_at` is the start), and so is the
finish when the ride is finished (`end_at`). A colored stop shows the hour and the time it took (the moment minus
`start_at`); the rest are gray and "Not reached yet" (a ride quit early, or one saved before they were recorded).
The number of checkpoints
comes from the route's waypoints (the route the preview loads), or from `reached_at` if the route is not loaded.

## Rides quit early

A ride the rider quit before the finish is saved too ([ride.md](ride.md)), with
`is_finished` false. The route's length says nothing about how far they got, so
for these rides the list row has no average and carries a **Not finished** badge,
and the summary shows a dash for Distance and Avg km/h and the badge next to the
day. Time, the top GPS speed and the checkpoint times (the ones reached) are real, so they stay.

## Delete

The summary screen ends with **Delete ride**, a soft error button. It opens the
shared confirm dialog ("Delete this ride?", removed for good, and for anyone who
rode with it) and `useRideSummaryDeletion` calls `DELETE
/api/routes/summaries/<id>/`: both buttons are disabled while it runs and a
failure keeps the dialog open with the message. On success the screen goes back
to the list, which reloads without the ride. The route itself is not touched.

Only the **author** can delete (anyone else gets `404`, as for a ride that is not
theirs). A ride saved from a group also lists the riders connected then as participants, so the
button is shown only to the author (`author` in the detail, compared with the signed-in user).

## Key decisions

- **The top speed is measured on the phone and stored**, because the server cannot
  derive it from a start, an end and a route length. `useRideMaxSpeed` keeps the
  highest GPS reading (`services/rideSpeed.ts`) and sends it with the ride; see
  [ride.md](ride.md#ride-mode). The lowest and the moving (mean) speeds are not kept:
  the lowest was always about zero at a stop, and the mean is close to "Avg km/h".
- **Whose rides**: the ones the caller took part in (`participants`), which
  includes every ride they saved, since the author is always a participant.
- **The preview uses the route endpoint**, which only returns routes the
  caller wrote. Riders can only ride their own routes today, so it always
  works; opening rides on someone else's route would need the summary to carry
  the path or the route endpoint to open up.
- **No pagination**: the list is every ride of the user, like the route list.
  Add it when a user can have hundreds.
- **The list reloads when the screen opens**, not when a ride is saved, so a
  ride finished while the history is open shows up after reopening it.
