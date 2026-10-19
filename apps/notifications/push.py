"""Web Push: sends a notification event to the phones of its destinations, in a thread so the request
that created the event does not wait for the push services."""
import json
import logging
import threading
from typing import Any

import requests
from django.conf import settings
from django.db import connection
from pywebpush import WebPushException, webpush

from apps.notifications.models import EventType, NotificationEvent, PushSubscription

logger = logging.getLogger(__name__)

PUSH_TIMEOUT_SECONDS = 10
PUSH_TTL_SECONDS = 24 * 60 * 60
GONE_STATUS_CODES = (404, 410)
APP_TITLE = 'Exvia'
APP_URL = '/'
FREE_MODE_LABEL = 'in free mode'


def is_push_configured() -> bool:
    return bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY and settings.VAPID_CONTACT_EMAIL)


def build_payload(event: NotificationEvent) -> dict[str, str]:
    """What the phone shows: a title, a line of text and the page a tap opens. `tag` makes a repeated
    delivery of the same event replace its notification instead of stacking."""
    author = event.author.username if event.author else APP_TITLE
    title, body = APP_TITLE, 'You have a new notification.'
    if event.event_type == EventType.ROUTE_INVITATION:
        route = event.route_group.route if event.route_group else None
        title, body = 'Ride invitation', f'{author} invited you to ride {route.name if route else FREE_MODE_LABEL}.'
    elif event.event_type == EventType.CLAN_INVITATION:
        title, body = 'Clan invitation', f'{author} invited you to join a clan.'
    return {'title': title, 'body': body, 'url': APP_URL, 'tag': f'event-{event.pk}'}


def start_delivery(event_id: int, user_ids: list[int]) -> None:
    """Delivers in the background; does nothing when push is not configured."""
    if is_push_configured():
        threading.Thread(target=deliver, args=(event_id, user_ids), daemon=True).start()


def deliver(event_id: int, user_ids: list[int]) -> None:
    """Pushes the event to every subscription of the users. Runs in its own thread, so it closes its
    database connection at the end."""
    try:
        event = NotificationEvent.objects.select_related('author', 'route_group__route').get(pk=event_id)
        payload = json.dumps(build_payload(event))
        for subscription in PushSubscription.objects.filter(user_id__in=user_ids):
            _send(subscription, payload)
    finally:
        connection.close()


def _send(subscription: PushSubscription, payload: str) -> None:
    info: dict[str, Any] = {
        'endpoint': subscription.endpoint, 'keys': {'p256dh': subscription.p256dh, 'auth': subscription.auth},
    }
    try:
        webpush(
            subscription_info=info,
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={'sub': f'mailto:{settings.VAPID_CONTACT_EMAIL}'},
            timeout=PUSH_TIMEOUT_SECONDS,
            ttl=PUSH_TTL_SECONDS,
        )
    except WebPushException as error:
        if error.response is not None and error.response.status_code in GONE_STATUS_CODES:
            subscription.delete()
            return
        logger.warning('Push to subscription %s failed: %s', subscription.pk, error)
    except requests.RequestException as error:
        logger.warning('Push to subscription %s could not be sent: %s', subscription.pk, error)
