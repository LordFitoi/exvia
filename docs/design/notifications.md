# Notifications

Django app for notifications sent to users. A model, admin and a read endpoint; the
events created so far are the route invitation of [route-groups.md](route-groups.md) and the start of a clan ride ([scheduled-events.md](scheduled-events.md)).
The list is fetched by clients; on top of it, every event is also heard at once by the destinations who have the app
open, as a toast (see [Live channel](#live-channel)), and reaches the phones of the native app as a push (see
[Push](#push-native-app)). The Home bell and sheet that
show the list are in [frontend-screens.md](frontend-screens.md).

## Layout

The app lives in [apps/notifications/](../../apps/notifications/) and is
registered in `INSTALLED_APPS` as `apps.notifications`
([settings.py](../../config/settings.py)). Its URLs are mounted at `api/notifications/`
in `config/urls.py`.

| File | Responsibility |
|------|----------------|
| [models.py](../../apps/notifications/models.py) | `EventType` choices, the `NotificationEvent`, `InvitationAnswer` and `DeviceToken` models |
| [admin.py](../../apps/notifications/admin.py) | Admin of the models |
| [services.py](../../apps/notifications/services.py) | `notify_route_invitation` creates events from other apps; `record_invitation_answer` closes one with the answer |
| [serializers.py](../../apps/notifications/serializers.py), [views.py](../../apps/notifications/views.py), [urls.py](../../apps/notifications/urls.py) | `GET /api/notifications/` |
| [consumers.py](../../apps/notifications/consumers.py), [routing.py](../../apps/notifications/routing.py) | `NotificationConsumer` at `/ws/notifications/` |
| [live.py](../../apps/notifications/live.py) | `build_notification` (the title and text of an event) and `broadcast_event`, which sends it to the open apps of its destinations |
| [push.py](../../apps/notifications/push.py) | `push_event`: sends the same title and text to the destinations' phones through Firebase Cloud Messaging |
| [device_views.py](../../apps/notifications/device_views.py) | `POST`/`DELETE /api/notifications/devices/`: register and forget a phone's token |
| [signals.py](../../apps/notifications/signals.py) | Starts the live broadcast and the push when users are added to an event's `destinations` |

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

`DeviceToken` (`user` FK `related_name='device_tokens'`, `token` unique, up to 512 characters) is the Firebase token of one
app install. A token belongs to one user at a time: registering it again as someone else moves it.

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
  "status": "invited",
  "created_at": "2026-10-18T09:00:00Z"
}]
```

`route_name` is `null` in free mode. `status` is the caller's answer **to that event** and `null` for events
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

## Push (native app)

The live channel only reaches an open app. In the Android app ([frontend-native.md](frontend-native.md#push-notifications))
the same event also arrives as a system notification when the app is closed or in the background.

- **Registering.** The app asks the phone's permission, gets its Firebase token and sends it with
  `POST /api/notifications/devices/` (`{"token": "..."}`, `204`). It is repeated on every start, so a token Firebase
  rotated is picked up. On sign out the app sends `DELETE` with the same body (only the caller's own token is removed)
  and Firebase drops the token, so the next person on that phone does not get these pushes.
- **Sending.** The same `on_commit` signal that does the live broadcast calls `push_event`. It reads the tokens of the
  destinations in one query and hands them to a single background worker thread, so the request (or the scheduler loop)
  does not wait for Firebase. The worker calls the FCM HTTP v1 API (`messages:send`) once per token, signed as the
  service account, with `title` and `body` from `build_notification`, `data.notification_id`, high priority and the
  Android channel `exvia-notifications`.
- **Configuration.** `FIREBASE_SERVICE_ACCOUNT_JSON` holds the content of the Firebase project's service account key
  (Project settings, Service accounts, Generate new private key). It is read by the Server and the Scheduler (both create
  events). When it is empty `push_event` returns at once, nothing else changes, and a key that is not valid JSON is logged
  and treated as empty.
- **Best effort.** A failed or refused send is logged and the token is kept; a `404` (`UNREGISTERED`: the app was
  uninstalled or its data cleared) deletes the token.
- **Foreground.** An app in front does not show Firebase's notification itself, so the user sees the toast and not both.

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
- **Push is native only, through Firebase.** Web Push (a `PushSubscription` model, VAPID keys) was removed from the
  browser and the PWA; migration `0005_delete_pushsubscription` drops its table. A browser or PWA user with the app
  closed finds the event in the list the next time they open it. The Android app has `DeviceToken` and FCM instead,
  because a WebView cannot receive Web Push and Firebase wakes the phone for it.
- **A thread, not a queue.** Sending is a single in-process worker thread: no Celery or Redis queue to run, and a
  restart can lose a push that was still waiting, which the list and the live toast make up for.
- **Read state is not modelled**: a read flag is decided with the feature that needs it.
