from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.notifications.models import EventType, NotificationEvent
from apps.routes import group_meta
from apps.routes.group_meta import ParticipantStatus
from apps.routes.models import MAX_GROUP_PARTICIPANTS, RouteGroup


class GroupMembersTestCase(TestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user('owner', password='pw')
        self.ana = User.objects.create_user('ana', password='pw')
        self.ben = User.objects.create_user('ben', password='pw')
        self.group = self._client_for(self.owner).post(
            reverse('routes:group_create'), {'invitees': ['ana']}, format='json',
        ).data
        self.group_id = self.group['id']

    def _client_for(self, user: User) -> APIClient:
        client = APIClient()
        client.force_authenticate(user)
        return client

    def _invite(self, user: User, username: str):
        url = reverse('routes:group_invite', args=[self.group_id])
        return self._client_for(user).post(url, {'username': username}, format='json')

    def _remove(self, user: User, rider: User):
        url = reverse('routes:group_remove', args=[self.group_id])
        return self._client_for(user).post(url, {'user': rider.pk}, format='json')

    def _statuses(self) -> dict[str, str | None]:
        group = RouteGroup.objects.get(pk=self.group_id)
        return {rider.username: group_meta.get_status(group.meta_json, rider.pk) for rider in group.participants.all()}


class GroupInviteTests(GroupMembersTestCase):
    def test_the_leader_invites_a_rider_who_is_notified(self) -> None:
        response = self._invite(self.owner, 'ben')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(
            {rider['username']: rider['status'] for rider in response.data['participants']},
            {'owner': 'accepted', 'ana': 'invited', 'ben': 'invited'},
        )
        event = NotificationEvent.objects.filter(destinations=self.ben).get()
        self.assertEqual((event.event_type, event.author, str(event.route_group_id)),
                         (EventType.ROUTE_INVITATION, self.owner, self.group_id))

    def test_the_invited_rider_can_accept(self) -> None:
        self._invite(self.owner, 'ben')
        response = self._client_for(self.ben).post(reverse('routes:group_accept', args=[self.group_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_a_rider_who_rejected_can_be_invited_again(self) -> None:
        self._client_for(self.ana).post(reverse('routes:group_reject', args=[self.group_id]))
        self.assertEqual(self._invite(self.owner, 'ana').status_code, status.HTTP_200_OK)
        self.assertEqual(self._statuses()['ana'], ParticipantStatus.INVITED)

    def test_rejects_an_unknown_username(self) -> None:
        response = self._invite(self.owner, 'ghost')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_rejects_a_rider_already_in_the_group(self) -> None:
        for username in ('ana', 'owner'):
            response = self._invite(self.owner, username)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('username', response.data)
        self.assertEqual(NotificationEvent.objects.count(), 1)

    def test_rejects_one_rider_over_the_limit(self) -> None:
        for number in range(MAX_GROUP_PARTICIPANTS - 2):
            User.objects.create_user(f'rider{number}')
            self.assertEqual(self._invite(self.owner, f'rider{number}').status_code, status.HTTP_200_OK)
        self.assertEqual(self._invite(self.owner, 'ben').status_code, status.HTTP_400_BAD_REQUEST)

    def test_only_the_leader_can_invite(self) -> None:
        self.assertEqual(self._invite(self.ana, 'ben').status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn('ben', self._statuses())

    def test_strangers_get_404(self) -> None:
        self.assertEqual(self._invite(self.ben, 'ben').status_code, status.HTTP_404_NOT_FOUND)


class GroupRemoveTests(GroupMembersTestCase):
    def test_the_leader_removes_a_rider_who_accepted(self) -> None:
        self._client_for(self.ana).post(reverse('routes:group_accept', args=[self.group_id]))
        response = self._remove(self.owner, self.ana)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual([rider['username'] for rider in response.data['participants']], ['owner'])
        self.assertEqual(self._statuses(), {'owner': ParticipantStatus.ACCEPTED})

    def test_the_leader_removes_a_rider_still_invited(self) -> None:
        self.assertEqual(self._remove(self.owner, self.ana).status_code, status.HTTP_200_OK)
        self.assertEqual(set(self._statuses()), {'owner'})

    def test_the_removed_rider_loses_the_group(self) -> None:
        self._remove(self.owner, self.ana)
        response = self._client_for(self.ana).get(reverse('routes:group_detail', args=[self.group_id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_the_leader_cannot_remove_themselves(self) -> None:
        response = self._remove(self.owner, self.owner)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('user', response.data)

    def test_rejects_a_rider_who_is_not_in_the_group(self) -> None:
        self.assertEqual(self._remove(self.owner, self.ben).status_code, status.HTTP_400_BAD_REQUEST)

    def test_only_the_leader_can_remove(self) -> None:
        self.assertEqual(self._remove(self.ana, self.owner).status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('owner', self._statuses())
