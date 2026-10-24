from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.notifications.models import NotificationEvent
from apps.notifications.services import INVITATION_VALIDITY
from apps.routes import group_meta
from apps.routes.group_meta import ParticipantStatus
from apps.routes.models import Route, RouteGroup

EQUATOR_STRAIGHT_LINE = [[0, 0], [0, 1]]
LIST_URL = reverse('notifications:notification_list')


class NotificationApiTestCase(TestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user('owner', password='pw')
        self.ana = User.objects.create_user('ana', password='pw')
        self.ben = User.objects.create_user('ben', password='pw')
        self.route = Route.objects.create(name='Loop', points=EQUATOR_STRAIGHT_LINE, author=self.owner)

    def _client_for(self, user: User) -> APIClient:
        client = APIClient()
        client.force_authenticate(user)
        return client

    def _invite_again(self, group_id: str) -> None:
        url = reverse('routes:group_invite', args=[group_id])
        self._client_for(self.owner).post(url, {'username': 'ana'}, format='json')

    def _answer(self, group_id: str, answer: str) -> None:
        self._client_for(self.ana).post(reverse(f'routes:group_{answer}', args=[group_id]))

    def _listed_statuses(self) -> list[str | None]:
        return [item['status'] for item in self._client_for(self.ana).get(LIST_URL).data]

    def _invite(self, route: Route | None) -> str:
        payload = {'route': str(route.id) if route else None, 'invitees': ['ana']}
        response = self._client_for(self.owner).post(reverse('routes:group_create'), payload, format='json')
        return response.data['id']


class NotificationListTests(NotificationApiTestCase):
    def test_lists_only_the_notifications_addressed_to_the_caller(self) -> None:
        self._invite(self.route)
        self.assertEqual(len(self._client_for(self.ana).get(LIST_URL).data), 1)
        for user in (self.owner, self.ben):
            self.assertEqual(self._client_for(user).get(LIST_URL).data, [])

    def test_an_invitation_names_the_author_the_group_and_the_route(self) -> None:
        group_id = self._invite(self.route)
        notification = self._client_for(self.ana).get(LIST_URL).data[0]
        self.assertEqual(notification['event_type'], 'route_invitation')
        self.assertEqual(notification['author']['username'], 'owner')
        self.assertEqual((str(notification['route_group']), notification['route_name']), (group_id, 'Loop'))
        self.assertEqual(notification['status'], 'invited')

    def test_a_free_mode_invitation_has_no_route_name(self) -> None:
        self._invite(None)
        self.assertIsNone(self._client_for(self.ana).get(LIST_URL).data[0]['route_name'])

    def test_the_status_follows_the_answer(self) -> None:
        group_id = self._invite(self.route)
        self._client_for(self.ana).post(reverse('routes:group_accept', args=[group_id]))
        self.assertEqual(self._client_for(self.ana).get(LIST_URL).data[0]['status'], 'accepted')

    def test_an_accepted_invitation_stays_closed_when_the_rider_is_invited_again(self) -> None:
        group_id = self._invite(self.route)
        for _ in range(2):
            self._answer(group_id, 'accept')
            self._answer(group_id, 'leave')
            self._invite_again(group_id)
        self.assertEqual(self._listed_statuses(), ['invited', 'accepted', 'accepted'])

    def test_a_rejected_invitation_stays_closed_when_the_rider_is_invited_again(self) -> None:
        group_id = self._invite(self.route)
        self._answer(group_id, 'reject')
        self._invite_again(group_id)
        self.assertEqual(self._listed_statuses(), ['invited', 'rejected'])

    def test_answering_the_new_invitation_leaves_the_old_ones_as_they_were(self) -> None:
        group_id = self._invite(self.route)
        self._answer(group_id, 'reject')
        self._invite_again(group_id)
        self._answer(group_id, 'accept')
        self.assertEqual(self._listed_statuses(), ['accepted', 'rejected'])

    def test_an_invitation_replaced_without_an_answer_is_expired(self) -> None:
        group_id = self._invite(self.route)
        remove_url = reverse('routes:group_remove', args=[group_id])
        self._client_for(self.owner).post(remove_url, {'user': self.ana.pk}, format='json')
        self.assertEqual(self._listed_statuses(), ['expired'])
        self._invite_again(group_id)
        self.assertEqual(self._listed_statuses(), ['invited', 'expired'])

    def test_newest_first(self) -> None:
        first, second = self._invite(self.route), self._invite(None)
        groups = [str(item['route_group']) for item in self._client_for(self.ana).get(LIST_URL).data]
        self.assertEqual(groups, [second, first])

    def test_reading_takes_a_fixed_number_of_queries(self) -> None:
        for _ in range(3):
            self._invite(self.route)
        with self.assertNumQueries(1):
            self._client_for(self.ana).get(LIST_URL)

    def test_requires_authentication(self) -> None:
        self.assertEqual(APIClient().get(LIST_URL).status_code, status.HTTP_401_UNAUTHORIZED)


class InvitationExpiryTests(NotificationApiTestCase):
    """Invitations that time out, or that close when the rider accepts another one."""

    def _age_invitations(self, age: timedelta) -> None:
        NotificationEvent.objects.update(created_at=timezone.now() - age)

    def test_an_invitation_older_than_the_validity_is_expired(self) -> None:
        self._invite(self.route)
        self._age_invitations(INVITATION_VALIDITY)
        self.assertEqual(self._listed_statuses(), ['expired'])

    def test_an_invitation_younger_than_the_validity_is_still_waiting(self) -> None:
        self._invite(self.route)
        self._age_invitations(INVITATION_VALIDITY - timedelta(minutes=1))
        self.assertEqual(self._listed_statuses(), ['invited'])

    def test_an_answered_invitation_keeps_its_answer_after_the_validity(self) -> None:
        group_id = self._invite(self.route)
        self._answer(group_id, 'accept')
        self._age_invitations(INVITATION_VALIDITY * 2)
        self.assertEqual(self._listed_statuses(), ['accepted'])

    def test_an_expired_invitation_cannot_be_answered(self) -> None:
        group_id = self._invite(self.route)
        self._age_invitations(INVITATION_VALIDITY)
        for answer in ('accept', 'reject'):
            response = self._client_for(self.ana).post(reverse(f'routes:group_{answer}', args=[group_id]))
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(response.data['detail'], 'This invitation has expired.')

    def test_inviting_again_gives_a_fresh_invitation(self) -> None:
        group_id = self._invite(self.route)
        self._age_invitations(INVITATION_VALIDITY)
        remove_url = reverse('routes:group_remove', args=[group_id])
        self._client_for(self.owner).post(remove_url, {'user': self.ana.pk}, format='json')
        self._invite_again(group_id)
        self._answer(group_id, 'accept')
        self.assertEqual(self._listed_statuses(), ['accepted', 'expired'])

    def test_accepting_one_invitation_expires_the_others_and_frees_their_places(self) -> None:
        first, second, third = self._invite(self.route), self._invite(None), self._invite(self.route)
        self._answer(second, 'accept')
        self.assertEqual(self._listed_statuses(), ['expired', 'accepted', 'expired'])
        for group_id in (first, third):
            group = RouteGroup.objects.get(pk=group_id)
            self.assertNotIn(self.ana, group.participants.all())
            self.assertIsNone(group_meta.get_status(group.meta_json, self.ana.pk))

    def test_an_expired_invitation_is_gone_for_the_rider(self) -> None:
        first, second = self._invite(self.route), self._invite(None)
        self._answer(second, 'accept')
        response = self._client_for(self.ana).post(reverse('routes:group_accept', args=[first]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_rejecting_one_invitation_leaves_the_others_waiting(self) -> None:
        first, second = self._invite(self.route), self._invite(None)
        self._answer(second, 'reject')
        self.assertEqual(self._listed_statuses(), ['rejected', 'invited'])
        first_group = RouteGroup.objects.get(pk=first)
        self.assertEqual(group_meta.get_status(first_group.meta_json, self.ana.pk), ParticipantStatus.INVITED)

    def test_accepting_does_not_touch_the_invitations_of_other_riders(self) -> None:
        group_id = self._invite(self.route)
        invite_url = reverse('routes:group_invite', args=[group_id])
        self._client_for(self.owner).post(invite_url, {'username': 'ben'}, format='json')
        other = self._invite(None)
        self._answer(other, 'accept')
        ben_statuses = [item['status'] for item in self._client_for(self.ben).get(LIST_URL).data]
        self.assertEqual(ben_statuses, ['invited'])
