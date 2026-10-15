import uuid
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.routes.geometry import calculate_distance_km, calculate_estimated_time
from apps.routes.models import DESCRIPTION_MAX_LENGTH, Route
from apps.routes.validators import MAX_POINTS, MAX_WAYPOINTS, validate_points, validate_waypoints

ONE_DEGREE_LATITUDE_KM = 111.195
EQUATOR_STRAIGHT_LINE = [[0, 0], [0, 1]]


class DistanceTests(SimpleTestCase):
    def test_one_degree_of_latitude(self) -> None:
        self.assertAlmostEqual(calculate_distance_km(EQUATOR_STRAIGHT_LINE), ONE_DEGREE_LATITUDE_KM, places=2)

    def test_sums_every_segment(self) -> None:
        two_degrees = calculate_distance_km([[0, 0], [0, 1], [0, 2]])
        self.assertAlmostEqual(two_degrees, 2 * ONE_DEGREE_LATITUDE_KM, delta=0.01)

    def test_identical_points_have_zero_distance(self) -> None:
        self.assertEqual(calculate_distance_km([[5, 5], [5, 5]]), 0)

    def test_estimated_time_uses_sixty_kph(self) -> None:
        self.assertEqual(calculate_estimated_time(90), timedelta(minutes=90))


class PointsValidatorTests(SimpleTestCase):
    def test_accepts_valid_points(self) -> None:
        validate_points([[-46.63, -23.55], [-46.65, -23.56]])

    def test_rejects_non_list(self) -> None:
        with self.assertRaises(ValidationError):
            validate_points('0,0;1,1')

    def test_rejects_single_point(self) -> None:
        with self.assertRaises(ValidationError):
            validate_points([[0, 0]])

    def test_rejects_too_many_points(self) -> None:
        with self.assertRaises(ValidationError):
            validate_points([[0, 0]] * (MAX_POINTS + 1))

    def test_waypoints_may_be_empty_but_not_too_many(self) -> None:
        validate_waypoints([])
        with self.assertRaises(ValidationError):
            validate_waypoints([[0, 0]] * (MAX_WAYPOINTS + 1))

    def test_rejects_malformed_points(self) -> None:
        for point in ([0], [0, 0, 0], ['a', 'b'], [True, False], 'ab'):
            with self.subTest(point=point), self.assertRaises(ValidationError):
                validate_points([[0, 0], point])

    def test_rejects_out_of_range_coordinates(self) -> None:
        for point in ([181, 0], [-181, 0], [0, 91], [0, -91]):
            with self.subTest(point=point), self.assertRaises(ValidationError):
                validate_points([[0, 0], point])


class RouteModelTests(TestCase):
    def setUp(self) -> None:
        self.author = User.objects.create_user('rider', password='pw')

    def _create_route(self, points: list[list[float]] = EQUATOR_STRAIGHT_LINE) -> Route:
        return Route.objects.create(name='Loop', description='Short loop', points=points, author=self.author)

    def test_save_calculates_distance_and_time(self) -> None:
        route = self._create_route()
        route.refresh_from_db()
        self.assertAlmostEqual(route.distance, ONE_DEGREE_LATITUDE_KM, places=2)
        self.assertEqual(route.estimated_time, calculate_estimated_time(route.distance))

    def test_changing_points_recalculates(self) -> None:
        route = self._create_route()
        route.points = [[0, 0], [0, 2]]
        route.save()
        route.refresh_from_db()
        self.assertAlmostEqual(route.distance, 2 * ONE_DEGREE_LATITUDE_KM, delta=0.01)

    def test_update_fields_with_points_persists_derived_fields(self) -> None:
        route = self._create_route()
        route.points = [[0, 0], [0, 2]]
        route.save(update_fields=['points'])
        route.refresh_from_db()
        self.assertAlmostEqual(route.distance, 2 * ONE_DEGREE_LATITUDE_KM, delta=0.01)

    def test_rejects_description_over_limit(self) -> None:
        route = Route(
            name='Loop', description='x' * (DESCRIPTION_MAX_LENGTH + 1),
            points=EQUATOR_STRAIGHT_LINE, author=self.author,
        )
        with self.assertRaises(ValidationError) as raised:
            route.full_clean(exclude=['distance', 'estimated_time'])
        self.assertIn('description', raised.exception.message_dict)

    def test_deleting_author_deletes_routes(self) -> None:
        self._create_route()
        self.author.delete()
        self.assertFalse(Route.objects.exists())


