from typing import Any

from django.db import transaction
from django.db.models.signals import m2m_changed
from django.dispatch import receiver

from apps.notifications.models import NotificationEvent
from apps.notifications.live import broadcast_event
from apps.notifications.push import start_delivery


@receiver(m2m_changed, sender=NotificationEvent.destinations.through)
def push_event_to_destinations(
    sender: type, instance: NotificationEvent, action: str, reverse: bool, pk_set: set[int] | None, **kwargs: Any,
) -> None:
    """Every user added to an event's destinations hears it live if the app is open and gets a push, once the transaction that did it commits.
    Only `event.destinations.add/set` is covered, which is how `services.py` creates events."""
    if action != 'post_add' or reverse or not pk_set:
        return
    user_ids = list(pk_set)
    transaction.on_commit(lambda: broadcast_event(instance.pk, user_ids))
    transaction.on_commit(lambda: start_delivery(instance.pk, user_ids))
