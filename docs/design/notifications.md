# Notifications

Django app for notifications sent to users. A model, admin and a read endpoint; the
only event created so far is the route invitation of [route-groups.md](route-groups.md).
The list is fetched by clients; on top of it, every event is also sent to the phones of its
destinations as a **Web Push** notification (see [Web Push](#web-push)). The Home bell and sheet that
show the list are in [frontend-screens.md](frontend-screens.md).

## Layout

The app lives in [apps/notifications/](../../apps/notifications/) and is
registered in `INSTALLED_APPS` as `apps.notifications`
([settings.py](../../config/settings.py)). Its URLs are mounted at `api/notifications/`
in `config/urls.py`.

| File | Responsibility |
|------|----------------|
| [models.py](../../apps/notifications/models.py) | `EventType` choices and the `NotificationEvent` model |
| [admin.py](../../apps/notifications/admin.py) | `NotificationEventAdmin` |
| [services.py](../../apps/notifications/services.py) | `notify_route_invitation`: the one place events are created from other apps |
| [serializers.py](../../apps/notifications/serializers.py), [views.py](../../apps/notifications/views.py), [urls.py](../../apps/notifications/urls.py) | `GET /api/notifications/` |
| [push.py](../../apps/notifications/push.py) | Payload of an event and its delivery to the subscriptions, in a thread |
| [signals.py](../../apps/notifications/signals.py) | Starts the delivery when users are added to an event's `destinations` |
| [push_serializers.py](../../apps/notifications/push_serializers.py), [push_views.py](../../apps/notifications/push_views.py) | The two push endpoints |
| [management/commands/generate_vapid_keys.py](../../apps/notifications/management/commands/generate_vapid_keys.py) | Makes the key pair Web Push needs |

## Data model

`NotificationEvent` inherits `apps.core.models.TimeStampedModel` and is
ordered newest first.

| Field | Type | Notes |
|-------|------|-------|
| `event_type` | `CharField(32)` | `EventType`: `route_invitation`, `clan_invitation`, `system` |
| `author` | FK to `auth.User` | Optional (`null`, `blank`); empty for system events; `related_name='sent_notification_events'`, `CASCADE` |
| `destinations` | M2M to `auth.User` | Everyone notified by this one event; `related_name='notification_events'` |
| `route_group` | FK to `routes.RouteGroup` | Optional; the group a route invitation is about; `related_name='notification_events'`, `CASCADE` |

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

`route_name` is `null` in free mode. `status` is the caller's own answer to the invitation,
read from the group's `meta_json` (`invited`, `accepted` or `rejected`), and `null` for events
that are not about a group. A client counts the `invited` ones for a badge. There is no read
flag yet: an answered invitation stays in the list with its status.

## Web Push

A notification reaches a phone that has the app closed through the browser's push service
(FCM, Mozilla, Apple, Windows), using the Web Push protocol with VAPID keys.

**Currently disabled in the frontend.** `IS_PUSH_ENABLED` in `hooks/usePushNotifications.ts` is
`false` until push is configured properly: the app no longer asks for permission, subscribes or shows
the **Turn on** row. Logout still removes an existing subscription. Browsers that subscribed earlier
keep their subscription on the server until it is removed there.

**Configuration.** Three settings, read from the environment, all optional: `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY` and `VAPID_CONTACT_EMAIL` (an address the push services may write to). Without
all three **no push is sent** and the key endpoint answers `null`, so the app runs without it.
`make vapid_keys` (`python manage.py generate_vapid_keys`) prints a pair; keep the private key secret and **never change
the pair afterwards**, since every existing subscription is tied to the public key. On Railway the
three are `preserve()`d in [railway.ts](../../.railway/railway.ts): set them once in the dashboard.

**Model.** `PushSubscription`: `user` (CASCADE, `related_name='push_subscriptions'`), `endpoint`
(unique) and the browser's `p256dh` and `auth` keys. One user can have many (phone, laptop); an
endpoint belongs to one user at a time.

| Endpoint | Does |
|----------|------|
| `GET /api/notifications/push/key/` | `{"public_key": "..." \| null}` the browser subscribes with |
| `POST /api/notifications/push/subscriptions/` | Body: the browser's `PushSubscription.toJSON()` (`endpoint`, `keys`). Saves it for the caller (a browser already known moves to the caller); `204` |
| `DELETE /api/notifications/push/subscriptions/` | Body `{"endpoint"}`. Removes the caller's own; `204` |

The endpoint must be `https` and on a known push service (`googleapis.com`, `mozilla.com`,
`windows.com`, `apple.com`), or the POST is `400`: the server calls that address, so an open
list would let a client make it call any URL (SSRF).

**Delivery.** A `m2m_changed` receiver on `NotificationEvent.destinations` reacts to `post_add`
(`event.destinations.add()` or `.set()`, which is how `services.py` creates events; adding from the
user's side is not covered). When the surrounding transaction commits, one background thread
(`push.deliver`) pushes to all subscriptions of the added users, so the request that created the
event does not wait for the push services. The payload is `{title, body, url, tag}`:

| Event | Title and text |
|-------|----------------|
| `route_invitation` | "Ride invitation", "ana invited you to ride Coast loop." (or "in free mode") |
| `clan_invitation` | "Clan invitation", "ana invited you to join a clan." |
| other | "Exvia", "You have a new notification." |

`url` is `/` (Home, where the bell carries the invitation) and `tag` is `event-<id>`. A push the
service answers `404` or `410` (the browser unsubscribed) deletes that subscription; any other failure
is logged and the subscription stays. Delivery is best effort: no retry, and a message not delivered
within a day (`PUSH_TTL_SECONDS`) is dropped by the push service. The thread dies with the process, so
a restart in the middle loses the pushes in flight; the list in the app is the source of truth.

**Client.** `public/sw.js` shows the notification on `push` and, on a tap, focuses the open app or opens
it at `url`. `usePushNotifications` (Home) registers the browser: when the permission is already granted
it subscribes again silently on every Home mount, which also moves a shared phone to whoever is signed
in; otherwise the notifications sheet shows a **Turn on** row (a tap is required by the browsers, iOS
included) or, if the user denied it, how to unblock it. Logging out removes the subscription from the
server and the browser first, so the next rider on that phone does not get the previous one's messages.
The service worker is registered in production builds only, so push can be tried with `next build &&
next start` on localhost or HTTPS; in development the row never appears. iOS needs the app installed to
the home screen.

## Key decisions

- **Deleting the author deletes the event**: `SET_NULL` would turn a deleted
  rider's invitation into a system event, which is a lie. The notification
  goes with the user, like `ClanNotice.author`.
- **One event, many destinations**: inviting five riders to a group creates one
  event, not five. What each destination answered is not stored here: for route
  invitations it is the participant status in the group's `meta_json`
  ([routes.md](routes.md#group-meta)).
- **The link is typed, per kind of event**: `route_group` exists because the first
  event that needs a target is the route invitation; a clan invitation would get its
  own optional FK the same way. A new `event_type` is one `EventType` member plus a
  no-op `AlterField` migration (choices are part of the migration state).
- **Push is a side effect of the destinations, not of each service**: the signal means a new event
  type is pushed with no extra code, only a payload text. The cost is that adding users to an
  existing event also pushes to them.
- **No task queue**: a thread started on commit is enough for a few phones per event. A queue becomes
  worth it with many destinations per event or when lost pushes matter.
- **Read state is not modelled**: a read flag is decided with the feature that needs it.
