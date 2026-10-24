# Clans

Community groups of riders with announcements and ride events. Riders create
clans, invite other users and post notices through the API and the Clans tab;
rides (`ClanRide`) are still model and admin only.

## Layout

The app lives in [apps/clans/](../../apps/clans/) and is registered in
`INSTALLED_APPS` as `apps.clans` ([settings.py](../../config/settings.py)).
Models are in [models.py](../../apps/clans/models.py), the social link
validator in [validators.py](../../apps/clans/validators.py), the admin in
[admin.py](../../apps/clans/admin.py). The API is in
[serializers.py](../../apps/clans/serializers.py),
[views.py](../../apps/clans/views.py) and [urls.py](../../apps/clans/urls.py),
mounted at `/api/clans/` in `config/urls.py`.

## Data model

All models inherit `apps.core.models.TimeStampedModel`.

| Model | Fields | Relations |
|-------|--------|-----------|
| `ClanGroup` | `name`, `description`, `group_image` (optional), `social_links` (JSON list, optional) | `owner` FK to `auth.User` (`owned_clans`, `PROTECT`); `users` M2M to `auth.User` (`clans`) |
| `ClanRide` | `title`, `description`, `schedule_at` (UTC datetime), `event_type` (`EventType`: `weekly`, `unique`), `meet_at` | `clan` FK to `ClanGroup` (`rides`, `CASCADE`) |
| `ClanInvitation` | none besides the timestamps | `clan` FK to `ClanGroup` (`invitations`, `CASCADE`); `invited_by` FK to `auth.User` (`sent_clan_invitations`, `CASCADE`); `invitee` FK to `auth.User` (`clan_invitations`, `CASCADE`); unique on (`clan`, `invitee`) |
| `ClanNotice` | `title`, `description`, `attachment` (image, optional) | `clan` FK to `ClanGroup` (`notices`, `CASCADE`); `author` FK to `auth.User` (`clan_notices`, `CASCADE`); `ride` FK to `ClanRide` (optional, `notices`, `SET_NULL`); `route` FK to `routes.Route` (optional, `clan_notices`, `SET_NULL`) |

`ClanGroup.notices` and `ClanGroup.rides` are the reverse managers of the
`clan` foreign keys on `ClanNotice` and `ClanRide`. Django only allows the
`ForeignKey` on the "many" side, so they are declared as type-annotated
attributes on `ClanGroup` (annotations only, no extra fields).
`ClanRide.clan` is not in the original field list but is required to make
`ClanGroup.rides` exist.

## API

All endpoints need a JWT. A clan the caller is not a member of is always
404, never 403, so clan ids do not leak.

| Method and path | Who | Does |
|-----------------|-----|------|
| `GET /api/clans/` | any user | clans the caller belongs to, newest first |
| `POST /api/clans/` | any user | creates a clan (`name`, `description`); the caller becomes `owner` **and** a member |
| `GET /api/clans/<id>/` | member | the clan with its `members` |
| `GET /api/clans/<id>/notices/` | member | the clan's notices, newest first |
| `POST /api/clans/<id>/notices/` | member | posts a notice (`title`, `description`, optional `route_id`) authored by the caller |
| `PATCH /api/clans/<id>/notices/<notice id>/` | notice author | edits `title`, `description` and `route_id` (`null` detaches the route); another member gets 403, a non-member or a notice of another clan 404 |
| `POST /api/clans/<id>/invitations/` | member | invites the user named by `username`; 400 if unknown, already a member or already invited |
| `GET /api/clans/notices/` | any user | the home feed: latest 50 notices of every clan the caller belongs to, newest first |
| `GET /api/clans/invitations/` | any user | invitations addressed to the caller |
| `POST /api/clans/invitations/<id>/accept/` | invitee | joins the clan, deletes the invitation, returns the clan |
| `DELETE /api/clans/invitations/<id>/` | invitee | declines (deletes) the invitation |

Lists are not paginated, like the routes API; the feed is capped by
`FEED_LIMIT`. Images (`group_image`, `ClanNotice.attachment`) are not exposed
by the API yet: the client has no upload flow and media is only served in
`DEBUG`. Notices are not deletable through the API yet (`PUT` and `DELETE` on
the edit URL are 405), and there is no leave or remove-member endpoint.

### Attached route

A notice reads with `route`: `{id, name, distance, estimated_time}` (the route
without its path, `estimated_time` in whole seconds) or `null`. It is written
with `route_id`, which must be a route the caller drew (400 otherwise), so a
member cannot attach, and thereby expose, someone else's route. The card links
to the public page of the route ([route-sharing.md](route-sharing.md)): the
route's UUID is already its link, so members need no extra permission to open
it. `NoticeRouteLink` shows the route's map preview above its name row: the
same picture a link preview shows, with a marker on every checkpoint, loaded from
`/routes/<id>/opengraph-image` on the frontend (see
[route-sharing.md](route-sharing.md#the-preview-image)), lazily, since the home
feed can hold 50 notices. If the image fails to load, the link falls back to
the name row alone. Deleting the route keeps the notice and clears `route`.

## Frontend

The Clans tab ([ClansScreen.tsx](../../frontend/src/views/clans/ClansScreen.tsx))
shows pending invitations (Decline / Join), the caller's clans and a "New
clan" sheet. Opening a clan shows `ClanView`: description plus a Notices tab
(read, "New notice" sheet, and an Edit button on the caller's own notices that opens the same sheet filled in) and a Members tab (list, "Invite a rider" sheet,
which takes a username and completes it with riders whose name starts with what is typed, via
`GET /api/auth/users/search/`, see [authentication.md](authentication.md)). Home lists the feed under "From your clans" with the
same `NoticeList` and `NoticeCard`, so the author can edit from there too. The sheet is
`NoticeFormDialog` (create when it gets no notice, edit when it gets one); its route field
(`NoticeRoutePicker`) lists the caller's routes with `RouteChoiceList`, and tapping the
chosen route again removes it. The three sheets share `FormSheet` (a floating modal sheet; drag its header down to close it), which
is mounted to open and unmounted to close so each opening starts empty. List
loading shares `useRemoteList`.

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
- **Owner is not forced into `users` by the model**: membership is managed
  separately and the admin does not auto-add the owner. The create endpoint
  does add the creator, since only members can post and invite.
- **Invitations, not direct adds**: a member only proposes; the invitee
  decides. Otherwise anyone could put an unwilling user in a clan and into
  that clan's notices on their home feed. There is no status column: a
  pending invitation is a row, and accepting or declining deletes it.
- **`group_image` is optional**: the API and the app have no image upload
  yet, and a required image would block creating a clan from the app.
- **Edit is `PATCH`-only and author-only**: `clan` and `author` are read-only, so an
  edit can neither move a notice nor change who wrote it. Being a member is not
  enough, since the notice speaks in the author's name.
- **`ClanNotice.clean()`** rejects a `ride` that belongs to another clan.
  Like the validator, it runs on `full_clean()`, not on `save()`.
- **Deleting a ride keeps its notices** (`SET_NULL`); deleting a clan
  deletes its rides and notices.
- **Created by hand, not `startapp`**: `manage.py` needs all five `PG*`
  variables exported to load settings, and generated stubs would be unused.
