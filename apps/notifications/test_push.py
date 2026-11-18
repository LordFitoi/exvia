from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from requests import ConnectionError as RequestsConnectionError

from apps.notifications import push
from apps.notifications.models import DeviceToken
from apps.notifications.services import notify_route_invitation
from apps.routes.group_service import create_group

DEVICES_URL = reverse('notifications:device_token')
FIREBASE_KEY = '{"project_id": "exvia-test"}'
FCM_URL = 'https://fcm.example/send'


class DeviceTokenApiTests(TestCase):
    def setUp(self) -> None:
        self.ana = User.objects.create_user('ana', password='pw')
        self.ben = User.objects.create_user('ben', password='pw')

    def _client_for(self, user: User) -> APIClient:
        client = APIClient()
        client.force_authenticate(user)
        return client

    def test_registering_stores_the_token_for_the_caller(self) -> None:
        response = self._client_for(self.ana).post(DEVICES_URL, {'token': 'abc'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.ana.device_tokens.get().token, 'abc')

    def test_registering_twice_keeps_one_row(self) -> None:
        for _ in range(2):
            self._client_for(self.ana).post(DEVICES_URL, {'token': 'abc'}, format='json')
        self.assertEqual(DeviceToken.objects.count(), 1)

    def test_signing_in_as_someone_else_on_the_same_phone_moves_the_token(self) -> None:
        self._client_for(self.ana).post(DEVICES_URL, {'token': 'abc'}, format='json')
        self._client_for(self.ben).post(DEVICES_URL, {'token': 'abc'}, format='json')
        self.assertEqual(self.ana.device_tokens.count(), 0)
        self.assertEqual(self.ben.device_tokens.count(), 1)

    def test_a_token_is_required(self) -> None:
        response = self._client_for(self.ana).post(DEVICES_URL, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_signed_out_callers_are_refused(self) -> None:
        self.assertEqual(APIClient().post(DEVICES_URL, {'token': 'abc'}, format='json').status_code, status.HTTP_401_UNAUTHORIZED)

    def test_deleting_forgets_the_callers_token(self) -> None:
        DeviceToken.objects.create(user=self.ana, token='abc')
        response = self._client_for(self.ana).delete(DEVICES_URL, {'token': 'abc'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(DeviceToken.objects.count(), 0)

    def test_deleting_cannot_forget_another_users_token(self) -> None:
        DeviceToken.objects.create(user=self.ana, token='abc')
        self._client_for(self.ben).delete(DEVICES_URL, {'token': 'abc'}, format='json')
        self.assertEqual(DeviceToken.objects.count(), 1)


class SyncSender:
    """Stands in for the background worker so a test can see what was sent."""

    def submit(self, function: object, *args: object) -> None:
        with patch.object(push, 'connection'):
            function(*args)


@override_settings(FIREBASE_SERVICE_ACCOUNT_JSON=FIREBASE_KEY)
class PushDeliveryTests(TestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user('owner', password='pw')
        self.ana = User.objects.create_user('ana', password='pw')
        self.ben = User.objects.create_user('ben', password='pw')
        DeviceToken.objects.create(user=self.ana, token='ana-phone')
        DeviceToken.objects.create(user=self.ana, token='ana-tablet')
        DeviceToken.objects.create(user=self.ben, token='ben-phone')
        self.session = MagicMock()
        self.session.post.return_value.status_code = status.HTTP_200_OK
        patches = [
            patch.object(push, '_sender', SyncSender()),
            patch.object(push, '_fcm_session', return_value=(self.session, FCM_URL)),
        ]
        for started in patches:
            started.start()
            self.addCleanup(started.stop)

    def _invite_ana(self) -> None:
        group = create_group(self.owner, None, [])
        with self.captureOnCommitCallbacks(execute=True):
            notify_route_invitation(group, [self.ana])

    def _sent_tokens(self) -> list[str]:
        return sorted(call.kwargs['json']['message']['token'] for call in self.session.post.call_args_list)

    def test_a_new_notification_is_pushed_to_every_phone_of_its_destinations_only(self) -> None:
        self._invite_ana()
        self.assertEqual(self._sent_tokens(), ['ana-phone', 'ana-tablet'])

    def test_the_push_carries_the_text_and_the_notification_id(self) -> None:
        self._invite_ana()
        message = self.session.post.call_args.kwargs['json']['message']
        self.assertEqual(message['notification'], {'title': 'Ride invitation', 'body': 'owner invited you to ride in free mode.'})
        self.assertEqual(message['data'], {'notification_id': str(self.ana.notification_events.get().pk)})
        self.assertEqual(message['android']['notification']['channel_id'], push.ANDROID_CHANNEL_ID)

    def test_a_token_firebase_no_longer_knows_is_forgotten(self) -> None:
        self.session.post.return_value.status_code = push.HTTP_NOT_FOUND
        self._invite_ana()
        self.assertEqual(DeviceToken.objects.filter(user=self.ana).count(), 0)
        self.assertEqual(DeviceToken.objects.filter(user=self.ben).count(), 1)

    def test_a_refused_push_keeps_the_token(self) -> None:
        self.session.post.return_value.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        self.session.post.return_value.ok = False
        self._invite_ana()
        self.assertEqual(DeviceToken.objects.filter(user=self.ana).count(), 2)

    def test_an_unreachable_firebase_does_not_break_the_invitation(self) -> None:
        self.session.post.side_effect = RequestsConnectionError('offline')
        self._invite_ana()
        self.assertEqual(DeviceToken.objects.filter(user=self.ana).count(), 2)

    def test_nothing_is_sent_without_a_firebase_key(self) -> None:
        with override_settings(FIREBASE_SERVICE_ACCOUNT_JSON=''):
            self._invite_ana()
        self.session.post.assert_not_called()


class FirebaseKeyTests(TestCase):
    def setUp(self) -> None:
        push._fcm_session.cache_clear()
        self.addCleanup(push._fcm_session.cache_clear)

    @override_settings(FIREBASE_SERVICE_ACCOUNT_JSON='not json')
    def test_a_broken_key_disables_pushes_instead_of_failing(self) -> None:
        self.assertIsNone(push._fcm_session())
