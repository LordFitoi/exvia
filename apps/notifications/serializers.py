from rest_framework import serializers

from apps.notifications.models import NotificationEvent
from apps.routes import group_meta
from apps.users.serializers import UserBriefSerializer


EXPIRED_STATUS = 'expired'


class NotificationSerializer(serializers.ModelSerializer):
    """A notification as one of its destinations sees it. For a route invitation, `route_group` is
    the group, `route_name` the route (null in free mode) and `status` the caller's answer; all three
    are null for other events. `status` is `expired` for an invitation that can no longer be answered:
    the caller was invited again, or taken out of the group, without answering it. Read it from
    `NotificationListView`'s queryset, which annotates `answer` and `is_latest_invitation`."""

    author = UserBriefSerializer(read_only=True)
    route_name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = NotificationEvent
        fields = ('id', 'event_type', 'author', 'route_group', 'route_name', 'status', 'created_at')
        read_only_fields = fields

    def get_route_name(self, event: NotificationEvent) -> str | None:
        group = event.route_group
        return group.route.name if group and group.route else None

    def get_status(self, event: NotificationEvent) -> str | None:
        if event.route_group is None:
            return None
        if event.answer is not None:
            return event.answer
        if not event.is_latest_invitation:
            return EXPIRED_STATUS
        status = group_meta.get_status(event.route_group.meta_json, self.context['request'].user.pk)
        return status.value if status else EXPIRED_STATUS
