from unittest.mock import patch

from asgiref.sync import sync_to_async
from django.contrib.auth.models import User
from django.test import TestCase, TransactionTestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.core.websocket_testing import WebsocketClient
from apps.routes import group_meta
from apps.routes.group_meta import ParticipantStatus
from apps.routes.group_service import create_group
from apps.routes.live import broadcast_route_change
from apps.routes.models import Route, RouteGroup
from apps.routes.test_group_consumer import IN_MEMORY_CHANNELS, SILENCE_SECONDS, open_channel, sign_in

LOOP = [[0, 0], [0.01, 0], [0.02, 0]]


def client_for(user: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    return client


class GroupRouteTests(TestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user('owner', password='pw')
        self.ana = User.objects.create_user('ana', password='pw')
        self.stranger = User.objects.create_user('stranger', password='pw')
        self.first = Route.objects.create(name='First', points=LOOP, author=self.owner)
        self.second = Route.objects.create(name='Second', points=LOOP, author=self.owner)
        self.group = create_group(self.owner, self.first, [self.ana])
        self.url = reverse('routes:group_route', args=[self.group.pk])

    def _change(self, user: User, route: object):
        return client_for(user).post(self.url, {'route': route}, format='json')

    def test_the_leader_changes_the_route_and_gets_the_group(self) -> None:
        response = self._change(self.owner, str(self.second.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['route']['id'], str(self.second.pk))
        self.assertEqual(RouteGroup.objects.get(pk=self.group.pk).route, self.second)

    def test_the_leader_switches_to_free_mode_and_back(self) -> None:
        self.assertIsNone(self._change(self.owner, None).data['route'])
        self.assertIsNone(RouteGroup.objects.get(pk=self.group.pk).route)
        self.assertEqual(self._change(self.owner, str(self.first.pk)).data['route']['id'], str(self.first.pk))

    def test_an_invited_rider_cannot_change_the_route(self) -> None:
        response = self._change(self.ana, None)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(RouteGroup.objects.get(pk=self.group.pk).route, self.first)

    def test_a_stranger_gets_404(self) -> None:
        self.assertEqual(self._change(self.stranger, None).status_code, status.HTTP_404_NOT_FOUND)

    def test_a_route_of_another_rider_is_refused(self) -> None:
        other = Route.objects.create(name='Other', points=LOOP, author=self.stranger)
        response = self._change(self.owner, str(other.pk))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('route', response.data)
        self.assertEqual(RouteGroup.objects.get(pk=self.group.pk).route, self.first)

    def test_the_route_is_required(self) -> None:
        response = client_for(self.owner).post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('route', response.data)

    def test_the_change_is_broadcast_to_the_group_once_committed(self) -> None:
        with patch('apps.routes.group_views.broadcast_route_change') as broadcast:
            with self.captureOnCommitCallbacks() as callbacks:
                self._change(self.owner, None)
            broadcast.assert_not_called()
            for callback in callbacks:
                callback()
        broadcast.assert_called_once_with(self.group.pk, self.owner.pk)

    def test_a_refused_change_broadcasts_nothing(self) -> None:
        with patch('apps.routes.group_views.broadcast_route_change') as broadcast:
            with self.captureOnCommitCallbacks(execute=True):
                self._change(self.ana, None)
        broadcast.assert_not_called()


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNELS)
class GroupRouteChannelTests(TransactionTestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user('owner', password='pw')
        self.ana = User.objects.create_user('ana', password='pw')
        self.group = create_group(self.owner, None, [self.ana])
        group = RouteGroup.objects.get(pk=self.group.pk)
        group_meta.set_status(group.meta_json, self.ana.pk, ParticipantStatus.ACCEPTED)
        group.save(update_fields=['meta_json'])

    async def _ride(self, user: User) -> WebsocketClient:
        client = await open_channel(self.group.pk)
        await sign_in(client, user)
        self.assertEqual((await client.receive_json())['type'], 'ready')
        return client

    async def test_the_riders_hear_the_change_but_the_leader_who_made_it_does_not(self) -> None:
        owner_channel = await self._ride(self.owner)
        ana_channel = await self._ride(self.ana)
        self.assertEqual((await owner_channel.receive_json())['type'], 'presence')

        await sync_to_async(broadcast_route_change)(self.group.pk, self.owner.pk)

        self.assertEqual(await ana_channel.receive_json(), {'type': 'route_changed'})
        self.assertTrue(await owner_channel.receive_nothing(SILENCE_SECONDS))
        await owner_channel.disconnect()
        await ana_channel.disconnect()
