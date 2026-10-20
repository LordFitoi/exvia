"""Sends a notification event to the users who have the app open, through their websocket."""
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from redis.exceptions import RedisError

from apps.notifications.consumers import user_channel_group
from apps.notifications.models import NotificationEvent
from apps.notifications.push import build_payload

logger = logging.getLogger(__name__)


def broadcast_event(event_id: int, user_ids: list[int]) -> None:
    """Best effort: a user with no open app hears nothing here, and gets the push and the list instead."""
    event = NotificationEvent.objects.select_related('author', 'route_group__route').get(pk=event_id)
    payload = build_payload(event)
    notification = {'id': event.pk, 'title': payload['title'], 'body': payload['body']}
    channel_layer = get_channel_layer()
    try:
        for user_id in user_ids:
            async_to_sync(channel_layer.group_send)(
                user_channel_group(user_id), {'type': 'notification.created', 'notification': notification},
            )
    except (OSError, RedisError) as error:
        logger.warning('Live notification %s could not be sent: %s', event_id, error)
