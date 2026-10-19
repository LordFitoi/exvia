from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.routes.models import Route

EQUATOR_STRAIGHT_LINE = [[0, 0], [0, 1]]
LIST_URL = reverse('notifications:notification_list')


class NotificationListTests(TestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user('owner', password='pw')
        self.ana = User.objects.create_user('ana', password='pw')
        self.ben = User.objects.create_user('ben', password='pw')
        self.route = Route.objects.create(name='Loop', points=EQUATOR_STRAIGHT_LINE, author=self.owner)

    def _client_for(self, user: User) -> APIClient:
        client = APIClient()
        client.force_authenticate(user)
        return client

    def _invite(self, route: Route | None) -> str:
        payload = {'route': str(route.id) if route else None, 'invitees': ['ana']}
        response = self._client_for(self.owner).post(reverse('routes:group_create'), payload, format='json')
        return response.data['id']

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
