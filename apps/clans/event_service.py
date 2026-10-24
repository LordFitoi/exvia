"""The rules of scheduled events, with no HTTP: scheduling one, starting the ones that are due, joining one."""
from datetime import datetime
from typing import Any

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q, TextChoices

from apps.clans.models import ClanGroup, ClanNotice, EventStatus, ScheduledEvent
from apps.notifications.services import notify_event_started
from apps.routes.group_service import RESUME_WINDOW, create_group, is_group_active, join_group
from apps.routes.models import RouteGroup

# An event the cron command only finds this long after its time is missed: starting it would announce a ride
# that is long over (the command was not running).
START_GRACE = RESUME_WINDOW


class EventState(TextChoices):
    UPCOMING = 'upcoming', 'Upcoming'
    LIVE = 'live', 'Live'
    ENDED = 'ended', 'Ended'


class EventNotOpen(ValueError):
    """The event has not started, or its group has ended, so nobody can join it."""


def event_state(event: ScheduledEvent, now: datetime) -> EventState:
    """Upcoming until it starts; live while its group is active (see `is_group_active`); ended after that."""
    if event.status == EventStatus.SCHEDULED:
        return EventState.UPCOMING
    if event.route_group is not None and is_group_active(event.route_group, now):
        return EventState.LIVE
    return EventState.ENDED


def find_next_event(user: User, now: datetime) -> ScheduledEvent | None:
    """The soonest event of the user's clans that is still to come or live: not started yet, or started with
    its group still active. A live ride has the earliest time, so it comes first."""
    is_live = Q(status=EventStatus.STARTED, route_group__updated_at__gte=now - RESUME_WINDOW)
    events = ScheduledEvent.objects.filter(clan__users=user).filter(Q(status=EventStatus.SCHEDULED) | is_live)
    return events.select_related('clan', 'route', 'route_group').order_by('scheduled_at', 'id').first()


@transaction.atomic
def create_event(clan: ClanGroup, fields: dict[str, Any]) -> ScheduledEvent:
    """Schedules an event for the clan, led by its admin, and announces it with a notice. It starts when
    `start_due_events` finds its time has come."""
    event = ScheduledEvent.objects.create(clan=clan, created_by=clan.owner, **fields)
    ClanNotice.objects.create(
        clan=clan, author=clan.owner, title=event.title, description=event.description, route=event.route,
        event=event,
    )
    return event


def start_event(event: ScheduledEvent, now: datetime) -> None:
    """Opens a route group led by the clan admin, on the event's route, and notifies the other members.
    Call it inside a transaction that holds a lock on `event`."""
    clan = event.clan
    event.route_group = create_group(clan.owner, event.route, [])
    event.status = EventStatus.STARTED
    event.started_at = now
    event.save(update_fields=['route_group', 'status', 'started_at', 'updated_at'])
    notify_event_started(event, clan.users.exclude(pk=clan.owner_id))


def start_due_events(now: datetime) -> int:
    """Starts every scheduled event whose time has come and marks as missed the ones that are over; returns how
    many started. Each event has its own transaction and is claimed with a lock that other runs skip, so
    two commands running at once never start the same event twice."""
    due_ids = list(
        ScheduledEvent.objects.filter(status=EventStatus.SCHEDULED, scheduled_at__lte=now).values_list('pk', flat=True),
    )
    started = 0
    for event_id in due_ids:
        with transaction.atomic():
            claimed = ScheduledEvent.objects.select_for_update(skip_locked=True, of=('self',))
            event = claimed.select_related('clan__owner', 'route').filter(
                pk=event_id, status=EventStatus.SCHEDULED,
            ).first()
            if event is None:
                continue
            if now - event.scheduled_at > START_GRACE:
                event.status = EventStatus.MISSED
                event.save(update_fields=['status', 'updated_at'])
                continue
            start_event(event, now)
            started += 1
    return started


@transaction.atomic
def join_event(event: ScheduledEvent, user: User, now: datetime) -> RouteGroup:
    """Puts a clan member in the group of a started event, whose group is still active; the group is locked
    while it changes. Joining twice is harmless."""
    if event.route_group_id is None:
        raise EventNotOpen(f'Event {event.pk} has not started.')
    group = RouteGroup.objects.select_for_update().get(pk=event.route_group_id)
    if not is_group_active(group, now):
        raise EventNotOpen(f'The group of event {event.pk} has ended.')
    join_group(group, user)
    return group
