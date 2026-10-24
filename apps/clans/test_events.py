from datetime import timedelta
from io import StringIO

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.clans.event_service import START_GRACE, start_due_events
from apps.clans.models import ClanNotice, EventStatus, ScheduledEvent
from apps.clans.test_api import PASSWORD, ROUTE_POINTS, ClanApiTestCase
from apps.notifications.models import EventType, NotificationEvent
from apps.routes import group_meta
from apps.routes.group_meta import ParticipantStatus
from apps.routes.group_service import RESUME_WINDOW
from apps.routes.models import MAX_GROUP_PARTICIPANTS, Route, RouteGroup


class EventApiTestCase(ClanApiTestCase):
    """`self.member` owns the clan, so they are its admin; `self.rider` is another member."""

    def setUp(self) -> None:
        super().setUp()
        self.rider = User.objects.create_user('rider', password=PASSWORD)
        self.clan.users.add(self.rider)
        self.url = reverse('clans:clan_event_list', args=[self.clan.pk])

    def schedule(self, **fields: object):
        payload = {
            'title': 'Sunday ride', 'description': 'Coast road.',
            'scheduled_at': (timezone.now() + timedelta(days=1)).isoformat(), **fields,
        }
        return self.client.post(self.url, {key: value for key, value in payload.items() if value is not None}, format='json')

    def create_event(self, **fields: object) -> ScheduledEvent:
        values = {
            'clan': self.clan, 'created_by': self.member, 'title': 'Sunday ride', 'description': 'Coast road.',
            'scheduled_at': timezone.now() - timedelta(minutes=1), **fields,
        }
        return ScheduledEvent.objects.create(**values)

    def start_event(self, **fields: object) -> ScheduledEvent:
        """An event whose time has come, started by the command."""
        event = self.create_event(**fields)
        start_due_events(timezone.now())
        event.refresh_from_db()
        return event

    def join_url(self, event: ScheduledEvent) -> str:
        return reverse('clans:clan_event_join', args=[event.pk])


class EventSchedulingTests(EventApiTestCase):
    def test_admin_schedules_an_event_and_a_notice_announces_it(self) -> None:
        response = self.schedule()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual((response.data['status'], response.data['state']), ('scheduled', 'upcoming'))
        self.assertIsNone(response.data['route_group'])
        notice = ClanNotice.objects.get(event_id=response.data['id'])
        self.assertEqual((notice.clan, notice.author, notice.title), (self.clan, self.member, 'Sunday ride'))
        self.assertFalse(NotificationEvent.objects.exists())

    def test_notices_carry_their_event(self) -> None:
        event_id = self.schedule().data['id']

        notices = self.client.get(reverse('clans:clan_notice_list', args=[self.clan.pk])).data

        self.assertEqual(notices[0]['event']['id'], event_id)

    def test_needs_a_future_time(self) -> None:
        past = self.schedule(scheduled_at=(timezone.now() - timedelta(minutes=5)).isoformat())
        missing = self.schedule(scheduled_at=None)

        self.assertEqual(past.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(past.data), {'scheduled_at'})
        self.assertEqual(set(missing.data), {'scheduled_at'})
        self.assertFalse(ScheduledEvent.objects.exists())

    def test_cannot_attach_a_route_of_someone_else(self) -> None:
        route = Route.objects.create(name='Theirs', points=ROUTE_POINTS, author=self.rider)

        response = self.schedule(route_id=str(route.pk))

        self.assertEqual(set(response.data), {'route_id'})

    def test_only_the_admin_schedules(self) -> None:
        self.client.force_authenticate(self.rider)

        response = self.schedule()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(ScheduledEvent.objects.exists())

    def test_non_member_can_neither_read_nor_schedule(self) -> None:
        self.client.force_authenticate(self.outsider)

        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.schedule().status_code, status.HTTP_404_NOT_FOUND)

    def test_the_home_feed_leaves_out_the_notices_of_events(self) -> None:
        self.schedule()
        ClanNotice.objects.create(clan=self.clan, author=self.member, title='Plain', description='Hi.')

        feed = self.client.get(reverse('clans:feed_notice_list'))

        self.assertEqual([notice['title'] for notice in feed.data], ['Plain'])

    def test_members_list_the_events_latest_first(self) -> None:
        self.create_event(title='Earlier', scheduled_at=timezone.now() - timedelta(days=3))
        self.create_event(title='Later', scheduled_at=timezone.now() + timedelta(days=3))
        self.client.force_authenticate(self.rider)

        response = self.client.get(self.url)

        self.assertEqual([event['title'] for event in response.data], ['Later', 'Earlier'])
        self.assertFalse(response.data[0]['is_joined'])


