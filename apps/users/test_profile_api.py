import tempfile
from io import BytesIO

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import Contact, Vehicle


def make_png() -> SimpleUploadedFile:
    buffer = BytesIO()
    Image.new('RGB', (4, 4)).save(buffer, format='PNG')
    return SimpleUploadedFile('me.png', buffer.getvalue(), content_type='image/png')


class ProfileApiTestCase(APITestCase):
    def setUp(self) -> None:
        self.rider = User.objects.create_user(username='rider', password='s3cr3t-pass')
        self.stranger = User.objects.create_user(username='stranger', password='s3cr3t-pass')
        self.client.force_authenticate(self.rider)


class ProfileReadTests(ProfileApiTestCase):
    def test_empty_profile_has_no_fields_and_no_progress(self) -> None:
        response = self.client.get(reverse('users:profile'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['avatar'], None)
        self.assertEqual(response.data['description'], '')
        self.assertEqual(response.data['emergency_contacts'], [])
        self.assertEqual(response.data['vehicles'], [])
        self.assertEqual(response.data['completion'], {
            'percentage': 0,
            'missing': ['avatar', 'description', 'blood_type', 'emergency_contact', 'vehicle'],
        })

    def test_lists_only_the_callers_contacts_and_vehicles(self) -> None:
        Contact.objects.create(profile=self.rider.profile, name='Luis', phone_number='600')
        Contact.objects.create(profile=self.stranger.profile, name='Ana', phone_number='700')
        Vehicle.objects.create(profile=self.stranger.profile, brand='Honda', model='CB500F')

        response = self.client.get(reverse('users:profile'))

        self.assertEqual([contact['name'] for contact in response.data['emergency_contacts']], ['Luis'])
        self.assertEqual(response.data['vehicles'], [])

    def test_requires_authentication(self) -> None:
        self.client.force_authenticate(None)

        response = self.client.get(reverse('users:profile'))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileUpdateTests(ProfileApiTestCase):
    def test_patch_changes_description_and_blood_type(self) -> None:
        response = self.client.patch(
            reverse('users:profile'), {'description': 'Weekend rider.', 'blood_type': 'O+'}, format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.rider.profile.refresh_from_db()
        self.assertEqual(self.rider.profile.description, 'Weekend rider.')
        self.assertEqual(self.rider.profile.blood_type, 'O+')

    def test_unknown_blood_type_is_rejected(self) -> None:
        response = self.client.patch(reverse('users:profile'), {'blood_type': 'Z+'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('blood_type', response.data)

    def test_blood_type_can_be_cleared(self) -> None:
        self.client.patch(reverse('users:profile'), {'blood_type': 'O+'}, format='json')

        response = self.client.patch(reverse('users:profile'), {'blood_type': ''}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['blood_type'], '')

    def test_patch_uploads_avatar_and_returns_its_path(self) -> None:
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.client.patch(reverse('users:profile'), {'avatar': make_png()}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['avatar'].startswith('/media/avatars/'))

    def test_non_image_avatar_is_rejected(self) -> None:
        not_an_image = SimpleUploadedFile('me.png', b'text', content_type='image/png')

        response = self.client.patch(reverse('users:profile'), {'avatar': not_an_image}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('avatar', response.data)

    def test_contacts_and_vehicles_cannot_be_written_here(self) -> None:
        payload = {'emergency_contacts': [{'name': 'Luis', 'phone_number': '600'}]}

        self.client.patch(reverse('users:profile'), payload, format='json')

        self.assertFalse(Contact.objects.exists())


class ProfileCompletionTests(ProfileApiTestCase):
    def completion(self) -> dict:
        return self.client.get(reverse('users:profile')).data['completion']

    def test_each_filled_step_adds_a_fifth(self) -> None:
        self.client.patch(reverse('users:profile'), {'description': 'Rider.'}, format='json')
        self.assertEqual(self.completion()['percentage'], 20)

        self.client.patch(reverse('users:profile'), {'blood_type': 'A-'}, format='json')
        self.assertEqual(self.completion()['percentage'], 40)

        Contact.objects.create(profile=self.rider.profile, name='Luis', phone_number='600')
        self.assertEqual(self.completion()['percentage'], 60)

        Vehicle.objects.create(profile=self.rider.profile, brand='Honda', model='CB500F')
        self.assertEqual(self.completion(), {'percentage': 80, 'missing': ['avatar']})

    def test_complete_profile_is_one_hundred_percent(self) -> None:
        Contact.objects.create(profile=self.rider.profile, name='Luis', phone_number='600')
        Vehicle.objects.create(profile=self.rider.profile, brand='Honda', model='CB500F')
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            self.client.patch(
                reverse('users:profile'),
                {'avatar': make_png(), 'description': 'Rider.', 'blood_type': 'B+'},
                format='multipart',
            )

        self.assertEqual(self.completion(), {'percentage': 100, 'missing': []})

    def test_blank_description_does_not_count(self) -> None:
        self.client.patch(reverse('users:profile'), {'description': '   '}, format='json')

        self.assertIn('description', self.completion()['missing'])


class ContactApiTests(ProfileApiTestCase):
    def test_create_adds_contact_to_callers_profile(self) -> None:
        response = self.client.post(
            reverse('users:contact_create'),
            {'name': 'Luis', 'phone_number': '600', 'relationship': 'Brother'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.rider.profile.emergency_contacts.get().name, 'Luis')

    def test_create_requires_name_and_phone_number(self) -> None:
        response = self.client.post(reverse('users:contact_create'), {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data), {'name', 'phone_number'})

    def test_patch_and_delete_own_contact(self) -> None:
        contact = Contact.objects.create(profile=self.rider.profile, name='Luis', phone_number='600')
        url = reverse('users:contact_detail', args=[contact.pk])

        patched = self.client.patch(url, {'phone_number': '611'}, format='json')
        deleted = self.client.delete(url)

        self.assertEqual(patched.data['phone_number'], '611')
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Contact.objects.exists())

    def test_other_users_contact_is_not_found(self) -> None:
        contact = Contact.objects.create(profile=self.stranger.profile, name='Ana', phone_number='700')
        url = reverse('users:contact_detail', args=[contact.pk])

        self.assertEqual(self.client.patch(url, {'name': 'X'}, format='json').status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Contact.objects.filter(pk=contact.pk).exists())


class VehicleApiTests(ProfileApiTestCase):
    def test_create_adds_vehicle_to_callers_garage(self) -> None:
        response = self.client.post(
            reverse('users:vehicle_create'),
            {'brand': 'Honda', 'model': 'CB500F', 'year': 2019, 'license_plate': 'HX 19 CBR', 'color': 'Red'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.rider.profile.vehicles.get().year, 2019)

    def test_create_requires_brand_and_model(self) -> None:
        response = self.client.post(reverse('users:vehicle_create'), {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data), {'brand', 'model'})

    def test_year_may_be_left_out_or_cleared(self) -> None:
        vehicle = Vehicle.objects.create(profile=self.rider.profile, brand='Honda', model='CB500F', year=2019)

        response = self.client.patch(reverse('users:vehicle_detail', args=[vehicle.pk]), {'year': None}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['year'])

    def test_other_users_vehicle_is_not_found(self) -> None:
        vehicle = Vehicle.objects.create(profile=self.stranger.profile, brand='Honda', model='CB500F')
        url = reverse('users:vehicle_detail', args=[vehicle.pk])

        self.assertEqual(self.client.patch(url, {'color': 'Red'}, format='json').status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)


class SharedProfileApiTests(ProfileApiTestCase):
    def setUp(self) -> None:
        super().setUp()
        profile = self.stranger.profile
        profile.description = 'Coastal roads.'
        profile.blood_type = 'O+'
        profile.save()
        Contact.objects.create(profile=profile, name='Ana', phone_number='700')
        Vehicle.objects.create(
            profile=profile, brand='Honda', model='CB500F', year=2019, license_plate='HX 19 CBR', color='Red',
        )
        self.url = reverse('users:shared_profile', args=['stranger'])

    def test_shows_name_bio_and_garage_to_another_rider(self) -> None:
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'stranger')
        self.assertEqual(response.data['description'], 'Coastal roads.')
        self.assertEqual(response.data['avatar'], None)
        self.assertEqual(
            response.data['vehicles'],
            [{'id': Vehicle.objects.get().pk, 'brand': 'Honda', 'model': 'CB500F', 'year': 2019, 'color': 'Red'}],
        )

    def test_keeps_medical_and_contact_data_private(self) -> None:
        response = self.client.get(self.url)

        self.assertEqual(set(response.data), {'username', 'avatar', 'description', 'vehicles'})
        self.assertNotIn('Ana', str(response.data))
        self.assertNotIn('HX 19 CBR', str(response.data))

    def test_unknown_username_is_not_found(self) -> None:
        response = self.client.get(reverse('users:shared_profile', args=['nobody']))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_inactive_user_is_not_found(self) -> None:
        User.objects.filter(pk=self.stranger.pk).update(is_active=False)

        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_404_NOT_FOUND)

    def test_requires_authentication(self) -> None:
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_is_read_only(self) -> None:
        self.assertEqual(self.client.patch(self.url, {'description': 'x'}, format='json').status_code,
                         status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_username_with_dots_and_symbols_resolves(self) -> None:
        User.objects.create_user(username='ana.m+1@x', password='s3cr3t-pass')

        response = self.client.get(reverse('users:shared_profile', args=['ana.m+1@x']))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
