# Route groups

A `RouteGroup` is a set of riders rolling together under one leader (the author), on a
route or in free mode. The leader creates it from the Ride tab, invites riders by
username, and each invitee accepts or rejects from their notifications
([notifications.md](notifications.md)). The route model itself is in
[routes.md](routes.md); the screens are in [ride.md](ride.md).

## Layout

All in [apps/routes/](../../apps/routes/):

| File | Responsibility |
|------|----------------|
| [models.py](../../apps/routes/models.py) | `RouteGroup`, `MAX_GROUP_PARTICIPANTS` |
| [group_meta.py](../../apps/routes/group_meta.py) | Shape, validator and helpers of `meta_json` |
| [group_service.py](../../apps/routes/group_service.py) | `create_group`, `answer_invitation`, `find_active_group`: the rules, no HTTP |
| [group_serializers.py](../../apps/routes/group_serializers.py) | `GroupCreateSerializer`, `GroupSerializer` |
| [group_views.py](../../apps/routes/group_views.py) | The group endpoints |
| [consumers.py](../../apps/routes/consumers.py), [routing.py](../../apps/routes/routing.py) | `RouteGroupConsumer`, the live channel; its route is added to `apps/core/routing.py` |
| [signals.py](../../apps/routes/signals.py) | The participant limit, on the many-to-many |

## Data model

