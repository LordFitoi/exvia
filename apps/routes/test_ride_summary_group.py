from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.routes import group_meta
from apps.routes.group_meta import ParticipantStatus
from apps.routes.group_service import CONNECTED_WINDOW, answer_invitation, create_group
from apps.routes.models import Route, RouteSummary

EQUATOR_STRAIGHT_LINE = [[0, 0], [0, 1]]
POSITION = {'lng': 0, 'lat': 0}


class RideSummaryGroupTests(TestCase):
    """A ride saved from a group lists the riders connected at that moment as its participants."""

    def setUp(self) -> None:
        self.owner = User.objects.create_user('owner', password='pw')
        self.ana = User.objects.create_user('ana', password='pw')
        self.ben = User.objects.create_user('ben', password='pw')
        self.cleo = User.objects.create_user('cleo', password='pw')
        self.route = Route.objects.create(name='Loop', points=EQUATOR_STRAIGHT_LINE, author=self.owner)
        self.group = create_group(self.owner, self.route, [self.ana, self.ben, self.cleo])
        for rider in (self.ana, self.ben):
            answer_invitation(self.group, rider, ParticipantStatus.ACCEPTED)
        self.url = reverse('routes:ride_summary_create', args=[self.route.pk])
        self.body = {'start_at': '2026-10-15T09:00:00Z', 'end_at': '2026-10-15T09:45:00Z', 'group': str(self.group.pk)}

    def _report(self, rider: User, age: timedelta = timedelta()) -> None:
        position = group_meta.clean_position(POSITION, timezone.now() - age)
        group_meta.set_position(self.group.meta_json, rider.pk, position)
        self.group.save()

    def _save_as(self, user: User, body: dict[str, str] | None = None):
        client = APIClient()
        client.force_authenticate(user)
        return client.post(self.url, body or self.body, format='json')

    def _participants(self) -> set[str]:
        return {rider.username for rider in RouteSummary.objects.get().participants.all()}

    def test_lists_the_riders_connected_at_that_moment(self) -> None:
        for rider in (self.owner, self.ana, self.ben):
            self._report(rider)
        self.assertEqual(self._save_as(self.owner).status_code, status.HTTP_201_CREATED)
        self.assertEqual(self._participants(), {'owner', 'ana', 'ben'})

    def test_leaves_out_riders_who_stopped_reporting(self) -> None:
        self._report(self.owner)
        self._report(self.ana)
        self._report(self.ben, age=CONNECTED_WINDOW + timedelta(seconds=1))
        self._save_as(self.owner)
        self.assertEqual(self._participants(), {'owner', 'ana'})

    def test_leaves_out_invited_riders_and_riders_who_never_reported(self) -> None:
        self._report(self.owner)
        self._save_as(self.owner)
        self.assertEqual(self._participants(), {'owner'})

    def test_the_caller_is_a_participant_even_without_a_recent_position(self) -> None:
        self._report(self.ana)
        self._save_as(self.owner)
        self.assertEqual(self._participants(), {'owner', 'ana'})

    def test_the_answer_lists_the_participants_and_hides_the_group(self) -> None:
        self._report(self.ana)
        data = self._save_as(self.owner).data
        self.assertCountEqual([rider['username'] for rider in data['participants']], ['owner', 'ana'])
        self.assertNotIn('group', data)

    def test_a_rider_who_is_not_riding_in_the_group_is_refused(self) -> None:
        response = self._save_as(self.cleo)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(RouteSummary.objects.exists())

    def test_a_group_the_caller_has_not_accepted_is_refused(self) -> None:
        other_route = Route.objects.create(name='Other', points=EQUATOR_STRAIGHT_LINE, author=self.cleo)
        url = reverse('routes:ride_summary_create', args=[other_route.pk])
        client = APIClient()
        client.force_authenticate(self.cleo)
        response = client.post(url, self.body, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('group', response.data)

    def test_a_group_on_another_route_adds_nobody(self) -> None:
        self._report(self.ana)
        self.group.route = Route.objects.create(name='Other', points=EQUATOR_STRAIGHT_LINE, author=self.owner)
        self.group.save()
        self._save_as(self.owner)
        self.assertEqual(self._participants(), {'owner'})

    def test_without_a_group_only_the_caller_is_a_participant(self) -> None:
        self._report(self.ana)
        self._save_as(self.owner, {key: value for key, value in self.body.items() if key != 'group'})
        self.assertEqual(self._participants(), {'owner'})
