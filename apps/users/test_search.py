from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.views import SUGGESTION_LIMIT


class UserSearchTests(APITestCase):
    def setUp(self) -> None:
        self.caller = User.objects.create_user(username='carla', password='s3cr3t-pass')
        self.client.force_authenticate(self.caller)
        self.url = reverse('users:user_search')

    def usernames(self, query: str) -> list[str]:
        response = self.client.get(self.url, {'q': query})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return [rider['username'] for rider in response.data]

    def test_suggests_usernames_that_start_with_the_query_ordered_by_name(self) -> None:
        for name in ('maria', 'marco', 'omar', 'tamara'):
            User.objects.create_user(username=name, password='s3cr3t-pass')
        self.assertEqual(self.usernames('mar'), ['marco', 'maria'])

    def test_matches_ignoring_case_and_surrounding_spaces(self) -> None:
        User.objects.create_user(username='Maria', password='s3cr3t-pass')
        self.assertEqual(self.usernames(' MAR '), ['Maria'])

    def test_each_suggestion_has_id_username_and_avatar(self) -> None:
        rider = User.objects.create_user(username='maria', password='s3cr3t-pass')
        response = self.client.get(self.url, {'q': 'mar'})
        self.assertEqual(response.data, [{'id': rider.pk, 'username': 'maria', 'avatar': None}])

    def test_leaves_out_the_caller_and_inactive_users(self) -> None:
        User.objects.create_user(username='carlos', password='s3cr3t-pass', is_active=False)
        User.objects.create_user(username='carmen', password='s3cr3t-pass')
        self.assertEqual(self.usernames('car'), ['carmen'])

    def test_a_wildcard_in_the_query_is_not_a_pattern(self) -> None:
        User.objects.create_user(username='maria', password='s3cr3t-pass')
        self.assertEqual(self.usernames('%'), [])
        self.assertEqual(self.usernames('_aria'), [])

    def test_is_limited_to_a_few_suggestions(self) -> None:
        for number in range(SUGGESTION_LIMIT + 3):
            User.objects.create_user(username=f'rider{number}', password='s3cr3t-pass')
        self.assertEqual(len(self.usernames('rider')), SUGGESTION_LIMIT)

    def test_a_blank_or_missing_query_suggests_nobody(self) -> None:
        User.objects.create_user(username='maria', password='s3cr3t-pass')
        self.assertEqual(self.usernames(''), [])
        self.assertEqual(self.client.get(self.url).data, [])

    def test_requires_authentication(self) -> None:
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url, {'q': 'mar'}).status_code, status.HTTP_401_UNAUTHORIZED)
