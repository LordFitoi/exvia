from datetime import datetime, timedelta, timezone

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.notifications.models import EventType, NotificationEvent
from apps.routes import group_meta
from apps.routes.group_meta import ParticipantStatus
from apps.routes.models import MAX_GROUP_PARTICIPANTS, Route, RouteGroup

EQUATOR_STRAIGHT_LINE = [[0, 0], [0, 1]]
RIDE_START = datetime(2026, 10, 18, 9, 0, tzinfo=timezone.utc)


class GroupApiTestCase(TestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user('owner', password='pw')
        self.ana = User.objects.create_user('ana', password='pw')
        self.ben = User.objects.create_user('ben', password='pw')
        self.route = Route.objects.create(name='Loop', points=EQUATOR_STRAIGHT_LINE, author=self.owner)

    def _client_for(self, user: User) -> APIClient:
        client = APIClient()
        client.force_authenticate(user)
        return client

    def _create_group(self, **payload: object) -> dict:
        response = self._client_for(self.owner).post(reverse('routes:group_create'), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data


class GroupCreateTests(GroupApiTestCase):
    def test_creates_a_group_with_the_author_accepted_and_the_invitees_invited(self) -> None:
        data = self._create_group(route=str(self.route.id), invitees=['ana', 'ben'])
        statuses = {rider['username']: rider['status'] for rider in data['participants']}
        self.assertEqual(statuses, {'owner': 'accepted', 'ana': 'invited', 'ben': 'invited'})
        self.assertEqual(data['route']['id'], str(self.route.id))
        self.assertEqual(data['route']['points'], EQUATOR_STRAIGHT_LINE)
        self.assertEqual(data['author']['username'], 'owner')

    def test_notifies_all_the_invitees_with_one_event(self) -> None:
        data = self._create_group(route=str(self.route.id), invitees=['ana', 'ben'])
        event = NotificationEvent.objects.get()
        self.assertEqual(event.event_type, EventType.ROUTE_INVITATION)
        self.assertEqual((event.author, str(event.route_group_id)), (self.owner, data['id']))
        self.assertEqual({user.username for user in event.destinations.all()}, {'ana', 'ben'})

    def test_free_mode_group_without_invitees_sends_no_notification(self) -> None:
        data = self._create_group(route=None, invitees=[])
        self.assertIsNone(data['route'])
        self.assertEqual([rider['username'] for rider in data['participants']], ['owner'])
        self.assertEqual(NotificationEvent.objects.count(), 0)

    def test_route_and_invitees_may_be_left_out(self) -> None:
        self.assertIsNone(self._create_group()['route'])

    def test_repeated_usernames_are_invited_once(self) -> None:
        data = self._create_group(invitees=['ana', ' ana ', 'ana'])
        self.assertEqual(len(data['participants']), 2)

    def test_rejects_an_unknown_username(self) -> None:
        response = self._client_for(self.owner).post(
            reverse('routes:group_create'), {'invitees': ['ana', 'ghost']}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ghost', str(response.data['invitees']))
        self.assertEqual(RouteGroup.objects.count(), 0)

    def test_rejects_inviting_yourself(self) -> None:
        response = self._client_for(self.owner).post(
            reverse('routes:group_create'), {'invitees': ['owner']}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('invitees', response.data)

    def test_rejects_someone_elses_route(self) -> None:
        response = self._client_for(self.ana).post(
            reverse('routes:group_create'), {'route': str(self.route.id)}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('route', response.data)

    def test_accepts_the_maximum_and_rejects_one_more(self) -> None:
        names = [User.objects.create_user(f'rider{n}').username for n in range(MAX_GROUP_PARTICIPANTS)]
        client = self._client_for(self.owner)
        too_many = client.post(reverse('routes:group_create'), {'invitees': names}, format='json')
        self.assertEqual(too_many.status_code, status.HTTP_400_BAD_REQUEST)
        full = client.post(reverse('routes:group_create'), {'invitees': names[:-1]}, format='json')
        self.assertEqual(full.status_code, status.HTTP_201_CREATED)

    def test_requires_authentication(self) -> None:
        response = APIClient().post(reverse('routes:group_create'), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class GroupDetailTests(GroupApiTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.group_id = self._create_group(route=str(self.route.id), invitees=['ana'])['id']
        self.url = reverse('routes:group_detail', args=[self.group_id])

    def test_members_and_invitees_can_read_the_group(self) -> None:
        for user in (self.owner, self.ana):
            self.assertEqual(self._client_for(user).get(self.url).status_code, status.HTTP_200_OK)

    def test_strangers_get_404(self) -> None:
        self.assertEqual(self._client_for(self.ben).get(self.url).status_code, status.HTTP_404_NOT_FOUND)

    def test_participants_carry_a_null_avatar_without_a_profile_picture(self) -> None:
        data = self._client_for(self.ana).get(self.url).data
        self.assertEqual([rider['avatar'] for rider in data['participants']], [None, None])

    def test_reading_takes_a_fixed_number_of_queries(self) -> None:
        with self.assertNumQueries(2):
            self._client_for(self.ana).get(self.url)


class GroupAnswerTests(GroupApiTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.group_id = self._create_group(route=str(self.route.id), invitees=['ana', 'ben'])['id']

    def _answer(self, user: User, name: str):
        return self._client_for(user).post(reverse(f'routes:group_{name}', args=[self.group_id]))

    def _status_of(self, user: User) -> ParticipantStatus | None:
        group = RouteGroup.objects.get(pk=self.group_id)
        return group_meta.get_status(group.meta_json, user.pk)

    def test_accepting_returns_the_group_ready_to_ride(self) -> None:
        response = self._answer(self.ana, 'accept')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['route']['points'], EQUATOR_STRAIGHT_LINE)
        self.assertEqual(self._status_of(self.ana), ParticipantStatus.ACCEPTED)

    def test_rejecting_leaves_the_group_and_frees_the_place(self) -> None:
        self.assertEqual(self._answer(self.ben, 'reject').status_code, status.HTTP_204_NO_CONTENT)
        group = RouteGroup.objects.get(pk=self.group_id)
        self.assertEqual(self._status_of(self.ben), ParticipantStatus.REJECTED)
        self.assertNotIn(self.ben, group.participants.all())

    def test_answering_twice_is_a_400(self) -> None:
        self._answer(self.ana, 'accept')
        again = self._answer(self.ana, 'reject')
        self.assertEqual(again.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self._status_of(self.ana), ParticipantStatus.ACCEPTED)

    def test_the_author_has_nothing_to_answer(self) -> None:
        self.assertEqual(self._answer(self.owner, 'accept').status_code, status.HTTP_400_BAD_REQUEST)

    def test_strangers_and_the_already_rejected_get_404(self) -> None:
        stranger = User.objects.create_user('stranger')
        self.assertEqual(self._answer(stranger, 'accept').status_code, status.HTTP_404_NOT_FOUND)
        self._answer(self.ben, 'reject')
        self.assertEqual(self._answer(self.ben, 'accept').status_code, status.HTTP_404_NOT_FOUND)


class GroupLeaveTests(GroupApiTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.group_id = self._create_group(route=str(self.route.id), invitees=['ana', 'ben'])['id']
        self._client_for(self.ana).post(reverse('routes:group_accept', args=[self.group_id]))

    def _leave(self, user: User):
        return self._client_for(user).post(reverse('routes:group_leave', args=[self.group_id]))

    def test_an_accepted_rider_leaves_and_frees_the_place(self) -> None:
        self.assertEqual(self._leave(self.ana).status_code, status.HTTP_204_NO_CONTENT)
        group = RouteGroup.objects.get(pk=self.group_id)
        self.assertNotIn(self.ana, group.participants.all())
        self.assertIsNone(group_meta.get_status(group.meta_json, self.ana.pk))

    def test_the_group_is_gone_for_the_rider_who_left(self) -> None:
        self._leave(self.ana)
        self.assertEqual(self._leave(self.ana).status_code, status.HTTP_404_NOT_FOUND)
        response = self._client_for(self.ana).get(reverse('routes:group_detail', args=[self.group_id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_the_others_stay_in_the_group(self) -> None:
        self._leave(self.ana)
        response = self._client_for(self.owner).get(reverse('routes:group_detail', args=[self.group_id]))
        self.assertEqual({rider['username'] for rider in response.data['participants']}, {'owner', 'ben'})

    def test_a_pending_invitation_is_answered_not_left(self) -> None:
        self.assertEqual(self._leave(self.ben).status_code, status.HTTP_400_BAD_REQUEST)

    def test_strangers_get_404(self) -> None:
        stranger = User.objects.create_user('stranger')
        self.assertEqual(self._leave(stranger).status_code, status.HTTP_404_NOT_FOUND)


class GroupRideSummaryTests(GroupApiTestCase):
    def _save_summary(self, user: User):
        payload = {
            'start_at': RIDE_START.isoformat(),
            'end_at': (RIDE_START + timedelta(minutes=30)).isoformat(),
        }
        url = reverse('routes:ride_summary_create', args=[self.route.id])
        return self._client_for(user).post(url, payload, format='json')

    def test_an_accepted_member_can_save_a_ride_of_the_group_route(self) -> None:
        group_id = self._create_group(route=str(self.route.id), invitees=['ana'])['id']
        self._client_for(self.ana).post(reverse('routes:group_accept', args=[group_id]))
        self.assertEqual(self._save_summary(self.ana).status_code, status.HTTP_201_CREATED)

    def test_an_invitee_who_has_not_accepted_gets_404(self) -> None:
        self._create_group(route=str(self.route.id), invitees=['ana'])
        self.assertEqual(self._save_summary(self.ana).status_code, status.HTTP_404_NOT_FOUND)

    def test_a_rejected_invitee_gets_404(self) -> None:
        group_id = self._create_group(route=str(self.route.id), invitees=['ana'])['id']
        self._client_for(self.ana).post(reverse('routes:group_reject', args=[group_id]))
        self.assertEqual(self._save_summary(self.ana).status_code, status.HTTP_404_NOT_FOUND)

    def test_the_author_still_rides_without_a_group(self) -> None:
        self.assertEqual(self._save_summary(self.owner).status_code, status.HTTP_201_CREATED)
