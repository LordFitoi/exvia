from collections.abc import Iterable

from django.contrib.auth.models import User

from apps.notifications.models import EventType, NotificationEvent
from apps.routes.models import RouteGroup


def notify_route_invitation(group: RouteGroup, invitees: Iterable[User]) -> NotificationEvent:
    """One event, from the group's author, for all the invitees at once."""
    event = NotificationEvent.objects.create(
        event_type=EventType.ROUTE_INVITATION, author=group.author, route_group=group,
    )
    event.destinations.set(invitees)
    return event
