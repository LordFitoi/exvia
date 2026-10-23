# Places

Favorite places saved by riders (gas stations, restaurants, viewpoints...). A rider saves a spot
from the Map tab ([map.md](map.md#saved-places)) and sees their saved places as icons on the map, the route creator and every ride map.

## Layout

The app lives in [apps/places/](../../apps/places/) and is registered in
`INSTALLED_APPS` as `apps.places` ([settings.py](../../config/settings.py)).
Models are in [models.py](../../apps/places/models.py), the admin in
[admin.py](../../apps/places/admin.py), the API in
[serializers.py](../../apps/places/serializers.py),
[views.py](../../apps/places/views.py), [viewport.py](../../apps/places/viewport.py) and
[urls.py](../../apps/places/urls.py), mounted at `/api/places/` in `config/urls.py`. Tests are in
[tests.py](../../apps/places/tests.py).

## Data model

`PlaceLocation` inherits `apps.core.models.TimeStampedModel`. Places are
private to their author and ordered by `name`.

| Field | Type | Notes |
|-------|------|-------|
| `author` | FK to `auth.User` | `related_name='place_locations'`, `CASCADE` |
| `name` | `CharField(100)` | |
| `notes` | `TextField` | Optional, personal notes, 500 characters at most |
| `category` | `CharField(32)` | `PlaceCategory` choices, default `other` |
| `lat` | `DecimalField(9, 6)` | -90 to 90 |
| `lng` | `DecimalField(9, 6)` | -180 to 180 |

`PlaceCategory` is a fixed `TextChoices`: `gas_station`, `restaurant`,
`cafe`, `mechanic`, `hotel`, `camping`, `viewpoint`, `rest_stop`, `other`.
Adding a category is a code change plus a migration (the choices live in the
migration state), plus its icon and label in the frontend
(`services/placeLocationCategories.ts`, `icons.css`).

An index on (`author`, `lat`, `lng`) serves the viewport query below.

## API

All endpoints need a JWT and only ever see the caller's own places.

| Method | Path | Does |
|--------|------|------|
| `GET` | `/api/places/?bbox=west,south,east,north` | The caller's places inside the box, `id` order, at most 200 |
| `GET` | `/api/places/all/` | Every place of the caller wherever it is, by name, at most 500: for searching them by text in the browser |
| `POST` | `/api/places/` | Saves `name`, `notes` (optional), `category`, `lat` and `lng` as the caller's place; answers 201 with the place |
| `DELETE` | `/api/places/<id>/` | Deletes one of the caller's places; answers 204, or 404 for a place that is not theirs |

- `bbox` is **required**: a client never asks for "all my places", only for the part of the map it
  is looking at, so out-of-view places are never read or sent. A missing, malformed or
  out-of-range box (longitudes beyond ±180, latitudes beyond ±90, `south` above `north`) is a 400.
- A `west` greater than `east` is a box over the antimeridian: the query then takes `lng >= west`
  **or** `lng <= east`.
- A place is `{id, name, notes, category, lat, lng, created_at}`; `lat` and `lng` are JSON numbers
  (`coerce_to_string=False`), and at most 6 decimals are accepted.
- No update endpoint yet. The Map tab deletes a place from its card, after a confirm dialog ([map.md](map.md#saved-places)).

## Key decisions

- Longitude is named `lng`, matching the `[lng, lat]` points in
  `routes.Route`, not `lan`.
- Coordinates are `DecimalField` with 6 decimal places (about 0.1 m), so
  values round-trip exactly instead of drifting like floats.
- Range validators run in `full_clean()` and in serializers, not at the
  database level.
