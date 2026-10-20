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
| [live.py](../../apps/routes/live.py) | `broadcast_route_change`: tells the connected riders the route changed |
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
| `POST /api/routes/groups/<uuid>/invite/` | The leader invites one more rider to a group that is rolling; answers the group (see [Inviting and removing](#inviting-and-removing)) |
| `POST /api/routes/groups/<uuid>/remove/` | The leader takes a rider out of the group; answers the group |
| `POST /api/routes/groups/<uuid>/leader/` | The leader hands the group to a rider who is riding in it; answers the group (see [Changing the leader](#changing-the-leader)) |
| `POST /api/routes/groups/<uuid>/route/` | The leader changes the route of a group that is rolling, or switches it to free mode; answers the group (see [Changing the route](#changing-the-route)) |
| `POST /api/routes/groups/<uuid>/leave/` | Takes a rider who accepted out of the group; `204` (see [Leaving](#leaving)) |
| `GET /api/routes/groups/active/` | The newest group the caller accepted, has not left and that saw activity in the last 2 h (see [Active group](#active-group)); `204` when there is none |

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

## Inviting and removing

The leader can change who is in a group while it rides (`invite_rider`, `remove_rider` in
[group_service.py](../../apps/routes/group_service.py), `GroupInviteView`, `GroupRemoveView`). Both lock the
group row like the answers do, and both need the caller to be the **author**: a rider of the group who
is not the leader gets `403` (`Only the rider who leads the group can do this.`), a stranger `404`. Both
answer the updated group, with the body of a read.

- **Invite** takes `{"username": "ben"}`. It adds the rider as `invited` and notifies them with a
  `NotificationEvent` of their own (the one the create call made covered only the first invitees).
  Errors are on `username`: no active user with that name (`No rider with this username.`), already
  invited or riding in the group, or a full group (`MAX_GROUP_PARTICIPANTS`). A rider who rejected
  earlier can be invited again; the new invitation replaces their `rejected` entry.
- **Remove** takes `{"user": 7}`. It forgets the rider's entry in `meta_json` and takes them out of
  `participants`, so the group is `404` for them afterwards and the invitation they may still hold is
  no longer listed. It works on an invited rider and on one who is riding. Errors are on `user`: not a
  participant of the group, or the leader themselves (use [leave](#leaving) to go).
- **The removed rider's channel** is not cut at once: their next position finds no place in the
  group, `save_position` says so and the consumer closes the socket with `4403`, which the others hear
  as "left". That takes at most one reporting interval (4 s).

## Changing the leader

The leader can hand the group to another rider (`promote_rider` in
[group_service.py](../../apps/routes/group_service.py), `GroupLeaderView`). It locks the group row and needs the
**author** (another rider `403`, a stranger `404`). It takes `{"user": <id>}`, and errors are on `user`: the
rider is the leader already, is not in the group, or has not accepted (only a rider who is riding can lead). The
author becomes that rider and bumps `updated_at`; the former leader stays in the group, still accepted, as a
rider, and loses the leader's controls (invite, remove, route, promote). The leader is only ever the `author`, so
every check that needs the leader follows the hand-over. It answers the updated group.

Once committed, `broadcast_leader_change` ([live.py](../../apps/routes/live.py)) sends `group.leader` to the
channel group, and every connected rider **except the former leader** gets
`{"type": "leader_changed", "user_id": <new leader>}`; each client reads the group again, as for a route change.
Best effort: a rider who is not connected learns the new leader when they read the group.

## Changing the route

The leader can swap the route while the group rolls (`change_route` in
[group_service.py](../../apps/routes/group_service.py), `GroupRouteView`). Like inviting and removing it locks
the group row and needs the **author**: another rider of the group gets `403`, a stranger `404`. It takes
`{"route": "<uuid>" | null}`; `null` is free mode. The field is required, and errors are on `route`: not one of
the caller's routes (`No route with this id.`, same check as the create call, `GroupRouteChoiceSerializer`). It
answers the updated group, with the body of a read, and bumps `updated_at`, which counts as activity.

Once the change is committed, `broadcast_route_change` ([live.py](../../apps/routes/live.py)) sends
`group.route` to the channel group, and every connected rider **except the leader** gets
`{"type": "route_changed"}` (see [Live channel](#live-channel)). The message carries no route: each client reads
the group again, so the permission and the shape of the route stay in one place. It is best effort; a rider who
is not connected gets the new route the next time they read the group. Riders' saved positions and statuses are
untouched.

## Leaving

A rider who ends their ride (quits, finishes, or leaves a free ride) is taken out of the group by
`POST /api/routes/groups/<uuid>/leave/` (`leave_group`): their entry is removed from `meta_json`
and from `participants`, which frees the place, hides the group from them (`404` afterwards) and
stops it being offered back through [Active group](#active-group) while the others still ride.
Only a rider who **accepted** can leave; a pending invitation is answered with accept/reject
instead (`400`). The client saves the ride first, then leaves, and ignores a failed request so a
bad connection never keeps the rider on the ride screen.

When the **leader** leaves, the group is not left without one: `next_leader` picks the rider who has been
in the group the longest (the order of the `participants` rows, which is the order they were added) among
those who are **riding** (accepted); invited riders are skipped. `leave_group` sets them as the `author` in
the same save and returns them, and once committed the view sends the same `leader_changed` as a
[hand-over](#changing-the-leader), so the others read the group again and see who leads. If nobody else is
riding, the author stays as it was (the group has no one left to lead, and it is no longer offered to anyone).

## Active group

A group has no "ended" column: it **has ended when it saw no activity for `RESUME_WINDOW`** (2 h).
Its `updated_at` is its last activity: it moves with every saved position, invitation and answer.
`find_active_group(groups, user, now)` answers the **newest** group (by `created_at`) that:

- the caller has **accepted** (an invitation not answered, or rejected, does not count), and has
  **not left** (leaving, quitting and finishing remove the rider, see [Leaving](#leaving)), and
- had activity within `RESUME_WINDOW`.

Nobody has to be connected, the caller included, and a solo ride counts. A phone that is locked, in
another app, or closed stops reporting (and loses its socket) without leaving, so judging by who reported
in the last seconds hid the ride from the very rider who wanted to come back to it, and from the others
once everybody had put the phone down. The riders on the map still age out after 30 s of silence on the
client ([ride.md](ride.md#group-ride)); that is about drawing them, not about whether the ride exists. An
older group stays the answer while the newer one has ended. The cost of a rider whose `leave` request
failed (it is only logged) is being offered the group until the window passes.

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
| server -> others | `{"type": "presence", "user_id": 5, "status": "joined" \| "left"}` when a rider signs in (after their `ready`) or their socket drops; not sent to that rider, and not for a socket that never got past sign-in |
| server -> others | `{"type": "route_changed"}` when the leader changes the route ([Changing the route](#changing-the-route)); not sent to the leader |
| server -> others | `{"type": "leader_changed", "user_id": 7}` with the new leader when the leader hands the group over ([Changing the leader](#changing-the-leader)); not sent to the former leader |
| server -> rider | `{"type": "error", "detail": "..."}` for a bad position, an unknown type or a non-object; the socket stays open |

Riders send their position every 4 s (the client's job, see [ride.md](ride.md)). Each
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

- **The current status is in `meta_json`; each answer is also kept per notification**: one notification
  reaches many users, so the group is the one place that knows its riders' current state. A rider invited
  again gets a new notification, and `InvitationAnswer` keeps the old ones closed with what was answered
  ([notifications.md](notifications.md)).
- **The author is a participant** with status `accepted`, so they share their position like
  everyone else and take one of the `MAX_GROUP_PARTICIPANTS` places.
- **Only the leader manages riders and the route**: the author is the one who invites at the start, so the
  same rider invites and removes later, and picks and changes the route; anyone else leaving goes through `leave`.
- **Rules in a service, not in the view**: `create_group` and `answer_invitation` are plain
  functions over models; the views only translate HTTP and the `400`/`404` answers.
- **Constant queries**: reading a group is 2 queries and the notification list is 1, however
  many riders or events there are (the tests assert it).
