import tempfile
from io import BytesIO, StringIO

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.db import IntegrityError
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from PIL import Image

from apps.users.management.commands.seed import DEFAULT_ADMIN_USERNAME
from apps.users.models import BloodType, Contact, UserProfile, Vehicle


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


class SignupViewTests(APITestCase):
    VALID_PAYLOAD = {
        'username': 'carol',
        'email': 'carol@example.com',
        'password': 'v3ry-s3cure-pass',
    }

    def test_valid_payload_creates_user(self) -> None:
        response = self.client.post(reverse('users:signup'), self.VALID_PAYLOAD)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['username'], 'carol')
        self.assertEqual(response.data['email'], 'carol@example.com')
        self.assertNotIn('password', response.data)
        user = User.objects.get(username='carol')
        self.assertTrue(user.check_password(self.VALID_PAYLOAD['password']))

    def test_created_user_can_obtain_token(self) -> None:
        self.client.post(reverse('users:signup'), self.VALID_PAYLOAD)

        response = self.client.post(
            reverse('users:token_obtain_pair'),
            {'username': 'carol', 'password': self.VALID_PAYLOAD['password']},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_duplicate_username_is_rejected(self) -> None:
        User.objects.create_user(username='carol', email='other@example.com', password='x')

        response = self.client.post(reverse('users:signup'), self.VALID_PAYLOAD)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_duplicate_email_is_rejected_case_insensitively(self) -> None:
        User.objects.create_user(username='other', email='Carol@Example.com', password='x')

        response = self.client.post(reverse('users:signup'), self.VALID_PAYLOAD)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_missing_fields_are_rejected(self) -> None:
        response = self.client.post(reverse('users:signup'), {})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data), {'username', 'email', 'password'})

    def test_weak_password_is_rejected(self) -> None:
        payload = {**self.VALID_PAYLOAD, 'password': '12345678'}

        response = self.client.post(reverse('users:signup'), payload)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)
        self.assertFalse(User.objects.filter(username='carol').exists())

    def test_invalid_authorization_header_does_not_block_signup(self) -> None:
        response = self.client.post(
            reverse('users:signup'),
            self.VALID_PAYLOAD,
            HTTP_AUTHORIZATION='Bearer not-a-valid-token',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


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


def build_avatar_upload() -> SimpleUploadedFile:
    buffer = BytesIO()
    Image.new('RGB', (4, 4)).save(buffer, format='PNG')
    return SimpleUploadedFile('me.png', buffer.getvalue(), content_type='image/png')


class UserProfileModelTests(TestCase):
    def setUp(self) -> None:
        self.user = User.objects.create_user(username='dave', password='s3cr3t-pass')

    def test_profile_defaults_are_empty_and_timestamped(self) -> None:
        profile = UserProfile.objects.create(user=self.user)

        self.assertFalse(profile.avatar)
        self.assertEqual(profile.description, '')
        self.assertEqual(profile.blood_type, '')
        self.assertIsNotNone(profile.created_at)
        self.assertIsNotNone(profile.updated_at)

    def test_user_can_have_only_one_profile(self) -> None:
        UserProfile.objects.create(user=self.user)

        with self.assertRaises(IntegrityError):
            UserProfile.objects.create(user=self.user)

    def test_updated_at_changes_on_save(self) -> None:
        profile = UserProfile.objects.create(user=self.user)
        created_updated_at = profile.updated_at

        profile.description = 'Rider and mechanic'
        profile.save()

        self.assertGreater(profile.updated_at, created_updated_at)
        self.assertEqual(profile.created_at, UserProfile.objects.get().created_at)

    def test_blood_type_rejects_unknown_value(self) -> None:
        profile = UserProfile(user=self.user, blood_type='Z+')

        with self.assertRaises(ValidationError):
            profile.full_clean()

        profile.blood_type = BloodType.O_NEGATIVE
        profile.full_clean()

    def test_avatar_is_stored_in_media_root(self) -> None:
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            profile = UserProfile.objects.create(user=self.user, avatar=build_avatar_upload())

            self.assertTrue(profile.avatar.name.startswith('avatars/'))
            self.assertTrue(profile.avatar.storage.exists(profile.avatar.name))

    def test_contacts_and_vehicles_are_reachable_from_profile(self) -> None:
        profile = UserProfile.objects.create(user=self.user)
        Contact.objects.create(profile=profile, name='Eve', phone_number='+34600000000')
        Vehicle.objects.create(profile=profile, brand='Yamaha', model='MT-07', year=2022)

        self.assertEqual(profile.emergency_contacts.count(), 1)
        self.assertEqual(profile.vehicles.get().model, 'MT-07')

    def test_deleting_profile_deletes_contacts_and_vehicles(self) -> None:
        profile = UserProfile.objects.create(user=self.user)
        Contact.objects.create(profile=profile, name='Eve', phone_number='+34600000000')
        Vehicle.objects.create(profile=profile, brand='Yamaha', model='MT-07')

        profile.delete()

        self.assertEqual(Contact.objects.count(), 0)
        self.assertEqual(Vehicle.objects.count(), 0)
