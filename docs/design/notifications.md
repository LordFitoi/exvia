# Notifications

Django app for notifications sent to users. A model, admin and a read endpoint; the
events created so far are the route invitation of [route-groups.md](route-groups.md) and the start of a clan ride ([scheduled-events.md](scheduled-events.md)).
The list is fetched by clients; on top of it, every event is also heard at once by the destinations who have the app
open, as a toast (see [Live channel](#live-channel)), and reaches the phones of the native app with the app closed
through a check the app runs itself (see
[Background check](#background-check-native-app)). The Home bell and sheet that
show the list are in [frontend-screens.md](frontend-screens.md).

## Layout

The app lives in [apps/notifications/](../../apps/notifications/) and is
registered in `INSTALLED_APPS` as `apps.notifications`
([settings.py](../../config/settings.py)). Its URLs are mounted at `api/notifications/`
in `config/urls.py`.

| File | Responsibility |
|------|----------------|
| [models.py](../../apps/notifications/models.py) | `EventType` choices, the `NotificationEvent` and `InvitationAnswer` models |
| [admin.py](../../apps/notifications/admin.py) | Admin of the models |
| [services.py](../../apps/notifications/services.py) | `notify_route_invitation` creates events from other apps; `record_invitation_answer` closes one with the answer |
| [serializers.py](../../apps/notifications/serializers.py), [views.py](../../apps/notifications/views.py), [urls.py](../../apps/notifications/urls.py) | `GET /api/notifications/` |
| [consumers.py](../../apps/notifications/consumers.py), [routing.py](../../apps/notifications/routing.py) | `NotificationConsumer` at `/ws/notifications/` |
| [live.py](../../apps/notifications/live.py) | `build_notification` (the title and text of an event) and `broadcast_event`, which sends it to the open apps of its destinations |
| [signals.py](../../apps/notifications/signals.py) | Starts the live broadcast when users are added to an event's `destinations` |

## Data model

`NotificationEvent` inherits `apps.core.models.TimeStampedModel` and is
ordered newest first.

| Field | Type | Notes |
|-------|------|-------|
| `event_type` | `CharField(32)` | `EventType`: `route_invitation`, `clan_invitation`, `event_started`, `system` |
| `author` | FK to `auth.User` | Optional (`null`, `blank`); empty for system events; `related_name='sent_notification_events'`, `CASCADE` |
| `destinations` | M2M to `auth.User` | Everyone notified by this one event; `related_name='notification_events'` |
| `route_group` | FK to `routes.RouteGroup` | Optional; the group a route invitation or a started event is about; `related_name='notification_events'`, `CASCADE` |
| `scheduled_event` | FK to `clans.ScheduledEvent` | Optional; the clan event that started; `related_name='notification_events'`, `CASCADE` |

`InvitationAnswer` (`event` FK `related_name='answers'`, `user` FK, `status` an `AnswerStatus`: `accepted`,
`rejected` or `expired`, unique per `event` + `user`) is what one destination answered to one event, or
`expired` when the rider accepted another invitation first. It is written once and never changes.


## API

`GET /api/notifications/` (JWT) lists the latest 50 events addressed to the caller, newest
first, in one query, unpaginated:

```json
[{
  "id": 12,
  "event_type": "route_invitation",
  "author": {"id": 3, "username": "owner", "avatar": null},
  "route_group": "5b8f...",
  "route_name": "Sunday loop",
  "title": "Ride invitation",
  "body": "owner invited you to ride Sunday loop.",
  "status": "invited",
  "created_at": "2026-10-18T09:00:00Z"
}]
```

`title` and `body` are the text of the system notification and of the live toast (`build_notification` in
[live.py](../../apps/notifications/live.py)), computed from the event with the relations the query already loads.
`?after=<id>` keeps only the events with a larger id (a value that is not a number is a `400`), which is how the native
app asks for what it has not shown yet. `route_name` is the route's name, `"Track mode"` for a [track ride](track-mode.md) and `null` in free mode (the live text says "in track mode" for the first of those too). `status` is the caller's answer **to that event** and `null` for events
that are not about a group. An `event_started` event also carries `scheduled_event` (id), `event_title` and
`clan_name` (all `null` for other events), and its `status` is `open` (its group is `live` and the caller is not in
it, so they can join), `joined` or `ended` (the group saw no activity for `RESUME_WINDOW`); it is sent to every
member of the clan but the admin. For route invitations:

| Status | When |
|--------|------|
| `accepted`, `rejected` | The caller answered this event (an `InvitationAnswer` exists). Final: a later invitation to the same group does not reopen it |
| `invited` | No answer yet, this is the caller's newest event for the group, it is younger than `INVITATION_VALIDITY` and the group's `meta_json` still has them as invited. Only this one can be answered |
| `expired` | Unanswered but no longer answerable: it is `INVITATION_VALIDITY` (1 h, in [services.py](../../apps/notifications/services.py)) old or older, the caller accepted another invitation (an `InvitationAnswer` with `expired`), was invited again, or was taken out of the group |

Before a newest event is answered, its status is read from the group's `meta_json`, which is how events
from before `InvitationAnswer` keep showing their answer. A client counts the `invited` ones for a badge.
There is no read flag yet: an answered invitation stays in the list with its status.

The list is still **one query**: the caller's answer and "is there a newer event for the same group" are
annotated as subqueries.

## Live channel

While the app is open (any signed-in screen) it holds a websocket to `/ws/notifications/`, so a new
notification shows as a **toast** at once instead of waiting for the next time the list is fetched.

- **Protocol.** Like the ride channel ([asgi-websockets.md](asgi-websockets.md)), the first message is
  `{"type": "auth", "token": <access JWT>}` (a missing, bad or late token closes with `4401`), and the
  server answers `{"type": "ready"}`. After that it only sends
  `{"type": "notification", "id", "title", "body"}`, the client
  sends nothing else. Token checking is shared with the ride channel in
  [websocket_auth.py](../../apps/core/websocket_auth.py).
- **Fan-out.** Each connected user joins the channel-layer group `user_notifications_<id>`, so every open
  app of the user (phone and laptop) hears it, across replicas, through Redis. The `m2m_changed` receiver
  calls `broadcast_event` on commit, so a new `event_type` is live with no extra code.
- **Best effort.** A user with no open app hears nothing here and finds the event in the list. If Redis
  cannot be reached the failure is logged and the request that created the event is not affected.
- **Client.** `LiveNotificationProvider` (in the `(app)` layout) opens it with `startNotificationConnection`,
  which reuses the reconnecting, token-renewing socket of the ride channel (`startSocketConnection`), shows
  the `body` in a `Toast` with the bell icon, and exposes the latest notification through
  `useLiveNotifications`. `useRideNotifications` reloads when a new one arrives, so Home's bell badge and
  the sheet are current without a refresh.

## Background check (native app)

The live channel only reaches an open app. In the Android app ([frontend-native.md](frontend-native.md#notifications-when-the-app-is-not-in-front))
the same events also arrive as system notifications with the app in the background or closed, with no push service:
the app polls the list endpoint itself.

- **A foreground service** asks `GET /api/notifications/?after=<last id>` every 30 s while the app's process is alive;
  **a WorkManager job** does the same about every 15 min when it is not (swiped away, killed, after a reboot).
- The native side keeps its own session, handed over by the page (a refresh token and the user id), and renews the
  access token on its own. The server needs nothing for this beyond the list endpoint: the first check of a session
  records the newest id as a baseline, so only events created afterwards are shown.
- The text shown is the `title` and `body` of each listed event, the same as the live toast.
- **Best effort.** A failed request is logged and retried at the next check; nothing is lost, since the cursor only
  moves after the events were handled, and the event is always in the list.

## Key decisions

- **Deleting the author deletes the event**: `SET_NULL` would turn a deleted
  rider's invitation into a system event, which is a lie. The notification
  goes with the user, like `ClanNotice.author`.
- **One event, many destinations**: inviting five riders to a group creates one
  event, not five. What each destination answered is an `InvitationAnswer` row. The group's
  `meta_json` ([routes.md](routes.md#group-meta)) only holds the rider's *current* state, so it cannot
  tell the notifications of one rider apart: inviting the same rider again after they answered or left
  makes a new event for the same group, and reading every event's status from the group made all of the
  old ones show `invited` again.
- **Expiry is computed for time, recorded for the other invitation**: an invitation expires `INVITATION_VALIDITY`
  after its event was created, judged on read (`is_invitation_expired`) by the list and by the answer
  endpoints (`400`, `This invitation has expired.`), so nothing runs in the background. A timed-out invitee
  keeps their place in the group until the leader removes them or invites them again (a new event, a new hour).
  Accepting an invitation is different: it is an event of its own, so `expire_other_invitations` closes the
  rider's other pending invitations at once with an `expired` answer and takes them out of those groups (see
  [route-groups.md](route-groups.md#answering-and-expiry)), so a rider is never invited to two rides at once.
- **Answering closes the newest event**: a rider can only have one pending invitation per group, so the
  answer endpoints (by group) always mean their newest event for it. Old events cannot be answered.
- **The link is typed, per kind of event**: `route_group` exists because the first
  event that needs a target is the route invitation; a clan invitation would get its
  own optional FK the same way. A new `event_type` is one `EventType` member plus a
  no-op `AlterField` migration (choices are part of the migration state).
- **The broadcast is a side effect of the destinations, not of each service**: the signal means a new event
  type is heard live with no extra code, only a text. The cost is that adding users to an existing event also
  announces it to them.
- **Polling instead of a push service.** A closed Android app can only be woken through Google's push service
  (Firebase Cloud Messaging), which needs a Firebase project, a key on the server and a Google config file in the app.
  This app avoids that: a foreground service polls every 30 s while the app is alive and WorkManager every 15 min
  otherwise. The cost is latency when the app is closed, an ongoing notification while it is alive, and battery.
  Web Push and Firebase were both removed (migrations `0005_delete_pushsubscription` and `0009_delete_devicetoken`);
  a browser or PWA user with the app closed finds the event in the list the next time they open it.
- **The list carries the text.** `title` and `body` are in the list response so the native checker, which cannot reuse
  the websocket message, shows exactly what the toast shows without rebuilding the text in Java.
- **Read state is not modelled**: a read flag is decided with the feature that needs it.
