from collections.abc import Iterable
from datetime import datetime, timedelta

from django.contrib.auth.models import User

from apps.notifications.models import EventType, InvitationAnswer, NotificationEvent
from apps.routes.models import RouteGroup

# An invitation can be answered for this long after it was sent; later it is expired.
INVITATION_VALIDITY = timedelta(hours=1)


def notify_route_invitation(group: RouteGroup, invitees: Iterable[User]) -> NotificationEvent:
    """One event, from the group's author, for all the invitees at once."""
    event = NotificationEvent.objects.create(
        event_type=EventType.ROUTE_INVITATION, author=group.author, route_group=group,
    )
    event.destinations.set(invitees)
    return event


def latest_invitation(group: RouteGroup, user: User) -> NotificationEvent | None:
    """The user's newest invitation to the group, the only one of its events that can be answered."""
    return (
        NotificationEvent.objects.filter(
            event_type=EventType.ROUTE_INVITATION, route_group=group, destinations=user,
        )
        .order_by('-id')
        .first()
    )


def is_invitation_expired(event: NotificationEvent, now: datetime) -> bool:
    """Whether the invitation was sent `INVITATION_VALIDITY` ago or longer."""
    return now - event.created_at >= INVITATION_VALIDITY


def record_invitation_answer(group: RouteGroup, user: User, answer: str) -> None:
    """Closes the user's newest invitation to the group with their answer (an `AnswerStatus`). Older
    invitations to the same group are left as they are: a user is invited again only after answering or
    leaving the last one."""
    event = latest_invitation(group, user)
    if event is not None:
        InvitationAnswer.objects.create(event=event, user=user, status=answer)