`RouteGroup` inherits `TimeStampedModel` and is ordered newest first. It is also in the
Django admin.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `UUIDField` | Primary key, `uuid4`, `editable=False` |
| `route` | FK to `Route` | Optional (`null`, `blank`), `related_name='groups'`, `SET_NULL`; empty means free mode |
| `participants` | M2M to `auth.User` | `related_name='route_groups'`, `blank=True`, at most `MAX_GROUP_PARTICIPANTS` |
| `author` | FK to `auth.User` | The group owner, `related_name='authored_route_groups'`, `CASCADE` |
| `meta_json` | `JSONField` | Default `{}`; status and latest position of each participant, validated by `validate_group_meta` (see [Group meta](#group-meta)) |

- **The route is optional and changeable**: the owner can swap it while the
  group is rolling, or leave it empty for free mode. Deleting a route sets it
  to `NULL` instead of deleting the group.
- **The participant limit is one constant**: `MAX_GROUP_PARTICIPANTS = 10` in
  `models.py`. It is not a column or a database constraint, so raising it
  needs no migration. It is enforced by an `m2m_changed` receiver
  (`pre_add`, both `group.participants.add()` and `user.route_groups.add()`),
  which raises `ValidationError`, and by the admin form for a friendlier
  message. `bulk_create` on the through table skips both.
- **The model does not add the author to `participants`**: `create_group` does (see
  [Key decisions](#key-decisions)); a group made in the admin starts empty.

## Group meta

[group_meta.py](../../apps/routes/group_meta.py) owns the shape of `meta_json` and is
the only code that reads or writes it (pure functions over the dict, no queries):

```json
{
  "version": 1,
  "participants": {
    "7": {
      "status": "accepted",
      "position": {"lng": -3.7, "lat": 40.4, "heading": 90, "speed": 25.5,
                   "accuracy": 8, "recorded_at": "2026-10-18T09:30:00+00:00"}
    },
    "9": {"status": "invited", "position": null}
  }
}
```

- Keys are user ids as strings; `status` is `ParticipantStatus` (`invited`,
  `accepted`, `rejected`). `speed` is km/h (like the ride summaries), `accuracy`
  metres, `heading` degrees; the three are optional (`null`).
- **Only the latest position is kept**, replaced on every report, so the blob
  stays a few hundred bytes per rider however long the ride is. There is no
  trail or history.
- `recorded_at` is stamped by the server when it receives the position, never
  taken from the client's clock. `clean_position` checks and stamps a reported
  position; `validate_group_meta` is the model validator (`{}` is valid: a group
  nobody has joined yet).

## API

All endpoints need a JWT, like the rest of `/api/routes/`.

| Endpoint | Does |
|----------|------|
| `POST /api/routes/groups/` | Creates a group led by the caller |
| `GET /api/routes/groups/<uuid>/` | Reads a group the caller is in or was invited to |
| `POST /api/routes/groups/<uuid>/accept/` | Accepts the caller's invitation; answers the group |
| `POST /api/routes/groups/<uuid>/reject/` | Rejects it and leaves the group; `204` |
| `POST /api/routes/groups/<uuid>/leave/` | Takes a rider who accepted out of the group; `204` (see [Leaving](#leaving)) |
| `GET /api/routes/groups/active/` | The newest group the caller can join back (see [Active group](#active-group)); `204` when there is none |

**Create** takes `{"route": "<uuid>" | null, "invitees": ["ana", "ben"]}`; both are optional
(`null`/empty is free mode with nobody invited). In one transaction it creates the group,
puts the author in `participants` with status `accepted` and the invitees with `invited`,
and, when there are invitees, creates **one** `NotificationEvent` (`route_invitation`) for all
of them. Field errors come back per field, like the clan invitation: `route` is not one of the
caller's (`No route with this id.`, so another rider's route id is not confirmed), `invitees`
has an unknown or inactive username, the caller's own name, or the group would have more than
`MAX_GROUP_PARTICIPANTS` riders. Repeated names are invited once.

**Read** answers (`201` on create, `200` on read and accept):

```json
{
  "id": "5b8f...",
  "route": {"id": "2dfd...", "name": "Sunday loop", "distance": 1.2, "estimated_time": 73,
            "points": [[-3.70, 40.41], [-3.69, 40.42]]},
  "author": {"id": 3, "username": "owner", "avatar": "/media/avatars/x.jpg"},
  "participants": [
    {"id": 3, "username": "owner", "avatar": "/media/avatars/x.jpg", "status": "accepted"},
    {"id": 5, "username": "ana", "avatar": null, "status": "invited"}
  ],
  "created_at": "2026-10-18T09:00:00Z"
}
```

`route` is `null` in free mode. It carries the path because an invitee cannot read the
author's route through `GET /api/routes/<uuid>/` (that only returns the caller's own).
`avatar` is a site-relative URL (`/media/...`, forwarded to the backend by the frontend's
rewrite) or `null`, which the client shows as initials. Groups the caller is not in are `404`.

**Answering** locks the group row, so two answers or an answer and a position write cannot
overwrite each other's `meta_json`. Only a pending invitation can be answered: a second
answer, or the author's own, is `400` (`You have already answered this invitation.`).
Rejecting records `rejected` in `meta_json` and removes the rider from `participants`, which
frees the place and makes every later call about that group `404` for them.

**Saving the ride**: `POST /api/routes/<uuid>/summaries/` (see [routes.md](routes.md#route-summaries))
now also accepts the route of a group the caller has **accepted** (looked up in `meta_json`);
an invited-only or rejected rider still gets `404`. The summary belongs to the caller alone.

Also new, in the users app: `GET /api/auth/users/lookup/?username=<name>` returns
`{"id", "username", "avatar"}` for an active user with exactly that username, `404` otherwise.
The invite dialog uses it to reject an unknown name before **Ride** is pressed. It tells a
signed-in caller whether a username exists, as the clan invitation already does.

## Leaving

A rider who ends their ride (quits, finishes, or leaves a free ride) is taken out of the group by
`POST /api/routes/groups/<uuid>/leave/` (`leave_group`): their entry is removed from `meta_json`
and from `participants`, which frees the place, hides the group from them (`404` afterwards) and
stops it being offered back through [Active group](#active-group) while the others still ride.
Only a rider who **accepted** can leave; a pending invitation is answered with accept/reject
instead (`400`). The client saves the ride first, then leaves, and ignores a failed request so a
bad connection never keeps the rider on the ride screen.

## Active group

A group has no "ended" column: it **has ended when nobody is connected to it**. A rider is
connected while their latest position in `meta_json` is at most `CONNECTED_WINDOW` (30 s, the same
time after which the client hides a quiet rider, see [ride.md](ride.md#group-ride)) old.
`find_active_group(groups, user, now)` answers the **newest** group (by `created_at`) that:

- the caller has **accepted** (an invitation not answered, or rejected, does not count), and
- has **another** accepted rider connected. The caller's own position is ignored on purpose:
  a rider who quits would otherwise be offered the ride they have just left, and a solo ride is
  never "active" for its own rider.

A new group is therefore the active one as soon as someone but its author reports from it, because
it is the newest. An older group that is still connected stays the answer while the newer one has
nobody connected. `save_position` now also writes `updated_at`, so a group's `updated_at` is its
last activity: the query narrows to groups touched in the window in the database and
`group_meta.has_connected_rider` does the exact per-rider check on the few that are left.

The endpoint answers the same body as the group read, so the client can ride it as it is, or `204`
with no body. It is the only way to find a group without knowing its id.

## Live channel

`ws://<host>/ws/routes/groups/<group uuid>/` (`RouteGroupConsumer`). Every group is one
Channels group named `route_group_<uuid>`, so riders on different replicas hear each other
through Redis ([asgi-websockets.md](asgi-websockets.md)).

**Handshake.** Browsers cannot set an `Authorization` header on a websocket, and a token in
the URL ends up in access logs, so the first message after connecting is

```json
{"type": "auth", "token": "<access JWT>"}
```

The socket is accepted first and closed by the server when that does not go well:

| Close code | Meaning |
|------------|---------|
| `4401` | First message is not a valid `auth`, the token is bad or expired, or nothing arrived within 5 s (`AUTH_TIMEOUT_SECONDS`) |
| `4403` | The user has not **accepted** the group (an invitee, a rejected rider, a stranger, or no such group), or lost their place while connected |

The token is checked once, at connect. The access token lives 15 minutes and a ride can be
longer, so the socket is not closed when it expires; losing the place in the group is checked
on every position instead.

**Messages.**

| Direction | Message |
|-----------|---------|
| server -> rider | `{"type": "ready", "user_id": 5, "positions": {"7": {...}}, "server_time": "..."}` right after a good `auth`: who you are, the latest saved position of every rider (so a late joiner sees the others at once) and the server's clock, so the client can tell how old each `recorded_at` is without trusting the phone's clock |
| rider -> server | `{"type": "position", "lng": -3.7, "lat": 40.4, "heading": 90, "speed": 25.5, "accuracy": 8}`; `heading`, `speed` (km/h) and `accuracy` (m) are optional |
| server -> others | `{"type": "position", "user_id": 5, "lng": ..., "lat": ..., "heading": ..., "speed": ..., "accuracy": ..., "recorded_at": "..."}`; not echoed back to the sender |
| server -> rider | `{"type": "error", "detail": "..."}` for a bad position, an unknown type or a non-object; the socket stays open |

Riders send their position every 5 s (the client's job, see [ride.md](ride.md)). Each
position is checked and stamped by `clean_position`, **saved** as the rider's latest in
`meta_json` and then broadcast. Saving locks the group row (`select_for_update`), so riders
reporting at the same moment cannot overwrite each other; a test runs two threads against it
and fails without the lock. A rider sending faster than once a second
(`MIN_POSITION_INTERVAL_SECONDS`) has the extra positions dropped silently, so a broken or
hostile client cannot hammer the database.

**Not in the channel:** joining and leaving. Answering an invitation is REST; a rider who
accepts simply connects, and one who disconnects just stops updating (their last position
stays on the others' maps until the client decides to hide a stale one).

## Client

The screens that use all of this are described in [ride.md](ride.md) (the setup, the dialogs,
the ride and the other riders on the map) and [frontend-screens.md](frontend-screens.md) (the Home
bell and the notifications sheet). In short: **Ride** calls `POST /api/routes/groups/`; an invitee
opens the sheet from the Home bell and **Accept** goes to `/ride/<group id>`; both then join
`/ws/routes/groups/<id>/` and draw each other as bubbles above a dot.

## Key decisions

- **The status is in `meta_json`, not on the notification**: one notification reaches many
  users, so what each of them answered cannot live on it. The group is the one place that
  knows its riders ([notifications.md](notifications.md)).
- **The author is a participant** with status `accepted`, so they share their position like
  everyone else and take one of the `MAX_GROUP_PARTICIPANTS` places.
- **Rules in a service, not in the view**: `create_group` and `answer_invitation` are plain
  functions over models; the views only translate HTTP and the `400`/`404` answers.
- **Constant queries**: reading a group is 2 queries and the notification list is 1, however
  many riders or events there are (the tests assert it).
