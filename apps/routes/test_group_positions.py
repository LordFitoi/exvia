from concurrent.futures import ThreadPoolExecutor

from django.contrib.auth.models import User
from django.db import connection
from django.test import TransactionTestCase

from apps.routes import group_meta
from apps.routes.group_meta import ParticipantStatus
from apps.routes.group_service import answer_invitation, create_group, load_positions, save_position
from apps.routes.models import RouteGroup

REPORTS_PER_RIDER = 25


class SavePositionTests(TransactionTestCase):
    def setUp(self) -> None:
        self.owner = User.objects.create_user('owner', password='pw')
        self.ana = User.objects.create_user('ana', password='pw')
        self.ben = User.objects.create_user('ben', password='pw')
        self.group = create_group(self.owner, None, [self.ana, self.ben])
        answer_invitation(self.group, self.ana, ParticipantStatus.ACCEPTED)

    def _report(self, user: User, count: int) -> None:
        try:
            for step in range(count):
                position = group_meta.clean_position({'lng': step, 'lat': 0}, self.group.created_at)
                save_position(self.group.pk, user.pk, position)
        finally:
            connection.close()

    def test_riders_reporting_at_the_same_time_keep_their_last_position(self) -> None:
        with ThreadPoolExecutor() as pool:
            jobs = [pool.submit(self._report, user, REPORTS_PER_RIDER) for user in (self.owner, self.ana)]
            for job in jobs:
                job.result()
        positions = load_positions(self.group.pk, self.owner.pk)
        last_step = REPORTS_PER_RIDER - 1
        self.assertEqual({user_id: position['lng'] for user_id, position in positions.items()},
                         {str(self.owner.pk): last_step, str(self.ana.pk): last_step})

    def test_a_rider_who_has_not_accepted_cannot_save_or_read(self) -> None:
        position = group_meta.clean_position({'lng': 1, 'lat': 1}, self.group.created_at)
        self.assertFalse(save_position(self.group.pk, self.ben.pk, position))
        self.assertIsNone(load_positions(self.group.pk, self.ben.pk))
        saved = RouteGroup.objects.get(pk=self.group.pk).meta_json['participants'][str(self.ben.pk)]
        self.assertIsNone(saved['position'])

    def test_an_unknown_group_is_refused(self) -> None:
        self.assertIsNone(load_positions('11111111-1111-1111-1111-111111111111', self.owner.pk))
