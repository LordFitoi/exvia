# Routes

Rider routes: a path drawn by a user, with its length and travel time
calculated from the path. Models and Django admin only for now: no
serializers or endpoints exist yet.

## Layout

The app lives in [apps/routes/](../../apps/routes/) and is registered in
`INSTALLED_APPS` as `apps.routes` ([settings.py](../../config/settings.py)).

| File | Responsibility |
|------|----------------|
| [models.py](../../apps/routes/models.py) | `Route` model |
| [geometry.py](../../apps/routes/geometry.py) | Distance and travel time calculation |
| [validators.py](../../apps/routes/validators.py) | `points` validator |
| [admin.py](../../apps/routes/admin.py) | `RouteAdmin` |

No URLs are wired into `config/urls.py` until there are views to route.

## Data model

`Route` inherits `apps.core.models.TimeStampedModel`.

| Field | Type | Notes |
|-------|------|-------|
| `name` | `CharField(100)` | |
| `description` | `TextField` | Max 255 characters, enforced by a validator |
| `points` | `JSONField` | List of `[lng, lat]` pairs, at least 2 |
| `distance` | `FloatField` | Kilometres, calculated, `editable=False` |
| `estimated_time` | `DurationField` | Calculated, `editable=False` |
| `author` | FK to `auth.User` | `related_name='routes'`, `CASCADE` |

## Points

`points` is a JSON list of `[lng, lat]` pairs in the order of travel, the
same order as GeoJSON and Mapbox (longitude first). `validate_points`
requires a list of at least two pairs of numbers (booleans rejected) with
longitude in [-180, 180] and latitude in [-90, 90].

## Calculated fields

`Route.save()` always recomputes both fields from `points`:

- `distance` is the sum of the haversine (great-circle) length of each
  consecutive segment, in km, rounded to 3 decimals.
- `estimated_time` is `distance / AVERAGE_SPEED_KPH` (60 km/h), as a
  `timedelta`.

They are `editable=False`, so forms, the admin and DRF treat them as
read-only. When `save(update_fields=[...])` includes `points`, the two
derived fields are added to `update_fields` so they are not left stale.

## Key decisions

- **Derived values are stored, not properties**: they can be filtered and
  ordered in queries, and the path is only recomputed on save. Updates that
  bypass `save()` (`QuerySet.update()`, `bulk_create`) will not recompute
  them.
- **Straight segments between points**: the distance follows the points as
  given, not the road network. A route drawn with sparse points is
  underestimated; snapping to streets is a frontend concern (see
  [map.md](map.md)).
- **Constant speed**: the 60 km/h average is a module constant, not a
  per-route or per-user value.
- **`points` validation runs on `full_clean()`**, the admin and DRF
  serializers, not on a bare `save()`, which assumes valid points.
- **`author` is `CASCADE`**: routes are user-created content, so deleting a
  user deletes their routes (same as `ClanNotice.author`).
- **Created by hand, not `startapp`**: same as [clans](clans.md).
  `manage.py` needs all five `PG*` variables exported to load settings, and
  generated stubs would be unused.
