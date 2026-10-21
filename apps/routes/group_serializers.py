from django.contrib.auth.models import User
from rest_framework import serializers

from apps.routes import group_meta
from apps.routes.models import MAX_GROUP_PARTICIPANTS, Route, RouteGroup
from apps.routes.serializers import RouteSerializer
from apps.users.serializers import UserBriefSerializer

UNKNOWN_ROUTE_MESSAGE = 'No route with this id.'
UNKNOWN_USERS_MESSAGE = 'No user with the username: {names}.'
INVITED_YOURSELF_MESSAGE = 'You are already in your own group.'
UNKNOWN_RIDER_MESSAGE = 'No rider with this username.'
NOT_IN_GROUP_MESSAGE = 'This rider is not in the group.'
TOO_MANY_MESSAGE = f'A group has at most {MAX_GROUP_PARTICIPANTS} riders, you included.'


class GroupRouteSerializer(RouteSerializer):
    """What a group member needs to ride the route: the path and the checkpoints, without its author."""

    class Meta(RouteSerializer.Meta):
        fields = ('id', 'name', 'distance', 'estimated_time', 'points', 'waypoints')
        read_only_fields = fields


class GroupSerializer(serializers.ModelSerializer):
    """A group with its route (null in free mode) and its riders with their answer.
    Read it with `participants` prefetched as users with their `profile`."""

    route = GroupRouteSerializer(read_only=True)
    author = UserBriefSerializer(read_only=True)
    participants = serializers.SerializerMethodField()

    class Meta:
        model = RouteGroup
        fields = ('id', 'route', 'author', 'participants', 'created_at')
        read_only_fields = fields

    def get_participants(self, group: RouteGroup) -> list[dict[str, object]]:
        return [
            {**UserBriefSerializer(rider).data, 'status': group_meta.get_status(group.meta_json, rider.pk)}
            for rider in group.participants.all()
        ]


class GroupRouteChoiceSerializer(serializers.Serializer):
    """The route to ride (one of the caller's), or null for free mode."""

    route = serializers.PrimaryKeyRelatedField(queryset=Route.objects.all(), allow_null=True)

    def validate_route(self, route: Route | None) -> Route | None:
        if route is not None and route.author_id != self.context['request'].user.pk:
            raise serializers.ValidationError(UNKNOWN_ROUTE_MESSAGE)
        return route


class GroupCreateSerializer(GroupRouteChoiceSerializer):
    """The route (one of the caller's, or none for free mode) and the usernames to invite."""

    route = serializers.PrimaryKeyRelatedField(queryset=Route.objects.all(), allow_null=True, default=None)
    invitees = serializers.ListField(child=serializers.CharField(max_length=150), default=list)

    def validate_invitees(self, usernames: list[str]) -> list[User]:
        names = list(dict.fromkeys(name.strip() for name in usernames if name.strip()))
        if self.context['request'].user.username in names:
            raise serializers.ValidationError(INVITED_YOURSELF_MESSAGE)
        users = list(User.objects.filter(username__in=names, is_active=True))
        unknown = sorted(set(names) - {user.username for user in users})
        if unknown:
            raise serializers.ValidationError(UNKNOWN_USERS_MESSAGE.format(names=', '.join(unknown)))
        if len(users) + 1 > MAX_GROUP_PARTICIPANTS:
            raise serializers.ValidationError(TOO_MANY_MESSAGE)
        return users


class GroupInviteSerializer(serializers.Serializer):
    """The username of the rider to invite to a group that is already rolling."""

    username = serializers.CharField(max_length=150)

    def validate_username(self, username: str) -> User:
        user = User.objects.filter(username=username.strip(), is_active=True).first()
        if user is None:
            raise serializers.ValidationError(UNKNOWN_RIDER_MESSAGE)
        return user


class GroupRiderSerializer(serializers.Serializer):
    """The id of the rider a leader acts on: to take out of the group, or to hand the leadership to."""

    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), error_messages={
        'does_not_exist': NOT_IN_GROUP_MESSAGE, 'incorrect_type': NOT_IN_GROUP_MESSAGE,
    })
