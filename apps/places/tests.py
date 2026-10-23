from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.places.models import NOTES_MAX_LENGTH, PlaceCategory, PlaceLocation


class PlaceLocationTests(TestCase):
    def setUp(self) -> None:
        self.author = User.objects.create_user(username='rider', password='pw')

    def build_place(self, **overrides: object) -> PlaceLocation:
        fields = {
            'author': self.author, 'name': 'Shell Ruta 5', 'category': PlaceCategory.GAS_STATION,
            'lat': '-23.550520', 'lng': '-46.633308',
        }
        return PlaceLocation(**{**fields, **overrides})

    def test_saves_a_valid_place(self) -> None:
        place = self.build_place(notes='Cheap coffee inside')
        place.full_clean()
        place.save()

        self.assertEqual(self.author.place_locations.get(), place)
        self.assertEqual(str(place), 'Shell Ruta 5')

    def test_notes_are_optional(self) -> None:
        self.build_place().full_clean()

    def test_rejects_unknown_category(self) -> None:
        with self.assertRaises(ValidationError):
            self.build_place(category='spaceport').full_clean()

    def test_rejects_notes_over_the_limit(self) -> None:
        with self.assertRaises(ValidationError):
            self.build_place(notes='x' * (NOTES_MAX_LENGTH + 1)).full_clean()

    def test_rejects_out_of_range_coordinates(self) -> None:
        with self.assertRaises(ValidationError):
            self.build_place(lat='90.5').full_clean()
        with self.assertRaises(ValidationError):
            self.build_place(lng='-180.5').full_clean()

    def test_deleting_the_author_deletes_their_places(self) -> None:
        self.build_place().save()
        self.author.delete()

        self.assertFalse(PlaceLocation.objects.exists())


class PlaceLocationApiTests(TestCase):
    def setUp(self) -> None:
        self.rider = User.objects.create_user('rider', password='pw')
        self.other = User.objects.create_user('other', password='pw')
        self.client = APIClient()
        self.client.force_authenticate(self.rider)
        self.url = reverse('places:place_list')

    def save_place(self, author: User, name: str, lat: float, lng: float) -> PlaceLocation:
        return PlaceLocation.objects.create(
            author=author, name=name, category=PlaceCategory.CAFE, lat=lat, lng=lng,
        )

    def test_requires_authentication(self) -> None:
        response = APIClient().get(self.url, {'bbox': '-1,-1,1,1'})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_creates_a_place_for_the_caller(self) -> None:
        payload = {'name': 'Shell', 'notes': 'Open 24h', 'category': 'gas_station', 'lat': 18.4745, 'lng': -69.933}
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.json()['lat'], 18.4745)
        self.assertEqual(self.rider.place_locations.get().name, 'Shell')

    def test_rejects_an_unknown_category_and_bad_coordinates(self) -> None:
        payload = {'name': 'Nowhere', 'category': 'spaceport', 'lat': 91, 'lng': 0}
        response = self.client.post(self.url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data), {'category', 'lat'})

    def test_lists_only_own_places_inside_the_viewport(self) -> None:
        self.save_place(self.rider, 'Inside', 10, 10)
        self.save_place(self.rider, 'Outside', 50, 50)
        self.save_place(self.other, 'Someone else', 10, 10)
        response = self.client.get(self.url, {'bbox': '5,5,15,15'})

        self.assertEqual([place['name'] for place in response.data], ['Inside'])

    def test_a_viewport_over_the_antimeridian_wraps(self) -> None:
        self.save_place(self.rider, 'East side', 0, 179.5)
        self.save_place(self.rider, 'West side', 0, -179.5)
        self.save_place(self.rider, 'Middle', 0, 0)
        response = self.client.get(self.url, {'bbox': '179,-1,-179,1'})

        self.assertEqual({place['name'] for place in response.data}, {'East side', 'West side'})

    def test_rejects_a_missing_or_malformed_viewport(self) -> None:
        for bbox in (None, 'a,b,c,d', '1,2,3', '0,10,5,5', '0,-91,5,5', '-181,0,5,5'):
            with self.subTest(bbox=bbox):
                response = self.client.get(self.url, {'bbox': bbox} if bbox else {})

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_caps_the_places_of_one_viewport(self) -> None:
        with patch('apps.places.views.MAX_PLACES_PER_VIEWPORT', 2):
            for index in range(3):
                self.save_place(self.rider, f'Place {index}', 1, 1)
            response = self.client.get(self.url, {'bbox': '0,0,2,2'})

        self.assertEqual(len(response.data), 2)


class PlaceLocationDeleteApiTests(TestCase):
    def setUp(self) -> None:
        self.rider = User.objects.create_user('rider', password='pw')
        self.client = APIClient()
        self.client.force_authenticate(self.rider)

    def save_place(self, author: User) -> PlaceLocation:
        return PlaceLocation.objects.create(author=author, name='Shell', category=PlaceCategory.CAFE, lat=0, lng=0)

    def test_requires_authentication(self) -> None:
        place = self.save_place(self.rider)
        response = APIClient().delete(reverse('places:place_detail', args=[place.pk]))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(PlaceLocation.objects.exists())

    def test_deletes_own_place(self) -> None:
        place = self.save_place(self.rider)
        response = self.client.delete(reverse('places:place_detail', args=[place.pk]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PlaceLocation.objects.exists())

    def test_another_riders_place_is_not_found_and_kept(self) -> None:
        place = self.save_place(User.objects.create_user('other', password='pw'))
        response = self.client.delete(reverse('places:place_detail', args=[place.pk]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(PlaceLocation.objects.filter(pk=place.pk).exists())


class PlaceLocationAllApiTests(TestCase):
    def setUp(self) -> None:
        self.rider = User.objects.create_user('rider', password='pw')
        self.client = APIClient()
        self.client.force_authenticate(self.rider)
        self.url = reverse('places:place_all')

    def test_requires_authentication(self) -> None:
        self.assertEqual(APIClient().get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_lists_only_own_places_by_name_wherever_they_are(self) -> None:
        other = User.objects.create_user('other', password='pw')
        for author, name, lat in ((self.rider, 'Zeta', 80), (self.rider, 'Alfa', -80), (other, 'Hidden', 0)):
            PlaceLocation.objects.create(author=author, name=name, category=PlaceCategory.CAFE, lat=lat, lng=0)
        response = self.client.get(self.url)

        self.assertEqual([place['name'] for place in response.data], ['Alfa', 'Zeta'])

    def test_caps_the_list(self) -> None:
        with patch('apps.places.views.MAX_PLACES_LISTED', 2):
            for index in range(3):
                PlaceLocation.objects.create(
                    author=self.rider, name=f'Place {index}', category=PlaceCategory.CAFE, lat=0, lng=0,
                )
            response = self.client.get(self.url)

        self.assertEqual(len(response.data), 2)
