from unittest.mock import AsyncMock, patch

from channels.db import database_sync_to_async
from channels.routing import URLRouter
from django.contrib.auth.models import User
from django.test import TransactionTestCase, override_settings
from rest_framework_simplejwt.tokens import AccessToken

from apps.core.websocket_auth import CLOSE_UNAUTHORIZED
from apps.core.websocket_testing import WebsocketClient
from apps.notifications.routing import websocket_urlpatterns
from apps.routes.group_service import create_group
from apps.routes.models import Route

IN_MEMORY_CHANNELS = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}
APPLICATION = URLRouter(websocket_urlpatterns)
SILENCE_SECONDS = 0.2
EQUATOR_STRAIGHT_LINE = [[0, 0], [0, 1]]


async def open_channel(user: User | None) -> WebsocketClient:
    """Opens the channel; signs in as the user unless it is None."""
    client = WebsocketClient(APPLICATION, '/ws/notifications/')
    assert await client.connect()
    if user is not None:
        await client.send_json({'type': 'auth', 'token': str(AccessToken.for_user(user))})
        assert await client.receive_json() == {'type': 'ready'}
    return client


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNELS)
class NotificationConsumerTests(TransactionTestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user('owner', password='pw')
        self.ana = User.objects.create_user('ana', password='pw')
        self.ben = User.objects.create_user('ben', password='pw')
        self.route = Route.objects.create(name='Loop', points=EQUATOR_STRAIGHT_LINE, author=self.owner)

    @database_sync_to_async
    def _invite(self, *invitees: User) -> int:
        create_group(self.owner, self.route, list(invitees))
        return invitees[0].notification_events.get().pk

    async def test_a_signed_in_user_hears_their_new_invitation(self) -> None:
        client = await open_channel(self.ana)
        event_id = await self._invite(self.ana)
        self.assertEqual(
            await client.receive_json(),
            {'type': 'notification', 'id': event_id, 'title': 'Ride invitation', 'body': 'owner invited you to ride Loop.'},
        )

    async def test_only_the_invited_users_hear_it(self) -> None:
        ana, ben, owner = await open_channel(self.ana), await open_channel(self.ben), await open_channel(self.owner)
        await self._invite(self.ana)
        self.assertEqual((await ana.receive_json())['type'], 'notification')
        self.assertTrue(await ben.receive_nothing(SILENCE_SECONDS))
        self.assertTrue(await owner.receive_nothing(SILENCE_SECONDS))

    async def test_every_open_app_of_the_user_hears_it(self) -> None:
        phone, laptop = await open_channel(self.ana), await open_channel(self.ana)
        await self._invite(self.ana)
        self.assertEqual((await phone.receive_json())['type'], 'notification')
        self.assertEqual((await laptop.receive_json())['type'], 'notification')

    async def test_a_bad_token_is_closed_as_unauthorized(self) -> None:
        client = await open_channel(None)
        await client.send_json({'type': 'auth', 'token': 'not-a-token'})
        self.assertEqual(await client.receive_close_code(), CLOSE_UNAUTHORIZED)

    async def test_a_client_that_never_signs_in_is_closed(self) -> None:
        with patch('apps.notifications.consumers.AUTH_TIMEOUT_SECONDS', 0.05):
            client = await open_channel(None)
            self.assertEqual(await client.receive_close_code(), CLOSE_UNAUTHORIZED)

    async def test_an_unreachable_channel_layer_does_not_break_the_invitation(self) -> None:
        with patch('apps.notifications.live.get_channel_layer') as get_layer:
            get_layer.return_value.group_send = AsyncMock(side_effect=OSError('redis is down'))
            event_id = await self._invite(self.ana)
        self.assertIsNotNone(event_id)
