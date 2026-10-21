from datetime import datetime, timedelta, timezone

from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.routes.models import Route, RouteSummary

EQUATOR_STRAIGHT_LINE = [[0, 0], [0, 1]]


class RouteSummaryModelTests(TestCase):
    def setUp(self) -> None:
        self.rider = User.objects.create_user('rider', password='pw')
        self.route = Route.objects.create(
            name='Loop', points=EQUATOR_STRAIGHT_LINE, author=self.rider,
        )
        self.start_at = datetime(2026, 10, 15, 9, 0, tzinfo=timezone.utc)

    def _create_summary(self, ride_time: timedelta = timedelta(minutes=45)) -> RouteSummary:
        return RouteSummary.objects.create(
            route=self.route, author=self.rider,
            start_at=self.start_at, end_at=self.start_at + ride_time,
        )

    def test_save_calculates_duration(self) -> None:
        summary = self._create_summary()
        summary.refresh_from_db()
        self.assertEqual(summary.duration, timedelta(minutes=45))

    def test_update_fields_with_end_at_persists_duration(self) -> None:
        summary = self._create_summary()
        summary.end_at = self.start_at + timedelta(hours=2)
        summary.save(update_fields=['end_at'])
        summary.refresh_from_db()
        self.assertEqual(summary.duration, timedelta(hours=2))

    def test_rejects_end_before_start(self) -> None:
        with self.assertRaises(IntegrityError), transaction.atomic():
            self._create_summary(ride_time=timedelta(minutes=-5))

    def test_holds_many_participants(self) -> None:
        friend = User.objects.create_user('friend', password='pw')
        summary = self._create_summary()
        summary.participants.set([self.rider, friend])
        self.assertCountEqual(self.rider.route_summaries.all(), [summary])
        self.assertEqual(summary.participants.count(), 2)

    def test_deleting_route_deletes_summaries(self) -> None:
        self._create_summary()
        self.route.delete()
        self.assertFalse(RouteSummary.objects.exists())


