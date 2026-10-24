# Scheduled events

A scheduled event is a ride the clan admin plans. Creating one posts a notice in the clan; when its time comes the event
**starts**: a [route group](route-groups.md) led by the admin opens, every other member gets an in-site
notification ([notifications.md](notifications.md)) and a **Join ride** button, on the notice, in the Events
tab and in the Home bell. The clan itself is in [clans.md](clans.md).

## Layout

| File | Responsibility |
|------|----------------|
| [models.py](../../apps/clans/models.py) | `ScheduledEvent`, `EventStatus`; `ClanNotice.event` |
| [event_service.py](../../apps/clans/event_service.py) | The rules, no HTTP: `create_event`, `start_event`, `start_due_events`, `join_event`, `find_next_event`, `event_state` |
| [start_scheduled_events.py](../../apps/clans/management/commands/start_scheduled_events.py) | The command that starts the events that are due |
| [serializers.py](../../apps/clans/serializers.py), [views.py](../../apps/clans/views.py), [urls.py](../../apps/clans/urls.py) | `ScheduledEventSerializer`, `ClanEventListCreateView`, `ClanEventJoinView` |
| [group_service.py](../../apps/routes/group_service.py) | `join_group` (a rider enters without an invitation) and `is_group_active` |
| [services.py](../../apps/notifications/services.py) | `notify_event_started` |

## Data model

`ScheduledEvent` replaces `ClanRide` (which nothing but the admin used): `ClanNotice.ride` became
`ClanNotice.event`. Migration `clans.0004` drops `ClanRide`, so any ride made in the Django admin is lost.

| Field | Type | Notes |
|-------|------|-------|
| `clan` | FK to `ClanGroup` | `related_name='events'`, `CASCADE` |
| `created_by` | FK to `auth.User` | The admin who scheduled it (always the clan owner); `related_name='scheduled_events'`, `CASCADE` |
| `title`, `description` | text | `title` up to 150 characters |
| `scheduled_at` | `DateTimeField` | When it starts (UTC) |
| `route` | FK to `routes.Route` | Optional, `SET_NULL`; empty is free mode. Must be one of the admin's own routes |
| `status` | `EventStatus` | `scheduled` (default), `started`, `missed` |
| `started_at` | `DateTimeField` | Optional; when the command started it |
| `route_group` | one-to-one to `routes.RouteGroup` | Optional, `SET_NULL`; the group opened when it started |

Events are ordered latest first. `NotificationEvent` got an optional `scheduled_event` FK and the
`event_started` type ([notifications.md](notifications.md)).

### State

`status` is what happened to the event; `state`, what the app shows, is computed (`event_state`):

