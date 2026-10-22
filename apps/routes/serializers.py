from datetime import datetime

from django.contrib.auth.models import User
from rest_framework import serializers

from apps.routes import group_meta
from apps.routes.group_meta import ParticipantStatus
from apps.routes.models import DESTINATION_NAME_MAX_LENGTH, Route, RouteGroup, RouteSummary

END_BEFORE_START_MESSAGE = 'The end must be after the start.'
NOT_RIDING_IN_GROUP_MESSAGE = 'You are not riding in this group.'


def validate_period(attrs: dict[str, datetime]) -> dict[str, datetime]:
    if attrs['end_at'] <= attrs['start_at']:
        raise serializers.ValidationError({'end_at': END_BEFORE_START_MESSAGE})
    return attrs


class RouteSerializer(serializers.ModelSerializer):
    """Route as exposed by the API; `estimated_time` is whole seconds."""

    estimated_time = serializers.SerializerMethodField()

    class Meta:
        model = Route
        fields = (
            'id', 'name', 'description', 'points', 'waypoints', 'distance', 'estimated_time',
            'author', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'distance', 'author', 'created_at', 'updated_at')

    def get_estimated_time(self, route: Route) -> int:
        return round(route.estimated_time.total_seconds())


class RouteSummarySerializer(RouteSerializer):
    """Route without its `points` and `waypoints`, which can run to thousands of pairs; used by the list."""

    class Meta(RouteSerializer.Meta):
        fields = tuple(name for name in RouteSerializer.Meta.fields if name not in ('points', 'waypoints'))


class SharedRouteSerializer(RouteSerializer):
    """What anyone holding a route's link can read: the route without its waypoints, and its
    author's username instead of the user id."""

    author = serializers.CharField(source='author.username', read_only=True)

    class Meta(RouteSerializer.Meta):
        fields = (
            'id', 'name', 'description', 'points', 'distance', 'estimated_time', 'author', 'created_at',
        )
        read_only_fields = fields


class RiderSerializer(serializers.ModelSerializer):
    """A participant of a ride: just enough to show who they are."""

    class Meta:
        model = User
        fields = ('id', 'username')


class RideSummarySerializer(serializers.ModelSerializer):
    """A `RouteSummary` as exposed by the API. The client sends only `start_at`, `end_at`, the top speed
    (km/h, optional), when it `reached_at` the start and each checkpoint (optional) and the `group` it rode in (optional,
    never returned); `duration` is whole seconds;
    `distance` and `estimated_time` are the route's; a destination ride has no route, so `route` is null,
    `route_name` is the place, `distance` the kilometres covered and `estimated_time` null."""

    group = serializers.PrimaryKeyRelatedField(
        queryset=RouteGroup.objects.all(), write_only=True, required=False, allow_null=True,
    )
    duration = serializers.SerializerMethodField()
    route_name = serializers.SerializerMethodField()
    distance = serializers.SerializerMethodField()
    estimated_time = serializers.SerializerMethodField()
    participants = RiderSerializer(many=True, read_only=True)

    class Meta:
        model = RouteSummary
        fields = (
            'id', 'route_type', 'route', 'route_name', 'distance', 'estimated_time', 'start_at', 'end_at',
            'duration', 'is_finished', 'max_speed', 'reached_at', 'group', 'author', 'participants', 'created_at',
        )
        read_only_fields = ('id', 'route_type', 'route', 'author', 'created_at')

    def validate_group(self, group: RouteGroup | None) -> RouteGroup | None:
        user = self.context['request'].user
        if group is not None and group_meta.get_status(group.meta_json, user.pk) != ParticipantStatus.ACCEPTED:
            raise serializers.ValidationError(NOT_RIDING_IN_GROUP_MESSAGE)
        return group

    def get_duration(self, summary: RouteSummary) -> int:
        return round(summary.duration.total_seconds())

    def get_route_name(self, summary: RouteSummary) -> str:
        return summary.destination_name if summary.route is None else summary.route.name

    def get_distance(self, summary: RouteSummary) -> float:
        return summary.distance if summary.route is None else summary.route.distance

    def get_estimated_time(self, summary: RouteSummary) -> int | None:
        if summary.route is None:
            return None
        return round(summary.route.estimated_time.total_seconds())

    def validate(self, attrs: dict[str, datetime]) -> dict[str, datetime]:
        return validate_period(attrs)


class DestinationSummarySerializer(serializers.ModelSerializer):
    """Writes the summary of a ride to a place: when it `start_at` and `end_at`, whether it `is_finished`
    (default true), the top speed (km/h, optional), the `destination_name` and the `distance` covered in
    km. It answers with the full ride, as `RideSummarySerializer` shows it."""

    destination_name = serializers.CharField(max_length=DESTINATION_NAME_MAX_LENGTH)
    distance = serializers.FloatField(min_value=0)

    class Meta:
        model = RouteSummary
        fields = ('start_at', 'end_at', 'is_finished', 'max_speed', 'destination_name', 'distance')

    def validate(self, attrs: dict[str, datetime]) -> dict[str, datetime]:
        return validate_period(attrs)

    def to_representation(self, instance: RouteSummary) -> dict[str, object]:
        return RideSummarySerializer(instance, context=self.context).data


class RideSummaryListSerializer(RideSummarySerializer):
    """The history list shape: no participants, estimate or top speed."""

    class Meta(RideSummarySerializer.Meta):
        fields = (
            'id', 'route_type', 'route', 'route_name', 'distance', 'start_at', 'end_at', 'duration',
            'is_finished', 'created_at',
        )
