from django.contrib.auth.models import User
from django.test import TestCase

from apps.notifications.models import EventType, NotificationEvent
from apps.routes.models import RouteGroup


class NotificationEventTests(TestCase):
    def setUp(self) -> None:
        self.sender = User.objects.create_user('sender', password='pw')
        self.receiver = User.objects.create_user('receiver', password='pw')
        self.other_receiver = User.objects.create_user('other', password='pw')

    def _create_event(self, event_type: EventType = EventType.SYSTEM, **fields: object) -> NotificationEvent:
        event = NotificationEvent.objects.create(event_type=event_type, **fields)
        event.destinations.add(self.receiver)
        return event

    def test_system_event_has_no_author_or_group(self) -> None:
        event = self._create_event()
        self.assertIsNone(event.author)
        self.assertIsNone(event.route_group)

    def test_one_event_reaches_many_destinations(self) -> None:
        event = self._create_event(EventType.CLAN_INVITATION, author=self.sender)
        event.destinations.add(self.other_receiver)
        self.assertEqual(list(self.sender.sent_notification_events.all()), [event])
        self.assertEqual(list(self.receiver.notification_events.all()), [event])
        self.assertEqual(list(self.other_receiver.notification_events.all()), [event])

    def test_deleting_a_destination_keeps_the_event_for_the_others(self) -> None:
        event = self._create_event()
        event.destinations.add(self.other_receiver)
        self.receiver.delete()
        self.assertEqual(list(event.destinations.all()), [self.other_receiver])

    def test_deleting_the_author_deletes_the_event(self) -> None:
        self._create_event(author=self.sender)
        self.sender.delete()
        self.assertEqual(NotificationEvent.objects.count(), 0)

    def test_deleting_the_group_deletes_its_invitations(self) -> None:
        group = RouteGroup.objects.create(author=self.sender)
        self._create_event(EventType.ROUTE_INVITATION, author=self.sender, route_group=group)
        group.delete()
        self.assertEqual(NotificationEvent.objects.count(), 0)

    def test_events_are_listed_newest_first(self) -> None:
        first = self._create_event()
        second = self._create_event()
        self.assertEqual(list(NotificationEvent.objects.all()), [second, first])
