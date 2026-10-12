# Clans

Community groups of riders with announcements and ride events. Models and
Django admin only for now: no serializers or endpoints exist yet.

## Layout

The app lives in [apps/clans/](../../apps/clans/) and is registered in
`INSTALLED_APPS` as `apps.clans` ([settings.py](../../config/settings.py)).
Models are in [models.py](../../apps/clans/models.py), the social link
validator in [validators.py](../../apps/clans/validators.py), the admin in
[admin.py](../../apps/clans/admin.py). No URLs are
wired into `config/urls.py` until there are views to route.

## Data model

All models inherit `apps.core.models.TimeStampedModel`.

| Model | Fields | Relations |
|-------|--------|-----------|
| `ClanGroup` | `name`, `description`, `group_image` (required), `social_links` (JSON list, optional) | `owner` FK to `auth.User` (`owned_clans`, `PROTECT`); `users` M2M to `auth.User` (`clans`) |
| `ClanRide` | `title`, `description`, `schedule_at` (UTC datetime), `event_type` (`EventType`: `weekly`, `unique`), `meet_at` | `clan` FK to `ClanGroup` (`rides`, `CASCADE`) |
| `ClanNotice` | `title`, `description`, `attachment` (image, optional) | `clan` FK to `ClanGroup` (`notices`, `CASCADE`); `author` FK to `auth.User` (`clan_notices`, `CASCADE`); `ride` FK to `ClanRide` (optional, `notices`, `SET_NULL`) |

`ClanGroup.notices` and `ClanGroup.rides` are the reverse managers of the
`clan` foreign keys on `ClanNotice` and `ClanRide`. Django only allows the
`ForeignKey` on the "many" side, so they are declared as type-annotated
attributes on `ClanGroup` (annotations only, no extra fields).
`ClanRide.clan` is not in the original field list but is required to make
`ClanGroup.rides` exist.

## Social links

`ClanGroup.social_links` is a JSON list of URLs. `validate_social_links`
requires a list of valid `http(s)` URLs whose host (ignoring a leading
`www.`) is one of `wa.me`, `whatsapp.com`, `chat.whatsapp.com` or
`instagram.com`. Matching is on the exact host, so lookalikes such as
`instagram.com.evil.io` are rejected. To allow another network, add its
host to `ALLOWED_SOCIAL_HOSTS`.

Model validators run through `full_clean()`, the admin and DRF
serializers, not on a bare `save()`.

## Admin

| Admin | Notes |
|-------|-------|
| `ClanGroupAdmin` | `owner` autocomplete, `users` as a `filter_horizontal` widget, `ClanRideInline` to edit the clan's rides in place |
| `ClanRideAdmin` | filters by `event_type` and clan, `date_hierarchy` on `schedule_at`, `clan` autocomplete |
| `ClanNoticeAdmin` | filter by clan, `clan`, `author` and `ride` autocomplete |

Notices are not inlined in `ClanGroupAdmin`: each needs an author and an
image attachment, which fit better on their own page. The admin runs
`full_clean()`, so the social link validator and `ClanNotice.clean()` apply
there.

## Key decisions

- **`owner` is a plain FK, not a one-to-one**: a user can own several
  clans. `PROTECT` prevents deleting a user who still owns one.
- **Owner is not forced into `users`**: membership is managed separately
  and the owner is not auto-added.
- **`ClanNotice.clean()`** rejects a `ride` that belongs to another clan.
  Like the validator, it runs on `full_clean()`, not on `save()`.
- **Deleting a ride keeps its notices** (`SET_NULL`); deleting a clan
  deletes its rides and notices.
- **Created by hand, not `startapp`**: `manage.py` needs all five `PG*`
  variables exported to load settings, and generated stubs would be unused.
