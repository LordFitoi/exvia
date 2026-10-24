from django.contrib.auth.models import User
from django.db import models

from apps.core.models import TimeStampedModel
from apps.routes.models import RouteGroup

ANSWER_STATUS_MAX_LENGTH = 16
EVENT_TYPE_MAX_LENGTH = 32


class EventType(models.TextChoices):
    ROUTE_INVITATION = 'route_invitation', 'Route invitation'
    CLAN_INVITATION = 'clan_invitation', 'Clan invitation'
    EVENT_STARTED = 'event_started', 'Scheduled event started'
    SYSTEM = 'system', 'System'


class AnswerStatus(models.TextChoices):
    ACCEPTED = 'accepted', 'Accepted'
    REJECTED = 'rejected', 'Rejected'
    EXPIRED = 'expired', 'Expired'


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
        help_text='The group this event is about, for route invitations and started events.',
    )
    scheduled_event = models.ForeignKey(
        'clans.ScheduledEvent', on_delete=models.CASCADE, null=True, blank=True, related_name='notification_events',
        help_text='The clan event that started, for started events.',
    )

    class Meta:
        ordering = ('-created_at',)

    def __str__(self) -> str:
        return f'{self.get_event_type_display()} ({self.created_at:%Y-%m-%d %H:%M})'


class InvitationAnswer(TimeStampedModel):
    """What one destination answered to one invitation event, or `expired` when the rider accepted another
    invitation first. An event with no answer from a user is still waiting, timed out, or was replaced by a
    newer invitation to the same group. Once recorded it never changes, so an old invitation stays closed
    when the same rider is invited again."""

    event = models.ForeignKey(NotificationEvent, on_delete=models.CASCADE, related_name='answers')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invitation_answers')
    status = models.CharField(max_length=ANSWER_STATUS_MAX_LENGTH, choices=AnswerStatus.choices)

    class Meta:
        ordering = ('-created_at',)
        constraints = [models.UniqueConstraint(fields=('event', 'user'), name='one_answer_per_event_and_user')]

    def __str__(self) -> str:
        return f'{self.user} {self.status} event {self.event_id}'
