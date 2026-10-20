from collections.abc import Iterable

from django.contrib.auth.models import User

from apps.notifications.models import EventType, InvitationAnswer, NotificationEvent
from apps.routes.group_meta import ParticipantStatus
from apps.routes.models import RouteGroup


def notify_route_invitation(group: RouteGroup, invitees: Iterable[User]) -> NotificationEvent:
    """One event, from the group's author, for all the invitees at once."""
    event = NotificationEvent.objects.create(
        event_type=EventType.ROUTE_INVITATION, author=group.author, route_group=group,
    )
    event.destinations.set(invitees)
    return event


def record_invitation_answer(group: RouteGroup, user: User, answer: ParticipantStatus) -> None:
    """Closes the user's newest invitation to the group with their answer. Older invitations to the same
    group are left as they are: a user is invited again only after answering or leaving the last one."""
    event = (
        NotificationEvent.objects.filter(
            event_type=EventType.ROUTE_INVITATION, route_group=group, destinations=user,
        )
        .order_by('-id')
        .first()
    )
    if event is not None:
        InvitationAnswer.objects.create(event=event, user=user, status=answer)