| `state` | When |
|---------|------|
| `upcoming` | `status` is `scheduled` (including one whose time passed but the command has not run yet) |
| `live` | `started` and its group saw activity within `RESUME_WINDOW` (2 h), see [Active group](route-groups.md#active-group) |
| `ended` | `started` with an inactive group, or `missed` |

## API

All endpoints need a JWT. A clan the caller does not belong to is `404`.

| Method and path | Who | Does |
|-----------------|-----|------|
| `GET /api/clans/<id>/events/` | member | the clan's events, latest first |
| `POST /api/clans/<id>/events/` | clan admin | schedules an event and posts its notice; any other member `403` |
| `GET /api/clans/events/next/` | any user | the soonest event of the caller's clans that is `upcoming` or `live`, for Home; `204` when there is none |
| `POST /api/clans/events/<id>/join/` | member of the event's clan | joins the group; answers the group like a read of it |

**Create** takes `title`, `description`, `scheduled_at` (must be in the future) and optionally `route_id`. Errors
come per field (`scheduled_at` missing or in the past, `route_id` not the caller's). In one transaction it creates
the event and a `ClanNotice` by the admin with the event's text and route (the notice's `event` carries the event).
The event starts when the [scheduler](#who-runs-it) finds its time has come.

**Read** (also nested as `event` in every notice):

```json
{
  "id": 4, "clan": 1, "clan_name": "Night Riders", "title": "Sunday ride", "description": "Coast road.",
  "scheduled_at": "2026-10-25T09:00:00Z",
  "route": {"id": "2dfd...", "name": "Coast", "distance": 12.4, "estimated_time": 2280},
  "status": "started", "state": "live", "route_group": "5b8f...", "is_joined": false,
  "created_at": "2026-10-24T20:00:00Z"
}
```

`route_group` is `null` until it starts; `is_joined` says whether the caller has accepted in that group.

**Join** is `400` (`This ride is not open: ...`) while the event is not `live`, and `400` (`This ride is full: ...`)
when the group has `MAX_GROUP_PARTICIPANTS` (10) riders, the admin included. Joining twice is harmless.

## Starting an event

`start_event` (inside a transaction): `create_group(clan.owner, event.route, [])` opens the group with the
**admin as leader and first rider**, the event goes to `started` with `started_at` and `route_group`, and one
`event_started` notification is sent to every member except the admin, who already leads the ride. The
notification is also heard live as a toast ("Sunday ride has started. Join the ride!").

`start_due_events(now)` starts every `scheduled` event with `scheduled_at <= now`, one transaction each, and
returns how many started. Each is claimed with `select_for_update(skip_locked=True)`, so two commands running
at once never start one event twice. An event found more than `START_GRACE` (2 h) after its time is marked
`missed` and nobody is told: announcing a ride that is over (the command was down) would be noise.

### Who runs it

`python manage.py start_scheduled_events` runs once; `--interval 30` keeps running and looks again every 30 s.
On Railway the **Scheduler** service ([railway.ts](../../.railway/railway.ts)) runs it with `--interval 30`.
A Railway cron job was not used because its minimum interval is 5 minutes, too coarse to start a ride on time.
Locally, `make run_scheduler`. Without it running, events stay `upcoming`.

## Joining

`join_group` puts a clan member in the group as an accepted rider without an invitation. It is idempotent for
a rider already in; a rider the leader had invited has their invitation closed as accepted; and it expires
the rider's other pending invitations, like accepting one ([route-groups.md](route-groups.md#answering-and-expiry)).
The group row is locked while it changes. The client then goes to `/ride/<group id>`, where the rider joins the
live channel like any other.

## Frontend

- **Events tab** of the clan (`ClanEventsPanel`): the admin sees **Schedule a ride** (`EventFormDialog`: title,
  message, date and time, optional route). Each event is a `ClanEventCard`,
  the style guide's *ride card* (date block, title, route, `EventDetails`).
- **`EventDetails`** shows when, a badge (Upcoming / Live / Ended) and, while `live`, **Join ride**
  (**Open ride** for a rider already in), which calls the join endpoint and goes to the ride. The same block is
  at the bottom of a `NoticeCard` that announces an event, so it shows in the clan's Notices tab. Home's "From your
  clans" feed leaves those notices out (`GET /api/clans/notices/` filters `event__isnull`): the event is in Next ride.
- **Home, Next ride**: `useNextClanEvent` loads `GET /api/clans/events/next/` and Home shows it as a `ClanEventCard` with the
  clan's name (the empty "No rides planned" state when there is none). A live ride comes first, since its time is the
  earliest, and has its **Join ride** button. It reloads when Home opens, when the app returns to the foreground and when a
  notification is heard, so a ride that starts while Home is open turns live; the admin, who is not notified of their own
  ride, sees it turn live on the next foreground or reload.
- **Home bell**: `useRideNotifications` (formerly `useRouteInvitations`) also lists `event_started`
  notifications; the badge counts them while the caller can still join. `StartedRideRow` has **Join ride**, then
  a **Joined** or **Ended** badge.

## Key decisions

- **The owner is the admin**: only they schedule events and they always lead the group; nobody else can lead it
  unless they hand it over inside the ride ([route-groups.md](route-groups.md#changing-the-leader)).
- **The group is created when the event starts, not when it is scheduled**, so the riders find a group that is
  still fresh (`RESUME_WINDOW` counts from its creation) and a cancelled plan leaves nothing behind.
- **One notice, one notification**: the notice is the permanent announcement (visible from creation); the
  notification is the "it is starting" nudge. They are separate rows.
- **Join, not invite**: a 20-member clan would need 19 invitations; the Join button needs none, and the limit of
  10 riders per group stays, so later members see "ride is full".
- **A rider removed by the leader can join again** while the ride is live; removing is not a ban.
- **Not yet**: editing or cancelling an event, recurring (weekly) events.
