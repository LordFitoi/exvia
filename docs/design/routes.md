# Routes

Rider routes: a path drawn by a user, with its length and travel time
calculated from the path. Model, Django admin and a REST API (create, list,
retrieve, delete). The screen that creates routes is described in
[map.md](map.md#route-creator); the one that lists and rides them in
[ride.md](ride.md).

## Layout

The app lives in [apps/routes/](../../apps/routes/) and is registered in
`INSTALLED_APPS` as `apps.routes` ([settings.py](../../config/settings.py)).

| File | Responsibility |
|------|----------------|
| [models.py](../../apps/routes/models.py) | `Route`, `RouteSummary` and `RouteGroup` models |
| [geometry.py](../../apps/routes/geometry.py) | Distance and travel time calculation |
| [validators.py](../../apps/routes/validators.py) | `points` validator |
| [serializers.py](../../apps/routes/serializers.py) | `RouteSerializer`, `SharedRouteSerializer`, `RideSummarySerializer`, `RideSummaryListSerializer` |
| [views.py](../../apps/routes/views.py) | The route views, the public shared route view and the three ride summary views (create, list, detail) |
| [urls.py](../../apps/routes/urls.py) | Routes, mounted at `api/routes/` in `config/urls.py` |
| [admin.py](../../apps/routes/admin.py) | `RouteAdmin`, `RouteSummaryAdmin`, `RouteGroupAdmin` |
| [group_meta.py](../../apps/routes/group_meta.py), [group_service.py](../../apps/routes/group_service.py), [group_serializers.py](../../apps/routes/group_serializers.py), [group_views.py](../../apps/routes/group_views.py), [signals.py](../../apps/routes/signals.py) | Route groups, see [route-groups.md](route-groups.md) |

## Data model

`Route` inherits `apps.core.models.TimeStampedModel` and is ordered newest
first (`Meta.ordering = ('-created_at',)`).

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UUIDField` | Primary key, `uuid4`, `editable=False`; also the secret of the public link ([route-sharing.md](route-sharing.md)) |
| `name` | `CharField(100)` | |
| `description` | `TextField` | Optional (`blank=True`), max 255 characters, enforced by a validator |
| `points` | `JSONField` | List of 2 to 20,000 `[lng, lat]` pairs: the whole street path |
| `distance` | `FloatField` | Kilometres, calculated, `editable=False` |
| `estimated_time` | `DurationField` | Calculated, `editable=False` |
| `author` | FK to `auth.User` | `related_name='routes'`, `CASCADE` |

## Route summaries

`RouteSummary` records one ride of a route. The Ride tab saves one when a ride
finishes (see [Saving a ride](#saving-a-ride)) and the [ride
history](ride-history.md) reads them back (see [Reading rides](#reading-rides)).

It inherits `TimeStampedModel` and is ordered by `-start_at`.

| Field | Type | Notes |
|-------|------|-------|
| `route` | FK to `Route` | `related_name='summaries'`, `CASCADE`; a UUID, like the route's `id` |
| `start_at` | `DateTimeField` | |
| `end_at` | `DateTimeField` | Must be after `start_at` |
| `duration` | `DurationField` | `end_at - start_at`, calculated, `editable=False` |
| `is_finished` | `BooleanField` | Default `True`; `False` when the rider quit before the finish |
| `max_speed` | `FloatField` | km/h, fastest GPS reading; null when unknown; `>= 0` |
| `reached_at` | `ArrayField(DateTimeField)` | When the rider reached the start, then each checkpoint, in route order; default empty, at most 500 |
| `participants` | M2M to `auth.User` | `related_name='route_summaries'`, optional (`blank=True`) |
| `author` | FK to `auth.User` | `related_name='authored_route_summaries'`, `CASCADE` |

- **`duration` is stored, like `Route.distance`**: `save()` always
  recomputes it, and `save(update_fields=[...])` that includes `start_at` or
  `end_at` adds `duration` so it is not left stale. `QuerySet.update()` and
  `bulk_create` bypass it.
- **The speeds are stored, not derived**: the server only knows a start, an
  end and a route length, so the client measures them from the phone's GPS and
  sends them. They are nullable because the device may give no speed, and
  because rides saved before the fields existed have none. The server trusts
  them (it only rejects negatives): it cannot check a GPS reading.
- **`reached_at` is measured on the phone and stored**, like the top speed: the server cannot tell when a
  rider passed a point from a start and an end. Entry 0 is the moment the rider reached the start (they may
  still be riding to it when ride mode opens, so it is not `start_at`) and entry `i` the moment they reached
  checkpoint `i + 1` (the numbering of the map markers, the start being 1; the finish is `end_at`). Reaching a stop reaches the ones before it, so there are no gaps: the list is shorter than the route's stops
  when the rider did not get to the last ones (a ride quit early, a route without waypoints)
  and empty for rides saved before the field existed. The server only checks that it is a list of datetimes, since
  it cannot check a GPS fix; the time it took is the entry minus `start_at`, worked out by the reader.
- **`end_at` after `start_at` is a database `CheckConstraint`**
  (`route_summary_end_after_start`), so a negative or zero duration cannot be
  stored by any path, including the ones that skip `save()` validation.
- **`CASCADE` on the route**: deleting a route deletes its summaries.
  Deleting the `author` deletes their summaries (same as `Route.author`); participants
  are a plain M2M, so deleting a participant only removes the link.
- **Not to be confused with `RouteSummarySerializer`**, which is the list
  shape of a `Route` (no `points`), not this model.

### Saving a ride

`POST /api/routes/<uuid>/summaries/` (JWT) saves a finished ride of one of the
caller's routes. The body is `{"start_at": "...", "end_at": "..."}`
(ISO 8601 datetimes, both required), plus optional `is_finished` (default `true`), `max_speed`
in km/h, `reached_at` (a list of datetimes, see above) and `group` (the id of the group it was ridden in, never
returned); the answer is `201` with the full ride, the shape in
[Reading rides](#reading-rides).

Only those eight fields are writable: the route comes from the URL, and the
caller is the `author` and always a participant, whatever the body says. The other
participants come from `group` (see [Participants](#ride-participants)). `end_at` not after `start_at` is `400` with an `end_at` message
(the database constraint is the backstop), and a negative speed is `400` with
that field's message. Another user's route, or one that does not exist, is
`404`, as for the other route endpoints; unauthenticated calls are `401`.
`RideSummarySerializer` serializes the `RouteSummary` model; the name keeps it
apart from `RouteSummarySerializer`, the route list shape.

<a id="ride-participants"></a>**Participants.** With `group`, the ride also lists the riders of that group who are
**connected at the moment it is saved** (`group_service.connected_riders`): the ones who accepted and whose
latest position is at most 30 seconds old (`CONNECTED_WINDOW`, the same rule that takes a rider off the ride
map), since a connected rider reports every 4 seconds. The caller counts whatever their own position says.
Invited riders, riders who left and riders who dropped more than 30 seconds ago are not participants. A
`group` the caller has not accepted is `400` (`group`: "You are not riding in this group."); a group that is no
longer on this route (the leader changed it) adds nobody, so the ride is still saved. Each rider saves their
own ride when they arrive, so every rider has their own copy, listing the riders connected when they saved it.

### Reading rides

Both endpoints need a JWT and only see the rides the caller took part in
(`participants`, which always includes the author); any other ride is `404`.

| Method and path | Result |
|-----------------|--------|
| `GET /api/routes/summaries/` | `200` with a plain JSON array of the caller's rides, by `created_at`, newest first (no pagination) |
| `GET /api/routes/summaries/<id>/` | `200` with one ride, with its participants |
| `DELETE /api/routes/summaries/<id>/` | `204`; only the ride's **author** can, anyone else gets `404` |

A ride (the detail, and the answer to the `POST`):

```json
{
  "id": 3,
  "route": "2dfd2b39-b5ba-4389-b76d-25adf7a15414",
  "route_name": "Sunday loop",
  "distance": 12.3,
  "estimated_time": 2700,
  "start_at": "2026-10-15T09:00:00Z",
  "end_at": "2026-10-15T09:45:00Z",
  "duration": 2700,
  "is_finished": true,
  "max_speed": 31.5,
  "reached_at": ["2026-10-15T09:12:30Z", "2026-10-15T09:27:05Z"],
  "author": 1,
  "participants": [{"id": 1, "username": "rider"}],
  "created_at": "2026-10-15T09:45:02Z"
}
```

`reached_at` is only in the detail and the answer to the `POST`, not in the list rows. `duration` and `estimated_time` are **whole seconds**; `distance` is the
route's, in km, and `route_name`, `distance` and `estimated_time` come from the
route. The list rows (`RideSummaryListSerializer`) carry only `id`, `route`,
`route_name`, `distance`, `start_at`, `end_at`, `duration`, `is_finished` and
`created_at`, so the row can be drawn without the participants or the top speed.

Deleting a ride removes the `RouteSummary` row (and its participant links) for
everyone who rode it, and leaves the route alone. It is limited to the author
because a delete is shared: a participant who did not write the ride can read it
but not erase it for the others.


## Route groups

`RouteGroup` (riders rolling together under one leader, with optional route) has its own
design file: [route-groups.md](route-groups.md). Its code lives in this app.

## Points

`points` is a JSON list of `[lng, lat]` pairs in the order of travel, the
same order as GeoJSON and Mapbox (longitude first). The route creator sends
the **full street path** (every vertex of the Directions geometry, about 65
per km), not just the points the rider tapped, so the stored distance follows
the roads. `validate_points` requires a list of 2 to `MAX_POINTS` (20,000,
roughly 300 km of path) pairs of numbers (booleans rejected) with longitude in
[-180, 180] and latitude in [-90, 90]. The upper bound keeps one request from
storing an unbounded JSON document.

## Waypoints

`waypoints` is the other list: the points the rider **chose**, in order, as
`[lng, lat]` pairs. `points` is the street path through them, thousands of
vertices that cannot be turned back into the chosen points, so the editor needs
`waypoints` to reopen a route as editable points and re-route the legs between
them. `validate_waypoints` allows 0 to `MAX_WAYPOINTS` (500) pairs; the list is
optional (`blank=True`, default `[]`), because routes saved before the field
existed, and API clients that only send a path, have none. The server never
uses it for the distance, which comes from `points`. Nothing checks that the
two lists agree: the client that sends one sends both.

## Calculated fields

`Route.save()` always recomputes both fields from `points`:

- `distance` is the sum of the haversine (great-circle) length of each
  consecutive segment, in km, rounded to 3 decimals.
- `estimated_time` is `distance / AVERAGE_SPEED_KPH` (60 km/h), as a
  `timedelta`.

They are `editable=False`, so forms, the admin and DRF treat them as
read-only. When `save(update_fields=[...])` includes `points`, the two
derived fields are added to `update_fields` so they are not left stale.

## API

All endpoints are under `/api/routes/`, need a JWT (except the [shared route](#shared-route)) (`Authorization: Bearer
<access>`, see [authentication.md](authentication.md)) and only ever see the
caller's own routes.

| Method and path | Result |
|-----------------|--------|
| `POST /api/routes/` | `201` with the created route; `author` is the caller |
| `GET /api/routes/` | `200` with a plain JSON array of the caller's routes, newest first (no pagination), **without `points`** |
| `GET /api/routes/<uuid>/` | `200` with one route, with its `points` and `waypoints` |
| `PUT /api/routes/<uuid>/` | `200` with the updated route; `name` and `points` required |
| `PATCH /api/routes/<uuid>/` | `200` with the updated route; any of the writable fields |
| `DELETE /api/routes/<uuid>/` | `204` |

An update recalculates `distance` and `estimated_time` from the stored
`points`, since it goes through `Route.save()`. `author` cannot be changed.
Unauthenticated calls return `401`; invalid input returns `400` with per-field
messages (`name`, `description`, `points`, `waypoints`).

A route is serialized as:

```json
{
  "id": "2dfd2b39-b5ba-4389-b76d-25adf7a15414",
  "name": "Sunday loop",
  "description": "",
  "points": [[-3.7038, 40.4168], [-3.6912, 40.4221]],
  "waypoints": [[-3.7038, 40.4168], [-3.6912, 40.4221]],
  "distance": 1.223,
  "estimated_time": 73,
  "author": 1,
  "created_at": "2026-10-13T18:00:00Z",
  "updated_at": "2026-10-13T18:00:00Z"
}
```

The list returns the same shape without `points` and `waypoints`. Writable
fields are `name` (required), `description` (optional), `points` (required) and
`waypoints` (optional). `distance` is in kilometres and `estimated_time` is
**whole seconds** (an integer, not the `HH:MM:SS` string DRF would give a
`DurationField`), so clients do not have to parse a duration. `id`,
`distance`, `estimated_time`, `author` and the timestamps are read-only;
sending them is ignored. `id` is a UUID string.

### Shared route

`GET /api/routes/<uuid>/shared/` needs **no JWT** and returns any route to whoever
knows its UUID, with the author's username instead of their id and without
`waypoints`. It is read-only and `404` for an unknown UUID. See
[route-sharing.md](route-sharing.md).

## Key decisions

- **The primary key is a UUID**: a route id is in a link that is handed to
  strangers, so it must not be a counter that can be walked (`/routes/1`,
  `/routes/2`, ...). It is a UUID4, drawn when the row is created. Migration
  `0007_route_uuid_primary_key` converted the existing integer ids in place and
  kept each ride attached to its route. It cannot be reversed: the integer ids
  are gone once it has run. `RouteSummary` keeps its integer id.
- **Other users' routes are `404`, not `403`**: retrieve and delete filter
  the queryset by author, so a route id does not reveal whether it exists.
  Opening routes to other riders (for example through a clan) means changing
  `OwnRoutesMixin.get_queryset`. The only open door is the separate shared
  route endpoint, which needs the UUID.
- **Unpaginated list**: DRF has no default pagination configured here, so
  the list returns every route of the user. Add pagination when a user can
  realistically have hundreds.

- **Derived values are stored, not properties**: they can be filtered and
  ordered in queries, and the path is only recomputed on save. Updates that
  bypass `save()` (`QuerySet.update()`, `bulk_create`) will not recompute
  them.
- **Segments are straight between stored points**: the server measures the
  path it is given and knows nothing about roads. Distance is only as good as
  the path: the creator sends a dense street path, so it is close to the road
  distance, while a client sending a few far-apart points gets a straight-line
  distance.
- **The list omits `points` and `waypoints`**: a street path is thousands of
  pairs, so `RouteSummarySerializer` drops both from the list and the detail
  endpoint returns them.
- **Edit is a full replacement from the client**: the editor re-routes the
  legs and sends the new `points` and `waypoints` together with the name and
  description (`PUT`). `PATCH` exists because the generic view provides it;
  a `PATCH` that changes `points` without `waypoints` leaves the two out of
  step.
- **Constant speed**: the 60 km/h average is a module constant, not a
  per-route or per-user value.
- **`points` validation runs on `full_clean()`**, the admin and DRF
  serializers, not on a bare `save()`, which assumes valid points.
- **`author` is `CASCADE`**: routes are user-created content, so deleting a
  user deletes their routes (same as `ClanNotice.author`).
- **Created by hand, not `startapp`**: same as [clans](clans.md).
  `manage.py` needs all five `PG*` variables exported to load settings, and
  generated stubs would be unused.
