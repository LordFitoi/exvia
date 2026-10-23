from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.places.models import PlaceCategory, PlaceLocation


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

    def test_rejects_out_of_range_coordinates(self) -> None:
        with self.assertRaises(ValidationError):
            self.build_place(lat='90.5').full_clean()
        with self.assertRaises(ValidationError):
            self.build_place(lng='-180.5').full_clean()

    def test_deleting_the_author_deletes_their_places(self) -> None:
        self.build_place().save()
        self.author.delete()

        self.assertFalse(PlaceLocation.objects.exists())
