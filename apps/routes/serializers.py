from rest_framework import serializers

from apps.routes.models import Route


class RouteSerializer(serializers.ModelSerializer):
    """Route as exposed by the API; `estimated_time` is whole seconds."""

    estimated_time = serializers.SerializerMethodField()

    class Meta:
        model = Route
        fields = (
            'id', 'name', 'description', 'points', 'distance', 'estimated_time',
            'author', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'distance', 'author', 'created_at', 'updated_at')

    def get_estimated_time(self, route: Route) -> int:
        return round(route.estimated_time.total_seconds())


class RouteSummarySerializer(RouteSerializer):
    """Route without its `points`, which run to thousands of pairs; used by the list."""

    class Meta(RouteSerializer.Meta):
        fields = tuple(name for name in RouteSerializer.Meta.fields if name != 'points')
