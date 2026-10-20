from datetime import datetime, timedelta
from typing import Any

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import QuerySet

from apps.notifications.services import notify_route_invitation, record_invitation_answer
from apps.routes import group_meta
from apps.routes.group_meta import ParticipantStatus
from apps.routes.models import MAX_GROUP_PARTICIPANTS, Route, RouteGroup

# A group with no activity for this long has ended and is no longer offered back to its riders.
RESUME_WINDOW = timedelta(hours=2)


class InvitationAlreadyAnswered(ValueError):
    """The user has already accepted or rejected the invitation, or was never invited."""


class NotRidingInGroup(ValueError):
    """The user has not accepted the group, so there is nothing to leave."""


class AlreadyInGroup(ValueError):
    """The user is already invited to the group, or already riding in it."""


class GroupFull(ValueError):
    """The group has `MAX_GROUP_PARTICIPANTS` riders already."""


class NotInGroup(ValueError):
    """The user is not a participant of the group, so there is nothing to remove."""


class CannotRemoveLeader(ValueError):
    """The leader of a group cannot be removed from it."""


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
    record_invitation_answer(group, user, answer)
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


def invite_rider(group: RouteGroup, invitee: User) -> None:
    """Invites a user to a group that is already rolling and notifies them. A rider who rejected can be
    invited again. Call it inside a transaction that holds a lock on `group`."""
    if group_meta.get_status(group.meta_json, invitee.pk) in (ParticipantStatus.INVITED, ParticipantStatus.ACCEPTED):
        raise AlreadyInGroup(f'User {invitee.pk} is already in group {group.pk}.')
    if group.participants.count() >= MAX_GROUP_PARTICIPANTS:
        raise GroupFull(f'Group {group.pk} already has {MAX_GROUP_PARTICIPANTS} riders.')
    group_meta.set_status(group.meta_json, invitee.pk, ParticipantStatus.INVITED)
    group.save(update_fields=['meta_json', 'updated_at'])
    group.participants.add(invitee)
    notify_route_invitation(group, [invitee])


def remove_rider(group: RouteGroup, rider: User) -> None:
    """Takes a rider, invited or accepted, out of the group, which frees their place. Their live channel
    is closed at their next position, since they no longer have a place.
    Call it inside a transaction that holds a lock on `group`."""
    if rider.pk == group.author_id:
        raise CannotRemoveLeader(f'User {rider.pk} leads group {group.pk}.')
    if not group.participants.filter(pk=rider.pk).exists():
        raise NotInGroup(f'User {rider.pk} is not in group {group.pk}.')
    group_meta.remove_participant(group.meta_json, rider.pk)
    group.save(update_fields=['meta_json', 'updated_at'])
    group.participants.remove(rider)


def change_route(group: RouteGroup, route: Route | None) -> None:
    """Sets the route the group rides, or free mode when it is None. Every rider follows it: they
    read the group again when told. Call it inside a transaction that holds a lock on `group`."""
    group.route = route
    group.save(update_fields=['route', 'updated_at'])


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
    """The newest group the user has accepted and not left, with activity within `RESUME_WINDOW`, or None.
    A rider who minimizes or closes the app stops reporting without leaving, and must be able to come back,
    alone or not; leaving, quitting or finishing removes them from the group. `updated_at` moves with every
    saved position, invitation and answer, so it is the group's last activity."""
    since = now - RESUME_WINDOW
    for group in groups.filter(participants=user, updated_at__gte=since).order_by('-created_at'):
        if group_meta.get_status(group.meta_json, user.pk) == ParticipantStatus.ACCEPTED:
            return group
    return None