class RouteApiTests(TestCase):
    def setUp(self) -> None:
        self.author = User.objects.create_user('rider', password='pw')
        self.other = User.objects.create_user('other', password='pw')
        self.client = APIClient()
        self.client.force_authenticate(self.author)
        self.list_url = reverse('routes:route_list')

    def _create_route(self, author: User, name: str = 'Loop') -> Route:
        return Route.objects.create(
            name=name, description='', points=EQUATOR_STRAIGHT_LINE, author=author,
        )

    def _detail_url(self, route: Route) -> str:
        return reverse('routes:route_detail', args=[route.pk])

    def test_requires_authentication(self) -> None:
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.list_url).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.post(self.list_url, {}).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_sets_author_and_derived_fields(self) -> None:
        response = self.client.post(
            self.list_url,
            {
                'name': 'Loop', 'points': EQUATOR_STRAIGHT_LINE, 'author': self.other.pk,
                'distance': 1, 'estimated_time': 1,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['author'], self.author.pk)
        self.assertEqual(response.data['description'], '')
        self.assertAlmostEqual(response.data['distance'], ONE_DEGREE_LATITUDE_KM, places=2)
        self.assertEqual(response.data['estimated_time'], round(ONE_DEGREE_LATITUDE_KM / 60 * 3600))

    def test_create_requires_name(self) -> None:
        response = self.client.post(self.list_url, {'points': EQUATOR_STRAIGHT_LINE}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)

    def test_create_rejects_invalid_points(self) -> None:
        response = self.client.post(self.list_url, {'name': 'Loop', 'points': [[0, 0]]}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('points', response.data)

    def test_create_rejects_long_description(self) -> None:
        body = {'name': 'Loop', 'points': EQUATOR_STRAIGHT_LINE, 'description': 'x' * 256}
        response = self.client.post(self.list_url, body, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('description', response.data)

    def test_list_returns_only_own_routes_newest_first(self) -> None:
        first = self._create_route(self.author, 'First')
        second = self._create_route(self.author, 'Second')
        self._create_route(self.other, 'Not mine')
        response = self.client.get(self.list_url)
        self.assertEqual([route['id'] for route in response.data], [str(second.pk), str(first.pk)])

    def test_list_omits_points(self) -> None:
        self._create_route(self.author)
        response = self.client.get(self.list_url)
        self.assertNotIn('points', response.data[0])
        self.assertIn('distance', response.data[0])

    def test_retrieve_own_route(self) -> None:
        route = self._create_route(self.author)
        response = self.client.get(self._detail_url(route))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['points'], EQUATOR_STRAIGHT_LINE)

    def test_retrieve_other_users_route_is_not_found(self) -> None:
        route = self._create_route(self.other)
        response = self.client.get(self._detail_url(route))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_own_route(self) -> None:
        route = self._create_route(self.author)
        response = self.client.delete(self._detail_url(route))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Route.objects.filter(pk=route.pk).exists())

    def test_delete_other_users_route_is_not_found(self) -> None:
        route = self._create_route(self.other)
        response = self.client.delete(self._detail_url(route))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Route.objects.filter(pk=route.pk).exists())

    def test_update_replaces_fields_and_recalculates(self) -> None:
        route = self._create_route(self.author)
        body = {
            'name': 'Renamed', 'description': 'Now longer', 'points': [[0, 0], [0, 2]],
            'waypoints': [[0, 0], [0, 2]],
        }
        response = self.client.put(self._detail_url(route), body, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        route.refresh_from_db()
        self.assertEqual((route.name, route.description), ('Renamed', 'Now longer'))
        self.assertEqual(route.waypoints, [[0, 0], [0, 2]])
        self.assertAlmostEqual(route.distance, 2 * ONE_DEGREE_LATITUDE_KM, delta=0.01)

    def test_partial_update_keeps_other_fields(self) -> None:
        route = self._create_route(self.author)
        response = self.client.patch(self._detail_url(route), {'name': 'Only name'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        route.refresh_from_db()
        self.assertEqual(route.name, 'Only name')
        self.assertEqual(route.points, EQUATOR_STRAIGHT_LINE)

    def test_update_cannot_change_author(self) -> None:
        route = self._create_route(self.author)
        self.client.patch(self._detail_url(route), {'author': self.other.pk}, format='json')
        route.refresh_from_db()
        self.assertEqual(route.author, self.author)

    def test_update_rejects_invalid_points(self) -> None:
        route = self._create_route(self.author)
        response = self.client.patch(self._detail_url(route), {'points': [[0, 0]]}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('points', response.data)

    def test_update_other_users_route_is_not_found(self) -> None:
        route = self._create_route(self.other)
        response = self.client.patch(self._detail_url(route), {'name': 'Hijack'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        route.refresh_from_db()
        self.assertEqual(route.name, 'Loop')

    def test_waypoints_are_optional_and_returned_by_detail_only(self) -> None:
        body = {'name': 'Loop', 'points': EQUATOR_STRAIGHT_LINE, 'waypoints': EQUATOR_STRAIGHT_LINE}
        created = self.client.post(self.list_url, body, format='json')
        self.assertEqual(created.data['waypoints'], EQUATOR_STRAIGHT_LINE)
        listed = self.client.get(self.list_url)
        self.assertNotIn('waypoints', listed.data[0])
        without = self.client.post(self.list_url, {'name': 'Bare', 'points': EQUATOR_STRAIGHT_LINE}, format='json')
        self.assertEqual(without.data['waypoints'], [])

    def test_rejects_invalid_waypoints(self) -> None:
        body = {'name': 'Loop', 'points': EQUATOR_STRAIGHT_LINE, 'waypoints': [[0, 95]]}
        response = self.client.post(self.list_url, body, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('waypoints', response.data)


class SharedRouteApiTests(TestCase):
    def setUp(self) -> None:
        self.author = User.objects.create_user('rider', email='rider@example.com', password='pw')
        self.route = Route.objects.create(
            name='Sunday loop', description='Easy ride', points=EQUATOR_STRAIGHT_LINE, author=self.author,
        )
        self.client = APIClient()
        self.url = reverse('routes:route_shared', args=[self.route.pk])

    def test_route_id_is_a_uuid(self) -> None:
        self.assertIsInstance(self.route.pk, uuid.UUID)
        self.assertNotEqual(self.route.pk, Route.objects.create(
            name='Other', points=EQUATOR_STRAIGHT_LINE, author=self.author,
        ).pk)

    def test_anyone_can_read_a_route_without_signing_in(self) -> None:
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.route.pk))
        self.assertEqual(response.data['name'], 'Sunday loop')
        self.assertEqual(response.data['points'], EQUATOR_STRAIGHT_LINE)
        self.assertEqual(response.data['author'], 'rider')

    def test_exposes_neither_the_user_id_nor_waypoints(self) -> None:
        response = self.client.get(self.url)
        self.assertNotIn('waypoints', response.data)
        self.assertNotIn('rider@example.com', str(response.data))
        self.assertNotEqual(response.data['author'], self.author.pk)

    def test_an_invalid_token_does_not_block_the_read(self) -> None:
        response = self.client.get(self.url, HTTP_AUTHORIZATION='Bearer expired.token.value')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unknown_route_is_not_found(self) -> None:
        response = self.client.get(reverse('routes:route_shared', args=[uuid.uuid4()]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_is_read_only(self) -> None:
        for method in (self.client.post, self.client.put, self.client.patch, self.client.delete):
            with self.subTest(method=method.__name__):
                response = method(self.url, {'name': 'Hijack'}, format='json')
                self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_the_private_detail_still_needs_the_owner(self) -> None:
        response = self.client.get(reverse('routes:route_detail', args=[self.route.pk]))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
