from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import transaction
from django.test import TestCase

from apps.routes import group_meta
from apps.routes.group_meta import ParticipantStatus
from apps.routes.models import MAX_GROUP_PARTICIPANTS, Route, RouteGroup

EQUATOR_STRAIGHT_LINE = [[0, 0], [0, 1]]


class RouteGroupTests(TestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user('owner', password='pw')
        self.riders = [
            User.objects.create_user(f'rider{n}', password='pw') for n in range(MAX_GROUP_PARTICIPANTS + 1)
        ]
        self.group = RouteGroup.objects.create(author=self.owner)

    def test_defaults_to_free_mode_with_uuid_and_empty_meta(self) -> None:
        self.assertIsNone(self.group.route)
        self.assertEqual(self.group.meta_json, {})
        self.assertEqual(len(str(self.group.id)), 36)

    def test_deleting_route_keeps_group_in_free_mode(self) -> None:
        route = Route.objects.create(name='Loop', points=EQUATOR_STRAIGHT_LINE, author=self.owner)
        self.group.route = route
        self.group.save()
        route.delete()
        self.group.refresh_from_db()
        self.assertIsNone(self.group.route)

    def test_meta_json_round_trips_and_is_validated(self) -> None:
        group_meta.set_status(self.group.meta_json, self.riders[0].pk, ParticipantStatus.ACCEPTED)
        self.group.full_clean()
        self.group.save()
        self.group.refresh_from_db()
        self.assertEqual(group_meta.get_status(self.group.meta_json, self.riders[0].pk), ParticipantStatus.ACCEPTED)

    def test_full_clean_refuses_a_malformed_meta_json(self) -> None:
        self.group.meta_json = {'participants': {'1': {'status': 'gone'}}}
        with self.assertRaises(ValidationError):
            self.group.full_clean()

    def test_accepts_exactly_the_maximum(self) -> None:
        self.group.participants.add(*self.riders[:MAX_GROUP_PARTICIPANTS])
        self.assertEqual(self.group.participants.count(), MAX_GROUP_PARTICIPANTS)

    def test_refuses_one_over_the_maximum(self) -> None:
        with self.assertRaises(ValidationError), transaction.atomic():
            self.group.participants.add(*self.riders)
        self.assertEqual(self.group.participants.count(), 0)

    def test_refuses_joining_a_full_group_from_the_user_side(self) -> None:
        self.group.participants.add(*self.riders[:MAX_GROUP_PARTICIPANTS])
        with self.assertRaises(ValidationError), transaction.atomic():
            self.riders[-1].route_groups.add(self.group)

    def test_adding_an_existing_participant_to_a_full_group_is_allowed(self) -> None:
        self.group.participants.add(*self.riders[:MAX_GROUP_PARTICIPANTS])
        self.group.participants.add(self.riders[0])
        self.assertEqual(self.group.participants.count(), MAX_GROUP_PARTICIPANTS)
