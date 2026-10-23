# Places

Favorite places saved by riders (gas stations, restaurants, viewpoints...).
For now the app is model and admin only: there is no API or frontend yet.

## Layout

The app lives in [apps/places/](../../apps/places/) and is registered in
`INSTALLED_APPS` as `apps.places` ([settings.py](../../config/settings.py)).
Models are in [models.py](../../apps/places/models.py), the admin in
[admin.py](../../apps/places/admin.py), tests in
[tests.py](../../apps/places/tests.py).

## Data model

`PlaceLocation` inherits `apps.core.models.TimeStampedModel`. Places are
private to their author and ordered by `name`.

| Field | Type | Notes |
|-------|------|-------|
| `author` | FK to `auth.User` | `related_name='place_locations'`, `CASCADE` |
| `name` | `CharField(100)` | |
| `notes` | `TextField` | Optional, personal notes |
| `category` | `CharField(32)` | `PlaceCategory` choices, default `other` |
| `lat` | `DecimalField(9, 6)` | -90 to 90 |
| `lng` | `DecimalField(9, 6)` | -180 to 180 |

`PlaceCategory` is a fixed `TextChoices`: `gas_station`, `restaurant`,
`cafe`, `mechanic`, `hotel`, `camping`, `viewpoint`, `rest_stop`, `other`.
Adding a category is a code change plus a migration (the choices live in the
migration state).

## Key decisions

- Longitude is named `lng`, matching the `[lng, lat]` points in
  `routes.Route`, not `lan`.
- Coordinates are `DecimalField` with 6 decimal places (about 0.1 m), so
  values round-trip exactly instead of drifting like floats.
- Range validators run in `full_clean()` and in serializers, not at the
  database level.
