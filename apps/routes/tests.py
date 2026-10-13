from datetime import timedelta

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import SimpleTestCase, TestCase

from apps.routes.geometry import calculate_distance_km, calculate_estimated_time
from apps.routes.models import DESCRIPTION_MAX_LENGTH, Route
from apps.routes.validators import validate_points

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
