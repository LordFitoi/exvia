# Notifications

Django app for notifications sent to users. A model, admin and a read endpoint; the
only event created so far is the route invitation of [route-groups.md](route-groups.md).
No push or live channel yet: clients fetch the list. The Home bell and sheet that show it are in
[frontend-screens.md](frontend-screens.md).

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
- **Delivery and read state are not modelled**: channels (in-app, push,
  WebSocket) and a read flag are decided with the feature that needs them.
