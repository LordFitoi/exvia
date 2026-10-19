from django.contrib.auth.models import User
from django.db import models

from apps.core.models import TimeStampedModel
from apps.routes.models import RouteGroup

EVENT_TYPE_MAX_LENGTH = 32


class EventType(models.TextChoices):
    ROUTE_INVITATION = 'route_invitation', 'Route invitation'
    CLAN_INVITATION = 'clan_invitation', 'Clan invitation'
    SYSTEM = 'system', 'System'


class NotificationEvent(TimeStampedModel):
    """Something that happened and a user should hear about; the author is empty for system events."""

    event_type = models.CharField(max_length=EVENT_TYPE_MAX_LENGTH, choices=EventType.choices)
    author = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True, related_name='sent_notification_events',
        help_text='Who triggered the event; empty for system events.',
    )
    destinations = models.ManyToManyField(
        User, related_name='notification_events', help_text='Everyone who receives this notification.',
    )
    route_group = models.ForeignKey(
        RouteGroup, on_delete=models.CASCADE, null=True, blank=True, related_name='notification_events',
        help_text='The group this event is about, for route invitations.',
    )

    class Meta:
        ordering = ('-created_at',)

    def __str__(self) -> str:
        return f'{self.get_event_type_display()} ({self.created_at:%Y-%m-%d %H:%M})'
