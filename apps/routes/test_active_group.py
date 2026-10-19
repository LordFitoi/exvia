from datetime import datetime

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APIClient

from apps.routes import group_meta
from apps.routes.group_meta import ParticipantStatus
from apps.routes.group_service import CONNECTED_WINDOW, answer_invitation, create_group, find_active_group
from apps.routes.models import RouteGroup


class ActiveGroupTestCase(TestCase):
    def setUp(self) -> None:
        self.now = timezone.now()
        self.recent = self.now - CONNECTED_WINDOW / 2
        self.stale = self.now - CONNECTED_WINDOW * 2
        self.owner = User.objects.create_user('owner', password='pw')
        self.ana = User.objects.create_user('ana', password='pw')
        self.ben = User.objects.create_user('ben', password='pw')

    def _group_with_accepted(self, *riders: User) -> RouteGroup:
        group = create_group(self.owner, None, list(riders))
        for rider in riders:
            answer_invitation(group, rider, ParticipantStatus.ACCEPTED)
        return group

    def _report(self, group: RouteGroup, user: User, recorded_at: datetime) -> None:
        position = group_meta.clean_position({'lng': 0, 'lat': 0}, recorded_at)
        group_meta.set_position(group.meta_json, user.pk, position)
        group.save(update_fields=['meta_json', 'updated_at'])


class FindActiveGroupTests(ActiveGroupTestCase):
    def _find(self, user: User) -> RouteGroup | None:
        return find_active_group(RouteGroup.objects.all(), user, self.now)

    def test_group_with_another_rider_connected_is_active(self) -> None:
        group = self._group_with_accepted(self.ana)
        self._report(group, self.ana, self.recent)
        self.assertEqual(self._find(self.owner), group)

    def test_own_position_does_not_make_a_group_active(self) -> None:
        group = self._group_with_accepted(self.ana)
        self._report(group, self.owner, self.recent)
        self.assertIsNone(self._find(self.owner))

    def test_group_nobody_reported_in_is_not_active(self) -> None:
        self._group_with_accepted(self.ana)
        self.assertIsNone(self._find(self.owner))

    def test_group_whose_riders_went_quiet_has_ended(self) -> None:
        group = self._group_with_accepted(self.ana)
        self._report(group, self.ana, self.stale)
        self.assertIsNone(self._find(self.owner))

    def test_connected_rider_who_only_has_an_invitation_does_not_count(self) -> None:
        group = create_group(self.owner, None, [self.ana])
        self._report(group, self.ana, self.recent)
        self.assertIsNone(self._find(self.owner))

    def test_user_who_has_not_accepted_gets_no_group(self) -> None:
        group = create_group(self.owner, None, [self.ana, self.ben])
        answer_invitation(group, self.ben, ParticipantStatus.ACCEPTED)
        self._report(group, self.ben, self.recent)
        self.assertIsNone(self._find(self.ana))

    def test_newest_active_group_wins(self) -> None:
        older = self._group_with_accepted(self.ana)
        newer = self._group_with_accepted(self.ana)
        for group in (older, newer):
            self._report(group, self.ana, self.recent)
        self.assertEqual(self._find(self.owner), newer)

    def test_newest_group_that_has_ended_does_not_hide_an_older_active_one(self) -> None:
        older = self._group_with_accepted(self.ana)
        newer = self._group_with_accepted(self.ana)
        self._report(older, self.ana, self.recent)
        self._report(newer, self.ana, self.stale)
        self.assertEqual(self._find(self.owner), older)


class ActiveGroupApiTests(ActiveGroupTestCase):
    def _get(self, user: User) -> Response:
        client = APIClient()
        client.force_authenticate(user)
        return client.get(reverse('routes:group_active'))

    def test_answers_the_active_group(self) -> None:
        group = self._group_with_accepted(self.ana)
        self._report(group, self.ana, self.now)
        response = self._get(self.owner)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(group.id))
        self.assertEqual([rider['username'] for rider in response.data['participants']], ['owner', 'ana'])

    def test_answers_no_content_when_no_group_is_active(self) -> None:
        self._group_with_accepted(self.ana)
        self.assertEqual(self._get(self.owner).status_code, status.HTTP_204_NO_CONTENT)

    def test_a_stranger_gets_no_content(self) -> None:
        group = self._group_with_accepted(self.ana)
        self._report(group, self.ana, self.now)
        self.assertEqual(self._get(self.ben).status_code, status.HTTP_204_NO_CONTENT)

    def test_needs_a_token(self) -> None:
        response = APIClient().get(reverse('routes:group_active'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
