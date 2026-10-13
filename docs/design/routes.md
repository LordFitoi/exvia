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
| [models.py](../../apps/routes/models.py) | `Route` model |
| [geometry.py](../../apps/routes/geometry.py) | Distance and travel time calculation |
| [validators.py](../../apps/routes/validators.py) | `points` validator |
| [serializers.py](../../apps/routes/serializers.py) | `RouteSerializer` |
| [views.py](../../apps/routes/views.py) | The two API views |
| [urls.py](../../apps/routes/urls.py) | Routes, mounted at `api/routes/` in `config/urls.py` |
| [admin.py](../../apps/routes/admin.py) | `RouteAdmin` |

## Data model

`Route` inherits `apps.core.models.TimeStampedModel` and is ordered newest
first (`Meta.ordering = ('-created_at',)`).

| Field | Type | Notes |
|-------|------|-------|
| `name` | `CharField(100)` | |
| `description` | `TextField` | Optional (`blank=True`), max 255 characters, enforced by a validator |
| `points` | `JSONField` | List of 2 to 20,000 `[lng, lat]` pairs: the whole street path |
| `distance` | `FloatField` | Kilometres, calculated, `editable=False` |
| `estimated_time` | `DurationField` | Calculated, `editable=False` |
| `author` | FK to `auth.User` | `related_name='routes'`, `CASCADE` |

## Points

`points` is a JSON list of `[lng, lat]` pairs in the order of travel, the
same order as GeoJSON and Mapbox (longitude first). The route creator sends
the **full street path** (every vertex of the Directions geometry, about 65
per km), not just the points the rider tapped, so the stored distance follows
the roads. `validate_points` requires a list of 2 to `MAX_POINTS` (20,000,
roughly 300 km of path) pairs of numbers (booleans rejected) with longitude in
[-180, 180] and latitude in [-90, 90]. The upper bound keeps one request from
storing an unbounded JSON document.

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

All endpoints are under `/api/routes/`, need a JWT (`Authorization: Bearer
<access>`, see [authentication.md](authentication.md)) and only ever see the
caller's own routes.

| Method and path | Result |
|-----------------|--------|
| `POST /api/routes/` | `201` with the created route; `author` is the caller |
| `GET /api/routes/` | `200` with a plain JSON array of the caller's routes, newest first (no pagination), **without `points`** |
| `GET /api/routes/<id>/` | `200` with one route |
| `DELETE /api/routes/<id>/` | `204` |

There is no update: `PUT` and `PATCH` return `405`. Unauthenticated calls
return `401`; invalid input returns `400` with per-field messages (`name`,
`description`, `points`).

A route is serialized as:

```json
{
  "id": 7,
  "name": "Sunday loop",
  "description": "",
  "points": [[-3.7038, 40.4168], [-3.6912, 40.4221]],
  "distance": 1.223,
  "estimated_time": 73,
  "author": 1,
  "created_at": "2026-10-13T18:00:00Z",
  "updated_at": "2026-10-13T18:00:00Z"
}
```

The list returns the same shape without `points`. Writable fields are `name` (required), `description` (optional) and
`points` (required). `distance` is in kilometres and `estimated_time` is
**whole seconds** (an integer, not the `HH:MM:SS` string DRF would give a
`DurationField`), so clients do not have to parse a duration. `id`,
`distance`, `estimated_time`, `author` and the timestamps are read-only;
sending them is ignored.

## Key decisions

- **Other users' routes are `404`, not `403`**: retrieve and delete filter
  the queryset by author, so a route id does not reveal whether it exists.
  Opening routes to other riders (for example through a clan) means changing
  `OwnRoutesMixin.get_queryset`.
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
- **The list omits `points`**: a street path is thousands of pairs, so
  `RouteSummarySerializer` drops it from the list and the detail endpoint
  returns it. The creator does not store the tapped waypoints separately, so
  a route cannot be reopened as editable waypoints (there is no edit yet).
- **Constant speed**: the 60 km/h average is a module constant, not a
  per-route or per-user value.
- **`points` validation runs on `full_clean()`**, the admin and DRF
  serializers, not on a bare `save()`, which assumes valid points.
- **`author` is `CASCADE`**: routes are user-created content, so deleting a
  user deletes their routes (same as `ClanNotice.author`).
- **Created by hand, not `startapp`**: same as [clans](clans.md).
  `manage.py` needs all five `PG*` variables exported to load settings, and
  generated stubs would be unused.
