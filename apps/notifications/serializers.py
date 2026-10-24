from django.utils import timezone
from rest_framework import serializers

from apps.notifications.models import AnswerStatus, EventType, NotificationEvent
from apps.notifications.services import is_invitation_expired
from apps.routes import group_meta
from apps.routes.group_meta import ParticipantStatus
from apps.routes.group_service import is_group_active
from apps.users.serializers import UserBriefSerializer

# The caller's status for a started clan event: its group is open to join, they ride in it, or it is over.
OPEN_STATUS = 'open'
JOINED_STATUS = 'joined'
ENDED_STATUS = 'ended'


class NotificationSerializer(serializers.ModelSerializer):
    """A notification as one of its destinations sees it. For a route invitation, `route_group` is
    the group, `route_name` the route (null in free mode) and `status` the caller's answer; all three
    are null for other events. For a started clan event (`event_started`), `route_group` is its group,
    `scheduled_event` its id, `event_title` and `clan_name` say what and whose it is, and `status` is `open`
    (the caller can join), `joined` or `ended`. `status` is `expired` for an invitation that can no longer be answered:
    it is too old, the caller accepted another one, was invited again, or was taken out of the group,
    without answering it. Read it from `NotificationListView`'s queryset, which annotates `answer` and
    `is_latest_invitation`."""

    author = UserBriefSerializer(read_only=True)
    route_name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    event_title = serializers.CharField(source='scheduled_event.title', default=None, read_only=True)
    clan_name = serializers.CharField(source='scheduled_event.clan.name', default=None, read_only=True)

    class Meta:
        model = NotificationEvent
        fields = (
            'id', 'event_type', 'author', 'route_group', 'route_name', 'scheduled_event', 'event_title',
            'clan_name', 'status', 'created_at',
        )
        read_only_fields = fields

    def get_route_name(self, event: NotificationEvent) -> str | None:
        group = event.route_group
        return group.route.name if group and group.route else None

    def get_status(self, event: NotificationEvent) -> str | None:
        if event.route_group is None:
            return None
        if event.event_type == EventType.EVENT_STARTED:
            return self._get_started_event_status(event)
        if event.answer is not None:
            return event.answer
        if not event.is_latest_invitation:
            return AnswerStatus.EXPIRED.value
        status = group_meta.get_status(event.route_group.meta_json, self.context['request'].user.pk)
        if status is None:
            return AnswerStatus.EXPIRED.value
        if status == ParticipantStatus.INVITED and is_invitation_expired(event, timezone.now()):
            return AnswerStatus.EXPIRED.value
        return status.value

    def _get_started_event_status(self, event: NotificationEvent) -> str:
        if not is_group_active(event.route_group, timezone.now()):
            return ENDED_STATUS
        status = group_meta.get_status(event.route_group.meta_json, self.context['request'].user.pk)
        return JOINED_STATUS if status == ParticipantStatus.ACCEPTED else OPEN_STATUS
