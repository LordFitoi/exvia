from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models

from apps.clans.validators import validate_social_links
from apps.core.models import TimeStampedModel

GROUP_IMAGE_UPLOAD_DIR = 'clans/'
NOTICE_ATTACHMENT_UPLOAD_DIR = 'clans/notices/'
GROUP_NAME_MAX_LENGTH = 100
TITLE_MAX_LENGTH = 150
EVENT_STATUS_MAX_LENGTH = 16


class EventStatus(models.TextChoices):
    SCHEDULED = 'scheduled', 'Scheduled'
    STARTED = 'started', 'Started'
    MISSED = 'missed', 'Missed'


class ClanGroup(TimeStampedModel):
    """Community group of riders led by a single owner."""

    name = models.CharField(max_length=GROUP_NAME_MAX_LENGTH)
    description = models.TextField()
    group_image = models.ImageField(upload_to=GROUP_IMAGE_UPLOAD_DIR, blank=True)
    owner = models.ForeignKey(User, on_delete=models.PROTECT, related_name='owned_clans')
    users = models.ManyToManyField(User, related_name='clans', blank=True)
    social_links = models.JSONField(default=list, blank=True, validators=[validate_social_links])

    # Reverse relations, created by the ForeignKeys declared on ClanNotice, ScheduledEvent and ClanInvitation.
    notices: 'models.Manager[ClanNotice]'
    events: 'models.Manager[ScheduledEvent]'
    invitations: 'models.Manager[ClanInvitation]'

    def __str__(self) -> str:
        return self.name


class ScheduledEvent(TimeStampedModel):
    """A ride the clan admin scheduled. When `scheduled_at` comes it starts: a route group led by the admin
    opens for the members to join, and they are notified."""

    clan = models.ForeignKey(ClanGroup, on_delete=models.CASCADE, related_name='events')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scheduled_events')
    title = models.CharField(max_length=TITLE_MAX_LENGTH)
    description = models.TextField()
    scheduled_at = models.DateTimeField()
    route = models.ForeignKey(
        'routes.Route', on_delete=models.SET_NULL, null=True, blank=True, related_name='scheduled_events',
        help_text='The route the group rides; empty means free mode.',
    )
    status = models.CharField(
        max_length=EVENT_STATUS_MAX_LENGTH, choices=EventStatus.choices, default=EventStatus.SCHEDULED,
    )
    started_at = models.DateTimeField(null=True, blank=True)
    route_group = models.OneToOneField(
        'routes.RouteGroup', on_delete=models.SET_NULL, null=True, blank=True, related_name='scheduled_event',
        help_text='The group opened when the event started, led by the clan admin.',
    )

    class Meta:
        ordering = ('-scheduled_at', '-id')

    def __str__(self) -> str:
        return self.title


class ClanNotice(TimeStampedModel):
    """Community post or announcement, optionally announcing a scheduled event and carrying one of its author's routes."""

    clan = models.ForeignKey(ClanGroup, on_delete=models.CASCADE, related_name='notices')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='clan_notices')
    title = models.CharField(max_length=TITLE_MAX_LENGTH)
    description = models.TextField()
    attachment = models.ImageField(upload_to=NOTICE_ATTACHMENT_UPLOAD_DIR, blank=True)
    event = models.ForeignKey(
        ScheduledEvent, on_delete=models.SET_NULL, null=True, blank=True, related_name='notices'
    )
    route = models.ForeignKey(
        'routes.Route', on_delete=models.SET_NULL, null=True, blank=True, related_name='clan_notices'
    )

    def clean(self) -> None:
        if self.event_id is None or self.clan_id is None:
            return
        if self.event.clan_id != self.clan_id:
            raise ValidationError({'event': f'Event {self.event} does not belong to clan {self.clan}.'})

    def __str__(self) -> str:
        return self.title


class ClanInvitation(TimeStampedModel):
    """Pending invitation of a user to join a clan; accepting or declining deletes it."""

    clan = models.ForeignKey(ClanGroup, on_delete=models.CASCADE, related_name='invitations')
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_clan_invitations')
    invitee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='clan_invitations')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['clan', 'invitee'], name='unique_clan_invitation'),
        ]

    def __str__(self) -> str:
        return f'{self.invitee} invited to {self.clan}'
