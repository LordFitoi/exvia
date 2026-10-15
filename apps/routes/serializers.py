from datetime import datetime

from django.contrib.auth.models import User
from rest_framework import serializers

from apps.routes.models import Route, RouteSummary

END_BEFORE_START_MESSAGE = 'The end must be after the start.'


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
    """A `RouteSummary` as exposed by the API. The client sends only `start_at`, `end_at` and the
    speeds (km/h, optional); `duration` is whole seconds; `distance` and `estimated_time` are the route's."""

    duration = serializers.SerializerMethodField()
    route_name = serializers.CharField(source='route.name', read_only=True)
    distance = serializers.FloatField(source='route.distance', read_only=True)
    estimated_time = serializers.SerializerMethodField()
    participants = RiderSerializer(many=True, read_only=True)

    class Meta:
        model = RouteSummary
        fields = (
            'id', 'route', 'route_name', 'distance', 'estimated_time', 'start_at', 'end_at', 'duration',
            'is_finished',
            'max_speed', 'min_speed', 'avg_speed', 'author', 'participants', 'created_at',
        )
        read_only_fields = ('id', 'route', 'author', 'created_at')

    def get_duration(self, summary: RouteSummary) -> int:
        return round(summary.duration.total_seconds())

    def get_estimated_time(self, summary: RouteSummary) -> int:
        return round(summary.route.estimated_time.total_seconds())

    def validate(self, attrs: dict[str, datetime]) -> dict[str, datetime]:
        if attrs['end_at'] <= attrs['start_at']:
            raise serializers.ValidationError({'end_at': END_BEFORE_START_MESSAGE})
        return attrs


class RideSummaryListSerializer(RideSummarySerializer):
    """The history list shape: no participants, estimate or extremes."""

    class Meta(RideSummarySerializer.Meta):
        fields = (
            'id', 'route', 'route_name', 'distance', 'start_at', 'end_at', 'duration', 'is_finished', 'avg_speed',
            'created_at',
        )
