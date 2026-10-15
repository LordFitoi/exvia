from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models

from apps.clans.validators import validate_social_links
from apps.core.models import TimeStampedModel

GROUP_IMAGE_UPLOAD_DIR = 'clans/'
NOTICE_ATTACHMENT_UPLOAD_DIR = 'clans/notices/'
GROUP_NAME_MAX_LENGTH = 100
TITLE_MAX_LENGTH = 150
MEET_AT_MAX_LENGTH = 255
EVENT_TYPE_MAX_LENGTH = 16


class EventType(models.TextChoices):
    WEEKLY = 'weekly', 'Weekly'
    UNIQUE = 'unique', 'Unique'


class ClanGroup(TimeStampedModel):
    """Community group of riders led by a single owner."""

    name = models.CharField(max_length=GROUP_NAME_MAX_LENGTH)
    description = models.TextField()
    group_image = models.ImageField(upload_to=GROUP_IMAGE_UPLOAD_DIR, blank=True)
    owner = models.ForeignKey(User, on_delete=models.PROTECT, related_name='owned_clans')
    users = models.ManyToManyField(User, related_name='clans', blank=True)
    social_links = models.JSONField(default=list, blank=True, validators=[validate_social_links])

    # Reverse relations, created by the ForeignKeys declared on ClanNotice, ClanRide and ClanInvitation.
    notices: 'models.Manager[ClanNotice]'
    rides: 'models.Manager[ClanRide]'
    invitations: 'models.Manager[ClanInvitation]'

    def __str__(self) -> str:
        return self.name


class ClanRide(TimeStampedModel):
    """Ride event organised by a clan."""

    clan = models.ForeignKey(ClanGroup, on_delete=models.CASCADE, related_name='rides')
    title = models.CharField(max_length=TITLE_MAX_LENGTH)
    description = models.TextField()
    schedule_at = models.DateTimeField()
    event_type = models.CharField(max_length=EVENT_TYPE_MAX_LENGTH, choices=EventType.choices)
    meet_at = models.CharField(max_length=MEET_AT_MAX_LENGTH)

    def __str__(self) -> str:
        return self.title


class ClanNotice(TimeStampedModel):
    """Community post or announcement, optionally tied to a ride."""

    clan = models.ForeignKey(ClanGroup, on_delete=models.CASCADE, related_name='notices')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='clan_notices')
    title = models.CharField(max_length=TITLE_MAX_LENGTH)
    description = models.TextField()
    attachment = models.ImageField(upload_to=NOTICE_ATTACHMENT_UPLOAD_DIR, blank=True)
    ride = models.ForeignKey(
        ClanRide, on_delete=models.SET_NULL, null=True, blank=True, related_name='notices'
    )

    def clean(self) -> None:
        if self.ride_id is None or self.clan_id is None:
            return
        if self.ride.clan_id != self.clan_id:
            raise ValidationError({'ride': f'Ride {self.ride} does not belong to clan {self.clan}.'})

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
