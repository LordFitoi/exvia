from datetime import datetime, timedelta
from unittest.mock import patch

from channels.db import database_sync_to_async
from channels.routing import URLRouter
from django.contrib.auth.models import User
from django.test import TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

from apps.core.websocket_testing import WebsocketClient
from apps.routes import group_meta
from apps.routes.consumers import CLOSE_FORBIDDEN, CLOSE_UNAUTHORIZED
from apps.routes.group_meta import ParticipantStatus
from apps.routes.group_service import create_group
from apps.routes.models import RouteGroup
from apps.routes.routing import websocket_urlpatterns

IN_MEMORY_CHANNELS = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}
APPLICATION = URLRouter(websocket_urlpatterns)
POSITION = {'type': 'position', 'lng': -3.7, 'lat': 40.4, 'heading': 90, 'speed': 25.5}
SILENCE_SECONDS = 0.2


async def open_channel(group_id: object) -> WebsocketClient:
    client = WebsocketClient(APPLICATION, f'/ws/routes/groups/{group_id}/')
    assert await client.connect()
    return client


async def sign_in(client: WebsocketClient, user: User) -> None:
    await client.send_json({'type': 'auth', 'token': str(AccessToken.for_user(user))})


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNELS)
class RouteGroupConsumerTests(TransactionTestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user('owner', password='pw')
        self.ana = User.objects.create_user('ana', password='pw')
        self.ben = User.objects.create_user('ben', password='pw')
        self.group = create_group(self.owner, None, [self.ana, self.ben])
        self._answer(self.ana, ParticipantStatus.ACCEPTED)

    def _answer(self, user: User, answer: ParticipantStatus) -> None:
        group = RouteGroup.objects.get(pk=self.group.pk)
        group_meta.set_status(group.meta_json, user.pk, answer)
        group.save(update_fields=['meta_json'])

    async def _ride(self, user: User, *listeners: WebsocketClient) -> WebsocketClient:
        """Signs the user in; the listeners (riders already in) hear them join, and that is consumed here."""
        client = await open_channel(self.group.pk)
        await sign_in(client, user)
        ready = await client.receive_json()
        self.assertEqual(ready['type'], 'ready')
        for listener in listeners:
            self.assertEqual(await listener.receive_json(), {'type': 'presence', 'user_id': user.pk, 'status': 'joined'})
        return client

    async def test_an_accepted_rider_gets_ready_with_their_id_the_time_and_no_positions(self) -> None:
        client = await open_channel(self.group.pk)
        await sign_in(client, self.ana)
        ready = await client.receive_json()
        server_time = ready.pop('server_time')
        self.assertEqual(ready, {'type': 'ready', 'user_id': self.ana.pk, 'positions': {}})
        self.assertLess(abs(datetime.fromisoformat(server_time) - timezone.now()), timedelta(seconds=5))
        await client.disconnect()

    async def test_a_bad_token_is_closed_with_4401(self) -> None:
        for message in ({'type': 'auth', 'token': 'nope'}, {'type': 'auth'}, {'type': 'position', 'lng': 0, 'lat': 0}):
            with self.subTest(message=message):
                client = await open_channel(self.group.pk)
                await client.send_json(message)
                self.assertEqual(await client.receive_close_code(), CLOSE_UNAUTHORIZED)

    async def test_silence_is_closed_with_4401_after_the_deadline(self) -> None:
        with patch('apps.routes.consumers.AUTH_TIMEOUT_SECONDS', 0.05):
            client = await open_channel(self.group.pk)
            self.assertEqual(await client.receive_close_code(), CLOSE_UNAUTHORIZED)

    async def test_an_invitee_who_has_not_accepted_and_strangers_are_closed_with_4403(self) -> None:
        stranger = await User.objects.acreate_user('stranger', password='pw')
        for user in (self.ben, stranger):
            with self.subTest(user=user.username):
                client = await open_channel(self.group.pk)
                await sign_in(client, user)
                self.assertEqual(await client.receive_close_code(), CLOSE_FORBIDDEN)

    async def test_a_position_is_broadcast_to_the_others_but_not_echoed_and_is_saved(self) -> None:
        owner_channel = await self._ride(self.owner)
        ana_channel = await self._ride(self.ana, owner_channel)
        await ana_channel.send_json(POSITION)
        received = await owner_channel.receive_json()
        self.assertEqual((received['type'], received['user_id'], received['lng']), ('position', self.ana.pk, -3.7))
        self.assertIn('recorded_at', received)
        self.assertTrue(await ana_channel.receive_nothing(SILENCE_SECONDS))
        saved = (await RouteGroup.objects.aget(pk=self.group.pk)).meta_json['participants'][str(self.ana.pk)]
        self.assertEqual(saved['position']['lat'], 40.4)
        await owner_channel.disconnect()
        await ana_channel.disconnect()

    async def test_a_late_joiner_gets_the_saved_positions(self) -> None:
        ana_channel = await self._ride(self.ana)
        await ana_channel.send_json(POSITION)
        await ana_channel.receive_nothing(SILENCE_SECONDS)
        owner_channel = await open_channel(self.group.pk)
        await sign_in(owner_channel, self.owner)
        ready = await owner_channel.receive_json()
        self.assertEqual(ready['positions'][str(self.ana.pk)]['lng'], -3.7)
        await owner_channel.disconnect()
        await ana_channel.disconnect()

    async def test_a_bad_position_gets_an_error_and_is_not_saved(self) -> None:
        ana_channel = await self._ride(self.ana)
        await ana_channel.send_json({'type': 'position', 'lng': 500, 'lat': 0})
        self.assertEqual((await ana_channel.receive_json())['type'], 'error')
        saved = (await RouteGroup.objects.aget(pk=self.group.pk)).meta_json['participants'][str(self.ana.pk)]
        self.assertIsNone(saved['position'])
        await ana_channel.disconnect()

    async def test_an_unknown_message_type_gets_an_error(self) -> None:
        ana_channel = await self._ride(self.ana)
        await ana_channel.send_json({'type': 'dance'})
        self.assertEqual((await ana_channel.receive_json())['type'], 'error')
        await ana_channel.disconnect()

    async def test_positions_sent_too_fast_are_dropped(self) -> None:
        owner_channel = await self._ride(self.owner)
        ana_channel = await self._ride(self.ana, owner_channel)
        await ana_channel.send_json(POSITION)
        await ana_channel.send_json({**POSITION, 'lng': 1})
        first = await owner_channel.receive_json()
        self.assertEqual(first['lng'], -3.7)
        self.assertTrue(await owner_channel.receive_nothing(SILENCE_SECONDS))
        await owner_channel.disconnect()
        await ana_channel.disconnect()

    async def test_other_groups_do_not_hear_the_position(self) -> None:
        other_group = await database_sync_to_async(create_group)(self.owner, None, [])
        owner_in_other = await open_channel(other_group.pk)
        await sign_in(owner_in_other, self.owner)
        await owner_in_other.receive_json()
        ana_channel = await self._ride(self.ana)
        await ana_channel.send_json(POSITION)
        self.assertTrue(await owner_in_other.receive_nothing(SILENCE_SECONDS))
        await owner_in_other.disconnect()
        await ana_channel.disconnect()

    async def test_riders_hear_when_another_rider_joins_and_leaves_but_not_themselves(self) -> None:
        owner_channel = await self._ride(self.owner)
        ana_channel = await self._ride(self.ana, owner_channel)
        self.assertTrue(await ana_channel.receive_nothing(SILENCE_SECONDS))
        await ana_channel.disconnect()
        self.assertEqual(
            await owner_channel.receive_json(), {'type': 'presence', 'user_id': self.ana.pk, 'status': 'left'},
        )
        self.assertTrue(await owner_channel.receive_nothing(SILENCE_SECONDS))
        await owner_channel.disconnect()

    async def test_a_rider_who_never_signed_in_is_not_announced(self) -> None:
        owner_channel = await self._ride(self.owner)
        stranger = await User.objects.acreate_user('stranger', password='pw')
        refused = await open_channel(self.group.pk)
        await sign_in(refused, stranger)
        self.assertEqual(await refused.receive_close_code(), CLOSE_FORBIDDEN)
        await refused.disconnect()
        self.assertTrue(await owner_channel.receive_nothing(SILENCE_SECONDS))
        await owner_channel.disconnect()
