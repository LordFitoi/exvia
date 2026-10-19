from datetime import datetime, timedelta
from typing import Any

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import QuerySet

from apps.notifications.services import notify_route_invitation
from apps.routes import group_meta
from apps.routes.group_meta import ParticipantStatus
from apps.routes.models import Route, RouteGroup

# A rider who reports nothing for this long is gone; the client hides such a rider after the same time.
CONNECTED_WINDOW = timedelta(seconds=30)


class InvitationAlreadyAnswered(ValueError):
    """The user has already accepted or rejected the invitation, or was never invited."""


class NotRidingInGroup(ValueError):
    """The user has not accepted the group, so there is nothing to leave."""


@transaction.atomic
def create_group(author: User, route: Route | None, invitees: list[User]) -> RouteGroup:
    """A group led by `author` (already in, accepted) with the invitees waiting for their answer.
    The invitees are notified at once, with one event for all of them."""
    group = RouteGroup(author=author, route=route)
    group_meta.set_status(group.meta_json, author.pk, ParticipantStatus.ACCEPTED)
    for invitee in invitees:
        group_meta.set_status(group.meta_json, invitee.pk, ParticipantStatus.INVITED)
    group.save()
    group.participants.add(author, *invitees)
    if invitees:
        notify_route_invitation(group, invitees)
    return group


def answer_invitation(group: RouteGroup, user: User, answer: ParticipantStatus) -> None:
    """Records the user's answer. Rejecting also frees their place in the group.
    Call it inside a transaction that holds a lock on `group`."""
    if group_meta.get_status(group.meta_json, user.pk) != ParticipantStatus.INVITED:
        raise InvitationAlreadyAnswered(f'User {user.pk} has no pending invitation to group {group.pk}.')
    group_meta.set_status(group.meta_json, user.pk, answer)
    group.save(update_fields=['meta_json', 'updated_at'])
    if answer == ParticipantStatus.REJECTED:
        group.participants.remove(user)


def leave_group(group: RouteGroup, user: User) -> None:
    """Takes a rider who accepted out of the group, which frees their place and ends their ride in it.
    Call it inside a transaction that holds a lock on `group`."""
    if group_meta.get_status(group.meta_json, user.pk) != ParticipantStatus.ACCEPTED:
        raise NotRidingInGroup(f'User {user.pk} is not riding in group {group.pk}.')
    group_meta.remove_participant(group.meta_json, user.pk)
    group.save(update_fields=['meta_json', 'updated_at'])
    group.participants.remove(user)


def load_positions(group_id: object, user_id: int) -> dict[str, dict[str, Any]] | None:
    """The latest position of every rider of the group, or None when the user may not ride in it
    (no such group, or they have not accepted)."""
    group = RouteGroup.objects.filter(pk=group_id).first()
    if group is None or group_meta.get_status(group.meta_json, user_id) != ParticipantStatus.ACCEPTED:
        return None
    return group_meta.get_positions(group.meta_json)


def save_position(group_id: object, user_id: int, position: dict[str, Any]) -> bool:
    """Replaces the user's latest position in the group; False when they may not ride in it.
    The group row is locked, so riders reporting at the same moment do not overwrite each other."""
    with transaction.atomic():
        group = RouteGroup.objects.select_for_update().filter(pk=group_id).first()
        if group is None or group_meta.get_status(group.meta_json, user_id) != ParticipantStatus.ACCEPTED:
            return False
        group_meta.set_position(group.meta_json, user_id, position)
        group.save(update_fields=['meta_json', 'updated_at'])
    return True


def find_active_group(groups: QuerySet[RouteGroup], user: User, now: datetime) -> RouteGroup | None:
    """The newest group the user has accepted in which another rider is still connected, or None.
    A group nobody is connected to has ended, so a solo ride is never active for its own rider.
    `updated_at` moves with every saved position, which narrows the candidates in the database."""
    since = now - CONNECTED_WINDOW
    for group in groups.filter(participants=user, updated_at__gte=since).order_by('-created_at'):
        is_accepted = group_meta.get_status(group.meta_json, user.pk) == ParticipantStatus.ACCEPTED
        if is_accepted and group_meta.has_connected_rider(group.meta_json, user.pk, since):
            return group
    return None
