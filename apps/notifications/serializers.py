from rest_framework import serializers

from apps.notifications.models import NotificationEvent
from apps.routes import group_meta
from apps.users.serializers import UserBriefSerializer


class NotificationSerializer(serializers.ModelSerializer):
    """A notification as one of its destinations sees it. For a route invitation, `route_group` is
    the group, `route_name` the route (null in free mode) and `status` the caller's answer; all three
    are null for other events. Read it with `author__profile` and `route_group__route` selected."""

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
        return group_meta.get_status(event.route_group.meta_json, self.context['request'].user.pk)
