from datetime import datetime, timezone

from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.routes.models import Route, RouteSummary, RouteType

EQUATOR_STRAIGHT_LINE = [[0, 0], [0, 1]]
PLACE = 'Next, Avenida Abraham Lincoln, Santo Domingo'


class DestinationSummaryModelTests(TestCase):
    def setUp(self) -> None:
        self.rider = User.objects.create_user('rider', password='pw')
        self.start_at = datetime(2026, 10, 15, 9, 0, tzinfo=timezone.utc)
        self.end_at = datetime(2026, 10, 15, 9, 20, tzinfo=timezone.utc)

    def _create(self, **fields: object) -> RouteSummary:
        return RouteSummary.objects.create(
            author=self.rider, start_at=self.start_at, end_at=self.end_at, **fields,
        )

    def test_route_type_defaults_to_ride(self) -> None:
        route = Route.objects.create(name='Loop', points=EQUATOR_STRAIGHT_LINE, author=self.rider)
        self.assertEqual(self._create(route=route).route_type, RouteType.RIDE)

    def test_a_destination_ride_needs_no_route(self) -> None:
        summary = self._create(route_type=RouteType.DESTINATION, destination_name=PLACE, distance=4.2)
        self.assertIsNone(summary.route)
        self.assertIn(PLACE, str(summary))

    def test_a_ride_needs_a_route(self) -> None:
        with self.assertRaises(IntegrityError), transaction.atomic():
            self._create(route_type=RouteType.RIDE)

    def test_a_destination_ride_needs_its_distance(self) -> None:
        with self.assertRaises(IntegrityError), transaction.atomic():
            self._create(route_type=RouteType.DESTINATION, destination_name=PLACE)

    def test_a_destination_ride_has_no_route(self) -> None:
        route = Route.objects.create(name='Loop', points=EQUATOR_STRAIGHT_LINE, author=self.rider)
        with self.assertRaises(IntegrityError), transaction.atomic():
            self._create(route_type=RouteType.DESTINATION, route=route, distance=1)


class DestinationSummaryApiTests(TestCase):
    START_AT = '2026-10-15T09:00:00Z'
    END_AT = '2026-10-15T09:20:00Z'

    def setUp(self) -> None:
        self.rider = User.objects.create_user('rider', password='pw')
        self.client = APIClient()
        self.client.force_authenticate(self.rider)
        self.url = reverse('routes:destination_summary_create')
        self.body = {
            'start_at': self.START_AT, 'end_at': self.END_AT, 'destination_name': PLACE, 'distance': 4.2,
        }

    def test_requires_authentication(self) -> None:
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(self.url, self.body).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_saves_a_destination_summary_with_the_caller_as_author_and_participant(self) -> None:
        response = self.client.post(self.url, {**self.body, 'max_speed': 38.5}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        summary = RouteSummary.objects.get()
        self.assertEqual((summary.route_type, summary.route, summary.author), (RouteType.DESTINATION, None, self.rider))
        self.assertEqual(list(summary.participants.all()), [self.rider])
        self.assertEqual(
            {key: response.data[key] for key in (
                'route_type', 'route', 'route_name', 'distance', 'estimated_time', 'duration', 'is_finished',
                'max_speed',
            )},
            {
                'route_type': 'destination', 'route': None, 'route_name': PLACE, 'distance': 4.2,
                'estimated_time': None, 'duration': 20 * 60, 'is_finished': True, 'max_speed': 38.5,
            },
        )

    def test_saves_a_ride_that_was_not_finished(self) -> None:
        self.client.post(self.url, {**self.body, 'is_finished': False}, format='json')
        self.assertFalse(RouteSummary.objects.get().is_finished)

    def test_ignores_route_type_author_and_participants_sent_by_the_client(self) -> None:
        other = User.objects.create_user('other', password='pw')
        self.client.post(
            self.url,
            {**self.body, 'route_type': 'ride', 'author': other.pk, 'participants': [other.pk]},
            format='json',
        )
        summary = RouteSummary.objects.get()
        self.assertEqual((summary.route_type, summary.author), (RouteType.DESTINATION, self.rider))
        self.assertEqual(list(summary.participants.all()), [self.rider])

    def test_rejects_end_not_after_start(self) -> None:
        response = self.client.post(self.url, {**self.body, 'end_at': self.START_AT}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('end_at', response.data)

    def test_rejects_a_missing_place_or_distance_and_a_negative_number(self) -> None:
        for field, value in (
            ('destination_name', ''), ('destination_name', None), ('distance', None), ('distance', -1),
            ('max_speed', -5),
        ):
            with self.subTest(field=field, value=value):
                response = self.client.post(self.url, {**self.body, field: value}, format='json')
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn(field, response.data)
        self.assertFalse(RouteSummary.objects.exists())

    def test_shows_in_the_history_list_and_detail(self) -> None:
        self.client.post(self.url, self.body, format='json')
        summary = RouteSummary.objects.get()
        listed = self.client.get(reverse('routes:ride_summary_list')).data
        self.assertEqual((listed[0]['route_type'], listed[0]['route_name'], listed[0]['distance']), ('destination', PLACE, 4.2))
        detail = self.client.get(reverse('routes:ride_summary_detail', args=[summary.pk]))
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data['participants'], [{'id': self.rider.pk, 'username': 'rider'}])

    def test_the_author_can_delete_it(self) -> None:
        self.client.post(self.url, self.body, format='json')
        summary = RouteSummary.objects.get()
        response = self.client.delete(reverse('routes:ride_summary_detail', args=[summary.pk]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
