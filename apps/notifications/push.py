"""Sends a notification event as a push to the phones of its destinations, through Firebase Cloud Messaging."""
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache

from django.conf import settings
from django.db import connection
from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account
from requests import RequestException

from apps.notifications.live import build_notification, load_event
from apps.notifications.models import DeviceToken

logger = logging.getLogger(__name__)

FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
FCM_SEND_URL = 'https://fcm.googleapis.com/v1/projects/{project_id}/messages:send'
FCM_TIMEOUT_SECONDS = 10
HTTP_NOT_FOUND = 404
# The Android notification channel the app creates (pushNotifications.ts) and AndroidManifest.xml names as default.
ANDROID_CHANNEL_ID = 'exvia-notifications'

# One worker: the sends go one after another, so the shared session is never used from two threads, and the
# request (or the scheduler loop) that created the event does not wait for Firebase.
_sender = ThreadPoolExecutor(max_workers=1, thread_name_prefix='push')


@lru_cache(maxsize=1)
def _fcm_session() -> tuple[AuthorizedSession, str] | None:
    """A session that signs its requests as the service account, with the URL to send to; None when no key is set."""
    if not settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        return None
    try:
        key = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
        credentials = service_account.Credentials.from_service_account_info(key, scopes=[FCM_SCOPE])
    except (ValueError, KeyError) as error:
        logger.error('FIREBASE_SERVICE_ACCOUNT_JSON is not a valid service account key: %s', error)
        return None
    return AuthorizedSession(credentials), FCM_SEND_URL.format(project_id=key['project_id'])


def _build_message(token: str, notification: dict[str, object]) -> dict[str, object]:
    return {
        'message': {
            'token': token,
            'notification': {'title': notification['title'], 'body': notification['body']},
            'data': {'notification_id': str(notification['id'])},
            'android': {'priority': 'HIGH', 'notification': {'channel_id': ANDROID_CHANNEL_ID}},
        },
    }


def _is_token_stale(session: AuthorizedSession, url: str, token: str, notification: dict[str, object]) -> bool:
    """Sends the push to one phone. True when Firebase no longer knows the token (the app was uninstalled or
    its data cleared), so it can be forgotten; any other failure is logged and the token is kept."""
    try:
        response = session.post(url, json=_build_message(token, notification), timeout=FCM_TIMEOUT_SECONDS)
    except (RequestException, GoogleAuthError) as error:
        logger.warning('Push %s could not be sent: %s', notification['id'], error)
        return False
    if response.status_code == HTTP_NOT_FOUND:
        return True
    if not response.ok:
        logger.warning('Push %s was refused (%s): %s', notification['id'], response.status_code, response.text)
    return False


def deliver_push(tokens: list[str], notification: dict[str, object]) -> None:
    """Sends the notification to every token and deletes the ones Firebase reports as gone."""
    client = _fcm_session()
    if client is None:
        return
    session, url = client
    stale_tokens = [token for token in tokens if _is_token_stale(session, url, token, notification)]
    if stale_tokens:
        DeviceToken.objects.filter(token__in=stale_tokens).delete()


def _deliver_in_background(tokens: list[str], notification: dict[str, object]) -> None:
    try:
        deliver_push(tokens, notification)
    finally:
        connection.close()


def push_event(event_id: int, user_ids: list[int]) -> None:
    """Best effort: queues a push to every phone of the users; one with no registered phone gets none and finds
    the event in the list instead. Does nothing while no Firebase key is configured."""
    if not settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        return
    tokens = list(DeviceToken.objects.filter(user_id__in=user_ids).values_list('token', flat=True))
    if tokens:
        notification = build_notification(load_event(event_id))
        _sender.submit(_deliver_in_background, tokens, notification)