class StartDueEventsTests(EventApiTestCase):
    def test_starts_the_events_whose_time_has_come_only(self) -> None:
        due = self.create_event()
        later = self.create_event(scheduled_at=timezone.now() + timedelta(hours=1))

        started = start_due_events(timezone.now())

        due.refresh_from_db()
        later.refresh_from_db()
        self.assertEqual(started, 1)
        self.assertEqual((due.status, later.status), (EventStatus.STARTED, EventStatus.SCHEDULED))
        self.assertEqual(due.route_group.author, self.member)
        self.assertIsNotNone(due.started_at)
        self.assertEqual(NotificationEvent.objects.get().scheduled_event, due)

    def test_the_group_is_led_by_the_admin_and_the_members_are_notified(self) -> None:
        event = self.start_event()

        group = event.route_group
        self.assertEqual(group.author, self.member)
        self.assertEqual(group_meta.get_status(group.meta_json, self.member.pk), ParticipantStatus.ACCEPTED)
        notification = NotificationEvent.objects.get()
        self.assertEqual((notification.event_type, notification.author), (EventType.EVENT_STARTED, self.member))
        self.assertEqual(list(notification.destinations.all()), [self.rider])

    def test_the_group_rides_the_route_of_the_event(self) -> None:
        route = Route.objects.create(name='Coast', points=ROUTE_POINTS, author=self.member)

        event = self.start_event(route=route)

        self.assertEqual(event.route_group.route, route)

    def test_does_not_start_an_event_twice(self) -> None:
        self.create_event()

        first = start_due_events(timezone.now())
        second = start_due_events(timezone.now())

        self.assertEqual((first, second), (1, 0))
        self.assertEqual(RouteGroup.objects.count(), 1)
        self.assertEqual(NotificationEvent.objects.count(), 1)

    def test_marks_an_event_found_long_after_its_time_as_missed(self) -> None:
        event = self.create_event(scheduled_at=timezone.now() - START_GRACE - timedelta(minutes=1))

        started = start_due_events(timezone.now())

        event.refresh_from_db()
        self.assertEqual((started, event.status), (0, EventStatus.MISSED))
        self.assertIsNone(event.route_group)
        self.assertFalse(NotificationEvent.objects.exists())

    def test_the_command_starts_due_events(self) -> None:
        event = self.create_event()

        call_command('start_scheduled_events', stdout=StringIO())

        event.refresh_from_db()
        self.assertEqual(event.status, EventStatus.STARTED)


class EventJoinTests(EventApiTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.event = self.start_event()
        self.client.force_authenticate(self.rider)

    def statuses(self) -> dict[str, str | None]:
        group = RouteGroup.objects.get(pk=self.event.route_group_id)
        return {rider.username: group_meta.get_status(group.meta_json, rider.pk) for rider in group.participants.all()}

    def test_a_member_joins_the_group_as_a_rider(self) -> None:
        response = self.client.post(self.join_url(self.event))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.event.route_group_id))
        self.assertEqual(self.statuses(), {'member': 'accepted', 'rider': 'accepted'})
        listed = self.client.get(self.url).data
        self.assertTrue(listed[0]['is_joined'])

    def test_joining_twice_changes_nothing(self) -> None:
        self.client.post(self.join_url(self.event))

        response = self.client.post(self.join_url(self.event))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(RouteGroup.objects.get().participants.count(), 2)

    def test_an_upcoming_event_cannot_be_joined(self) -> None:
        event = self.create_event(scheduled_at=timezone.now() + timedelta(days=1))

        response = self.client.post(self.join_url(event))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_an_ended_ride_cannot_be_joined(self) -> None:
        RouteGroup.objects.filter(pk=self.event.route_group_id).update(
            updated_at=timezone.now() - RESUME_WINDOW - timedelta(minutes=1),
        )

        response = self.client.post(self.join_url(self.event))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.statuses(), {'member': 'accepted'})

    def test_a_full_group_cannot_be_joined(self) -> None:
        group = RouteGroup.objects.get(pk=self.event.route_group_id)
        for number in range(MAX_GROUP_PARTICIPANTS - 1):
            group.participants.add(User.objects.create_user(f'filler{number}', password=PASSWORD))

        response = self.client.post(self.join_url(self.event))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('rider', self.statuses())

    def test_a_non_member_gets_404(self) -> None:
        self.client.force_authenticate(self.outsider)

        response = self.client.post(self.join_url(self.event))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class NextEventTests(EventApiTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.url = reverse('clans:next_clan_event')

    def next_title(self) -> str | None:
        response = self.client.get(self.url)
        return response.data['title'] if response.status_code == status.HTTP_200_OK else None

    def test_no_events_is_204(self) -> None:
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_204_NO_CONTENT)

    def test_is_the_soonest_upcoming_event_with_its_clan(self) -> None:
        self.create_event(title='Later', scheduled_at=timezone.now() + timedelta(days=3))
        self.create_event(title='Sooner', scheduled_at=timezone.now() + timedelta(days=1))

        response = self.client.get(self.url)

        self.assertEqual((response.data['title'], response.data['clan_name']), ('Sooner', 'Night Riders'))

    def test_a_live_ride_comes_before_the_upcoming_ones(self) -> None:
        self.create_event(title='Upcoming', scheduled_at=timezone.now() + timedelta(days=1))
        self.start_event(title='Live')

        response = self.client.get(self.url)

        self.assertEqual((response.data['title'], response.data['state']), ('Live', 'live'))

    def test_an_ended_or_missed_ride_is_skipped(self) -> None:
        ended = self.start_event(title='Ended')
        RouteGroup.objects.filter(pk=ended.route_group_id).update(
            updated_at=timezone.now() - RESUME_WINDOW - timedelta(minutes=1),
        )
        self.create_event(title='Missed', status=EventStatus.MISSED)

        self.assertIsNone(self.next_title())

    def test_only_events_of_the_callers_clans(self) -> None:
        self.client.force_authenticate(self.outsider)
        self.create_event()

        self.assertIsNone(self.next_title())
