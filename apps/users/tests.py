from io import StringIO

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.management.commands.seed import DEFAULT_ADMIN_USERNAME


class TokenObtainTests(APITestCase):
    def setUp(self) -> None:
        self.user = User.objects.create_user(username='alice', password='s3cr3t-pass')

    def test_valid_credentials_return_token_pair(self) -> None:
        response = self.client.post(
            reverse('users:token_obtain_pair'),
            {'username': 'alice', 'password': 's3cr3t-pass'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_invalid_credentials_are_rejected(self) -> None:
        response = self.client.post(
            reverse('users:token_obtain_pair'),
            {'username': 'alice', 'password': 'wrong-pass'},
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class CurrentUserViewTests(APITestCase):
    def setUp(self) -> None:
        self.user = User.objects.create_user(
            username='bob', password='s3cr3t-pass', email='bob@example.com'
        )

    def test_request_without_token_is_rejected(self) -> None:
        response = self.client.get(reverse('users:current_user'))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_request_with_valid_token_returns_user(self) -> None:
        token_response = self.client.post(
            reverse('users:token_obtain_pair'),
            {'username': 'bob', 'password': 's3cr3t-pass'},
        )
        access_token = token_response.data['access']

        response = self.client.get(
            reverse('users:current_user'),
            HTTP_AUTHORIZATION=f'Bearer {access_token}',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'bob')


class SeedCommandTests(TestCase):
    def test_creates_admin_user_when_missing(self) -> None:
        call_command('seed', stdout=StringIO())

        admin = User.objects.get(username=DEFAULT_ADMIN_USERNAME)
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_staff)

    def test_is_idempotent_when_admin_already_exists(self) -> None:
        call_command('seed', stdout=StringIO())
        call_command('seed', stdout=StringIO())

        self.assertEqual(User.objects.filter(username=DEFAULT_ADMIN_USERNAME).count(), 1)