class RideSummaryApiTests(TestCase):
    START_AT = '2026-10-15T09:00:00Z'
    END_AT = '2026-10-15T09:45:00Z'

    def setUp(self) -> None:
        self.rider = User.objects.create_user('rider', password='pw')
        self.other = User.objects.create_user('other', password='pw')
        self.route = Route.objects.create(name='Loop', points=EQUATOR_STRAIGHT_LINE, author=self.rider)
        self.client = APIClient()
        self.client.force_authenticate(self.rider)
        self.url = reverse('routes:ride_summary_create', args=[self.route.pk])
        self.body = {'start_at': self.START_AT, 'end_at': self.END_AT}

    def test_requires_authentication(self) -> None:
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(self.url, self.body).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_saves_summary_with_caller_as_author_and_participant(self) -> None:
        response = self.client.post(self.url, self.body)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        summary = RouteSummary.objects.get()
        self.assertEqual((summary.route, summary.author), (self.route, self.rider))
        self.assertEqual(list(summary.participants.all()), [self.rider])
        self.assertEqual(response.data['duration'], 45 * 60)
        self.assertEqual(response.data['participants'], [{'id': self.rider.pk, 'username': 'rider'}])

    def test_ignores_author_and_participants_sent_by_the_client(self) -> None:
        self.client.post(self.url, {**self.body, 'author': self.other.pk, 'participants': [self.other.pk]})
        summary = RouteSummary.objects.get()
        self.assertEqual(summary.author, self.rider)
        self.assertEqual(list(summary.participants.all()), [self.rider])

    def test_rejects_end_not_after_start(self) -> None:
        for end_at in (self.START_AT, '2026-10-15T08:00:00Z'):
            with self.subTest(end_at=end_at):
                response = self.client.post(self.url, {'start_at': self.START_AT, 'end_at': end_at})
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn('end_at', response.data)
        self.assertFalse(RouteSummary.objects.exists())

    def test_requires_both_times(self) -> None:
        response = self.client.post(self.url, {'start_at': self.START_AT})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('end_at', response.data)

    def test_other_users_route_is_not_found(self) -> None:
        self.client.force_authenticate(self.other)
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(RouteSummary.objects.exists())

    def test_saves_the_top_speed_and_accepts_its_absence(self) -> None:
        self.client.post(self.url, {**self.body, 'max_speed': 31.5}, format='json')
        saved = RouteSummary.objects.get()
        self.assertEqual(saved.max_speed, 31.5)
        self.client.post(self.url, self.body, format='json')
        self.assertIsNone(RouteSummary.objects.exclude(pk=saved.pk).get().max_speed)

    def test_saves_a_ride_quit_before_the_finish(self) -> None:
        response = self.client.post(self.url, {**self.body, 'is_finished': False}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(RouteSummary.objects.get().is_finished)
        self.assertFalse(response.data['is_finished'])

    def test_rejects_negative_speed(self) -> None:
        response = self.client.post(self.url, {**self.body, 'max_speed': -1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('max_speed', response.data)


class RideHistoryApiTests(TestCase):
    def setUp(self) -> None:
        self.rider = User.objects.create_user('rider', password='pw')
        self.friend = User.objects.create_user('friend', password='pw')
        self.stranger = User.objects.create_user('stranger', password='pw')
        self.route = Route.objects.create(name='Loop', points=EQUATOR_STRAIGHT_LINE, author=self.rider)
        self.client = APIClient()
        self.client.force_authenticate(self.rider)

    def _create_summary(self, riders: list[User], day: int = 15) -> RouteSummary:
        start_at = datetime(2026, 10, day, 9, 0, tzinfo=timezone.utc)
        summary = RouteSummary.objects.create(
            route=self.route, author=riders[0], start_at=start_at,
            end_at=start_at + timedelta(minutes=30), max_speed=20.0,
        )
        summary.participants.set(riders)
        return summary

    def test_requires_authentication(self) -> None:
        self.client.force_authenticate(None)
        url = reverse('routes:ride_summary_list')
        self.assertEqual(self.client.get(url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_lists_own_rides_by_creation_time_newest_first(self) -> None:
        first = self._create_summary([self.rider], day=20)
        second = self._create_summary([self.rider], day=10)
        self._create_summary([self.stranger])
        response = self.client.get(reverse('routes:ride_summary_list'))
        self.assertEqual([row['id'] for row in response.data], [second.pk, first.pk])
        self.assertEqual(response.data[0]['route_name'], 'Loop')
        self.assertNotIn('participants', response.data[0])

    def test_lists_rides_the_caller_only_took_part_in(self) -> None:
        summary = self._create_summary([self.friend, self.rider])
        response = self.client.get(reverse('routes:ride_summary_list'))
        self.assertEqual([row['id'] for row in response.data], [summary.pk])

    def test_detail_has_participants_route_and_speeds(self) -> None:
        summary = self._create_summary([self.rider, self.friend])
        response = self.client.get(reverse('routes:ride_summary_detail', args=[summary.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertCountEqual(
            [rider['username'] for rider in response.data['participants']], ['rider', 'friend'],
        )
        self.assertEqual(response.data['duration'], 30 * 60)
        self.assertEqual(response.data['route'], self.route.pk)
        self.assertEqual(response.data['estimated_time'], round(self.route.estimated_time.total_seconds()))
        self.assertEqual(response.data['max_speed'], 20.0)
        self.assertNotIn('min_speed', response.data)
        self.assertNotIn('avg_speed', response.data)

    def test_detail_of_a_ride_the_caller_did_not_take_is_not_found(self) -> None:
        summary = self._create_summary([self.stranger])
        response = self.client.get(reverse('routes:ride_summary_detail', args=[summary.pk]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_summary_is_finished_unless_the_client_says_otherwise(self) -> None:
        summary = self._create_summary([self.rider])
        self.assertTrue(summary.is_finished)
        response = self.client.get(reverse('routes:ride_summary_detail', args=[summary.pk]))
        self.assertTrue(response.data['is_finished'])

    def test_author_deletes_a_ride_for_everyone(self) -> None:
        summary = self._create_summary([self.rider, self.friend])
        response = self.client.delete(reverse('routes:ride_summary_detail', args=[summary.pk]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(RouteSummary.objects.exists())
        self.assertEqual(Route.objects.count(), 1)

    def test_participant_who_is_not_the_author_cannot_delete(self) -> None:
        summary = self._create_summary([self.friend, self.rider])
        url = reverse('routes:ride_summary_detail', args=[summary.pk])
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)

    def test_cannot_delete_a_ride_of_a_stranger(self) -> None:
        summary = self._create_summary([self.stranger])
        response = self.client.delete(reverse('routes:ride_summary_detail', args=[summary.pk]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(RouteSummary.objects.exists())

    def test_delete_requires_authentication(self) -> None:
        summary = self._create_summary([self.rider])
        self.client.force_authenticate(None)
        response = self.client.delete(reverse('routes:ride_summary_detail', args=[summary.pk]))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
