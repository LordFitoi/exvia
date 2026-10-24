"""Sends a notification event to the users who have the app open, through their websocket."""
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from redis.exceptions import RedisError

from apps.notifications.consumers import user_channel_group
from apps.notifications.models import EventType, NotificationEvent

logger = logging.getLogger(__name__)

APP_TITLE = 'Exvia'
FREE_MODE_LABEL = 'in free mode'


def build_notification(event: NotificationEvent) -> dict[str, object]:
    """What the app shows when the event arrives: its id, a title and a line of text."""
    author = event.author.username if event.author else APP_TITLE
    title, body = APP_TITLE, 'You have a new notification.'
    if event.event_type == EventType.ROUTE_INVITATION:
        route = event.route_group.route if event.route_group else None
        title, body = 'Ride invitation', f'{author} invited you to ride {route.name if route else FREE_MODE_LABEL}.'
    elif event.event_type == EventType.CLAN_INVITATION:
        title, body = 'Clan invitation', f'{author} invited you to join a clan.'
    return {'id': event.pk, 'title': title, 'body': body}


def broadcast_event(event_id: int, user_ids: list[int]) -> None:
    """Best effort: a user with no open app hears nothing here, and finds the event in the list instead."""
    event = NotificationEvent.objects.select_related('author', 'route_group__route').get(pk=event_id)
    notification = build_notification(event)
    channel_layer = get_channel_layer()
    try:
        for user_id in user_ids:
            async_to_sync(channel_layer.group_send)(
                user_channel_group(user_id), {'type': 'notification.created', 'notification': notification},
            )
    except (OSError, RedisError) as error:
        logger.warning('Live notification %s could not be sent: %s', event_id, error)
