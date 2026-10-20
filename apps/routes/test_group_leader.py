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
from apps.routes.live import broadcast_leader_change
from apps.routes.models import RouteGroup
from apps.routes.test_group_consumer import IN_MEMORY_CHANNELS, SILENCE_SECONDS, open_channel, sign_in


def client_for(user: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    return client


def accept(group: RouteGroup, user: User) -> None:
    group = RouteGroup.objects.get(pk=group.pk)
    group_meta.set_status(group.meta_json, user.pk, ParticipantStatus.ACCEPTED)
    group.save(update_fields=['meta_json'])


class GroupLeaderTests(TestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user('owner', password='pw')
        self.ana = User.objects.create_user('ana', password='pw')
        self.ben = User.objects.create_user('ben', password='pw')
        self.stranger = User.objects.create_user('stranger', password='pw')
        self.group = create_group(self.owner, None, [self.ana, self.ben])
        accept(self.group, self.ana)
        self.url = reverse('routes:group_leader', args=[self.group.pk])

    def _promote(self, user: User, rider: User):
        return client_for(user).post(self.url, {'user': rider.pk}, format='json')

    def test_the_leader_hands_the_group_to_a_rider_who_is_riding(self) -> None:
        response = self._promote(self.owner, self.ana)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['author']['username'], 'ana')
        self.assertEqual(RouteGroup.objects.get(pk=self.group.pk).author, self.ana)

    def test_the_former_leader_stays_in_the_group_as_a_rider(self) -> None:
        self._promote(self.owner, self.ana)
        response = client_for(self.owner).get(reverse('routes:group_detail', args=[self.group.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        group = RouteGroup.objects.get(pk=self.group.pk)
        self.assertEqual(group_meta.get_status(group.meta_json, self.owner.pk), ParticipantStatus.ACCEPTED)

    def test_the_new_leader_leads_and_the_former_one_no_longer_does(self) -> None:
        self._promote(self.owner, self.ana)
        self.assertEqual(client_for(self.ana).post(reverse('routes:group_route', args=[self.group.pk]),
                                                   {'route': None}, format='json').status_code, status.HTTP_200_OK)
        self.assertEqual(self._promote(self.owner, self.ana).status_code, status.HTTP_403_FORBIDDEN)

    def test_a_rider_who_is_only_invited_cannot_lead(self) -> None:
        response = self._promote(self.owner, self.ben)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('user', response.data)
        self.assertEqual(RouteGroup.objects.get(pk=self.group.pk).author, self.owner)

    def test_the_leader_cannot_hand_the_group_to_themselves(self) -> None:
        response = self._promote(self.owner, self.owner)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('user', response.data)

    def test_rejects_a_rider_who_is_not_in_the_group(self) -> None:
        self.assertEqual(self._promote(self.owner, self.stranger).status_code, status.HTTP_400_BAD_REQUEST)

    def test_only_the_leader_can_hand_the_group_over(self) -> None:
        self.assertEqual(self._promote(self.ana, self.ana).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(RouteGroup.objects.get(pk=self.group.pk).author, self.owner)

    def test_a_stranger_gets_404(self) -> None:
        self.assertEqual(self._promote(self.stranger, self.ana).status_code, status.HTTP_404_NOT_FOUND)

    def test_the_change_is_broadcast_to_the_group_once_committed(self) -> None:
        with patch('apps.routes.group_views.broadcast_leader_change') as broadcast:
            with self.captureOnCommitCallbacks() as callbacks:
                self._promote(self.owner, self.ana)
            broadcast.assert_not_called()
            for callback in callbacks:
                callback()
        broadcast.assert_called_once_with(self.group.pk, self.owner.pk, self.ana.pk)

    def test_a_refused_change_broadcasts_nothing(self) -> None:
        with patch('apps.routes.group_views.broadcast_leader_change') as broadcast:
            with self.captureOnCommitCallbacks(execute=True):
                self._promote(self.owner, self.ben)
        broadcast.assert_not_called()


class GroupLeaderLeavesTests(TestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user('owner', password='pw')
        self.ana = User.objects.create_user('ana', password='pw')
        self.ben = User.objects.create_user('ben', password='pw')
        self.cleo = User.objects.create_user('cleo', password='pw')
        self.group = create_group(self.owner, None, [self.ana, self.ben, self.cleo])
        self.url = reverse('routes:group_leave', args=[self.group.pk])

    def _leader(self) -> User:
        return RouteGroup.objects.get(pk=self.group.pk).author

    def test_the_next_rider_who_is_riding_leads_when_the_leader_leaves(self) -> None:
        accept(self.group, self.ben)
        accept(self.group, self.cleo)
        self.assertEqual(client_for(self.owner).post(self.url).status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self._leader(), self.ben)

    def test_an_invited_rider_is_skipped(self) -> None:
        accept(self.group, self.cleo)
        client_for(self.owner).post(self.url)
        self.assertEqual(self._leader(), self.cleo)

    def test_the_new_leader_has_the_controls_and_the_former_one_is_out(self) -> None:
        accept(self.group, self.ana)
        client_for(self.owner).post(self.url)
        route_url = reverse('routes:group_route', args=[self.group.pk])
        self.assertEqual(client_for(self.ana).post(route_url, {'route': None}, format='json').status_code,
                         status.HTTP_200_OK)
        detail = client_for(self.owner).get(reverse('routes:group_detail', args=[self.group.pk]))
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)

    def test_nobody_else_riding_leaves_the_group_as_it_was(self) -> None:
        client_for(self.owner).post(self.url)
        self.assertEqual(self._leader(), self.owner)

    def test_a_rider_who_is_not_the_leader_leaving_keeps_the_leader(self) -> None:
        accept(self.group, self.ana)
        client_for(self.ana).post(self.url)
        self.assertEqual(self._leader(), self.owner)

    def test_the_hand_over_is_broadcast_once_committed(self) -> None:
        accept(self.group, self.ben)
        with patch('apps.routes.group_views.broadcast_leader_change') as broadcast:
            with self.captureOnCommitCallbacks(execute=True):
                client_for(self.owner).post(self.url)
        broadcast.assert_called_once_with(self.group.pk, self.owner.pk, self.ben.pk)

    def test_nothing_is_broadcast_when_the_leader_does_not_change(self) -> None:
        accept(self.group, self.ana)
        with patch('apps.routes.group_views.broadcast_leader_change') as broadcast:
            with self.captureOnCommitCallbacks(execute=True):
                client_for(self.ana).post(self.url)
        broadcast.assert_not_called()


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNELS)
class GroupLeaderChannelTests(TransactionTestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user('owner', password='pw')
        self.ana = User.objects.create_user('ana', password='pw')
        self.group = create_group(self.owner, None, [self.ana])
        accept(self.group, self.ana)

    async def _ride(self, user: User) -> WebsocketClient:
        client = await open_channel(self.group.pk)
        await sign_in(client, user)
        self.assertEqual((await client.receive_json())['type'], 'ready')
        return client

    async def test_the_riders_hear_who_leads_now_but_the_former_leader_does_not(self) -> None:
        owner_channel = await self._ride(self.owner)
        ana_channel = await self._ride(self.ana)
        self.assertEqual((await owner_channel.receive_json())['type'], 'presence')

        await sync_to_async(broadcast_leader_change)(self.group.pk, self.owner.pk, self.ana.pk)

        self.assertEqual(await ana_channel.receive_json(), {'type': 'leader_changed', 'user_id': self.ana.pk})
        self.assertTrue(await owner_channel.receive_nothing(SILENCE_SECONDS))
        await owner_channel.disconnect()
        await ana_channel.disconnect()
