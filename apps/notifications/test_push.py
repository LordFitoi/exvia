import json
from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.urls import reverse
from py_vapid import Vapid
from pywebpush import WebPushException
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APIClient

from apps.notifications import push
from apps.notifications.management.commands.generate_vapid_keys import generate_vapid_keys
from apps.notifications.models import EventType, NotificationEvent, PushSubscription
from apps.notifications.services import notify_route_invitation
from apps.routes.group_service import create_group
from apps.routes.models import Route

PUSH_ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc'
SUBSCRIPTION = {'endpoint': PUSH_ENDPOINT, 'keys': {'p256dh': 'public-key', 'auth': 'secret'}}
CONFIGURED = {'VAPID_PUBLIC_KEY': 'pub', 'VAPID_PRIVATE_KEY': 'priv', 'VAPID_CONTACT_EMAIL': 'ops@example.com'}


class PushTestCase(TestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user('owner', password='pw')
        self.ana = User.objects.create_user('ana', password='pw')
        self.ben = User.objects.create_user('ben', password='pw')

    def _client_for(self, user: User) -> APIClient:
        client = APIClient()
        client.force_authenticate(user)
        return client


class SubscriptionApiTests(PushTestCase):
    def _subscribe(self, user: User, payload: dict | None = None) -> Response:
        return self._client_for(user).post(reverse('notifications:push_subscription'), payload or SUBSCRIPTION, format='json')

    def test_registers_the_callers_browser(self) -> None:
        self.assertEqual(self._subscribe(self.ana).status_code, status.HTTP_204_NO_CONTENT)
        subscription = PushSubscription.objects.get()
        self.assertEqual((subscription.user, subscription.p256dh, subscription.auth), (self.ana, 'public-key', 'secret'))

    def test_the_same_browser_registered_by_another_user_moves_to_them(self) -> None:
        self._subscribe(self.ana)
        self._subscribe(self.ben)
        self.assertEqual(PushSubscription.objects.get().user, self.ben)

    def test_refuses_an_endpoint_that_is_not_a_known_push_service(self) -> None:
        for endpoint in ('http://fcm.googleapis.com/x', 'https://evil.example.com/x', 'https://evilgoogleapis.com/x'):
            response = self._subscribe(self.ana, {**SUBSCRIPTION, 'endpoint': endpoint})
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, endpoint)
        self.assertEqual(PushSubscription.objects.count(), 0)

    def test_removes_only_the_callers_own_subscription(self) -> None:
        self._subscribe(self.ana)
        url = reverse('notifications:push_subscription')
        self._client_for(self.ben).delete(url, {'endpoint': PUSH_ENDPOINT}, format='json')
        self.assertEqual(PushSubscription.objects.count(), 1)
        response = self._client_for(self.ana).delete(url, {'endpoint': PUSH_ENDPOINT}, format='json')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(PushSubscription.objects.count(), 0)

    def test_needs_a_token(self) -> None:
        response = APIClient().post(reverse('notifications:push_subscription'), SUBSCRIPTION, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(**CONFIGURED)
    def test_key_is_public_when_configured(self) -> None:
        response = self._client_for(self.ana).get(reverse('notifications:push_key'))
        self.assertEqual(response.data, {'public_key': 'pub'})

    @override_settings(VAPID_PUBLIC_KEY='', VAPID_PRIVATE_KEY='', VAPID_CONTACT_EMAIL='')
    def test_key_is_null_when_not_configured(self) -> None:
        response = self._client_for(self.ana).get(reverse('notifications:push_key'))
        self.assertEqual(response.data, {'public_key': None})


@override_settings(**CONFIGURED)
class DeliveryTests(PushTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.route = Route.objects.create(name='Loop', points=[[0, 0], [0, 1]], author=self.owner)
        self.subscription = PushSubscription.objects.create(user=self.ana, endpoint=PUSH_ENDPOINT, p256dh='k', auth='a')
        self.event = NotificationEvent.objects.create(
            event_type=EventType.ROUTE_INVITATION, author=self.owner,
            route_group=create_group(self.owner, self.route, []),
        )

    def _deliver(self, user_ids: list[int]) -> MagicMock:
        with patch('apps.notifications.push.webpush') as send, patch('apps.notifications.push.connection'):
            push.deliver(self.event.pk, user_ids)
        return send

    def test_sends_the_event_to_each_subscription_of_the_destinations(self) -> None:
        PushSubscription.objects.create(user=self.ben, endpoint='https://updates.push.services.mozilla.com/y', p256dh='k', auth='a')
        send = self._deliver([self.ana.pk])
        send.assert_called_once()
        sent = send.call_args.kwargs
        self.assertEqual(sent['subscription_info'], {'endpoint': PUSH_ENDPOINT, 'keys': {'p256dh': 'k', 'auth': 'a'}})
        self.assertEqual(sent['vapid_private_key'], 'priv')
        self.assertEqual(sent['vapid_claims'], {'sub': 'mailto:ops@example.com'})
        self.assertEqual(json.loads(sent['data'])['body'], 'owner invited you to ride Loop.')

    def test_free_mode_invitation_says_so(self) -> None:
        self.event.route_group = create_group(self.owner, None, [])
        self.assertEqual(push.build_payload(self.event)['body'], 'owner invited you to ride in free mode.')

    def test_a_subscription_the_push_service_no_longer_knows_is_deleted(self) -> None:
        gone = WebPushException('gone', response=MagicMock(status_code=410))
        with patch('apps.notifications.push.webpush', side_effect=gone), patch('apps.notifications.push.connection'):
            push.deliver(self.event.pk, [self.ana.pk])
        self.assertEqual(PushSubscription.objects.count(), 0)

    def test_another_failure_keeps_the_subscription(self) -> None:
        failed = WebPushException('busy', response=MagicMock(status_code=503))
        with patch('apps.notifications.push.webpush', side_effect=failed), patch('apps.notifications.push.connection'):
            push.deliver(self.event.pk, [self.ana.pk])
        self.assertEqual(PushSubscription.objects.count(), 1)


class SignalTests(PushTestCase):
    def _invite(self) -> MagicMock:
        group = create_group(self.owner, None, [])
        with patch('apps.notifications.signals.start_delivery') as start, self.captureOnCommitCallbacks(execute=True):
            notify_route_invitation(group, [self.ana, self.ben])
        return start

    def test_adding_destinations_starts_one_delivery_for_all_of_them_after_commit(self) -> None:
        start = self._invite()
        start.assert_called_once()
        event_id, user_ids = start.call_args.args
        self.assertEqual((event_id, set(user_ids)), (NotificationEvent.objects.get().pk, {self.ana.pk, self.ben.pk}))

    @override_settings(VAPID_PUBLIC_KEY='', VAPID_PRIVATE_KEY='', VAPID_CONTACT_EMAIL='')
    def test_nothing_is_sent_when_push_is_not_configured(self) -> None:
        with patch('apps.notifications.push.threading.Thread') as thread:
            push.start_delivery(1, [self.ana.pk])
        thread.assert_not_called()


class VapidKeyTests(TestCase):
    def test_generated_pair_is_accepted_by_the_push_library(self) -> None:
        public_key, private_key = generate_vapid_keys()
        vapid = Vapid.from_string(private_key)
        self.assertEqual(len(public_key), 87)
        self.assertIsNotNone(vapid.sign({'sub': 'mailto:ops@example.com', 'aud': 'https://fcm.googleapis.com'}))
