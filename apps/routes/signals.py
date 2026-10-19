from typing import Any

from django.core.exceptions import ValidationError
from django.db.models.signals import m2m_changed
from django.dispatch import receiver

from apps.routes.models import MAX_GROUP_PARTICIPANTS, RouteGroup


@receiver(m2m_changed, sender=RouteGroup.participants.through)
def limit_group_participants(
    sender: type, instance: Any, action: str, reverse: bool, pk_set: set[int], **kwargs: Any
) -> None:
    """Refuse an add that would take a group over MAX_GROUP_PARTICIPANTS riders."""
    if action != 'pre_add':
        return
    groups = RouteGroup.objects.filter(pk__in=pk_set) if reverse else [instance]
    joining_ids = {instance.pk} if reverse else pk_set
    for group in groups:
        total = group.participants.exclude(pk__in=joining_ids).count() + len(joining_ids)
        if total > MAX_GROUP_PARTICIPANTS:
            raise ValidationError(
                f'Group {group.pk} would have {total} participants; the limit is {MAX_GROUP_PARTICIPANTS}.'
            )
