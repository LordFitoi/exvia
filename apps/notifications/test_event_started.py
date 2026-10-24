from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.clans.event_service import join_event, start_event
from apps.clans.models import ClanGroup, ScheduledEvent
from apps.notifications.live import build_notification
from apps.notifications.models import NotificationEvent
from apps.routes.group_service import RESUME_WINDOW
from apps.routes.models import RouteGroup

LIST_URL = reverse('notifications:notification_list')


class EventStartedNotificationTests(TestCase):
    def setUp(self) -> None:
        self.admin = User.objects.create_user('admin', password='pw')
        self.rider = User.objects.create_user('rider', password='pw')
        self.clan = ClanGroup.objects.create(name='Night Riders', description='Night.', owner=self.admin)
        self.clan.users.add(self.admin, self.rider)
        self.event = ScheduledEvent.objects.create(
            clan=self.clan, created_by=self.admin, title='Sunday ride', description='Coast.', scheduled_at=timezone.now(),
        )
        start_event(self.event, timezone.now())

    def _listed(self, user: User) -> list[dict[str, object]]:
        client = APIClient()
        client.force_authenticate(user)
        return client.get(LIST_URL).data

    def test_the_member_is_told_which_ride_started_and_can_join_it(self) -> None:
        with self.assertNumQueries(1):
            notifications = self._listed(self.rider)

        self.assertEqual(len(notifications), 1)
        self.assertEqual(notifications[0]['event_type'], 'event_started')
        self.assertEqual(notifications[0]['route_group'], self.event.route_group_id)
        self.assertEqual(
            (notifications[0]['scheduled_event'], notifications[0]['event_title'], notifications[0]['clan_name']),
            (self.event.pk, 'Sunday ride', 'Night Riders'),
        )
        self.assertEqual(notifications[0]['status'], 'open')

    def test_the_admin_who_leads_the_ride_is_not_notified(self) -> None:
        self.assertEqual(self._listed(self.admin), [])

    def test_status_is_joined_after_joining(self) -> None:
        join_event(self.event, self.rider, timezone.now())

        self.assertEqual(self._listed(self.rider)[0]['status'], 'joined')

    def test_status_is_ended_once_the_group_has_ended(self) -> None:
        RouteGroup.objects.filter(pk=self.event.route_group_id).update(
            updated_at=timezone.now() - RESUME_WINDOW - timedelta(minutes=1),
        )

        self.assertEqual(self._listed(self.rider)[0]['status'], 'ended')

    def test_the_live_notification_names_the_ride(self) -> None:
        notification = build_notification(NotificationEvent.objects.get())

        self.assertEqual(notification['title'], 'Ride started')
        self.assertEqual(notification['body'], 'Sunday ride has started. Join the ride!')
