from typing import Any

from django.contrib.auth.models import User
from rest_framework import serializers

from apps.clans.models import ClanGroup, ClanInvitation, ClanNotice
from apps.routes.models import Route
from apps.routes.serializers import RouteSerializer

UNKNOWN_USER_MESSAGE = 'No user with this username.'
ALREADY_MEMBER_MESSAGE = 'This user is already a member of the clan.'
ALREADY_INVITED_MESSAGE = 'This user already has a pending invitation to the clan.'
NOT_YOUR_ROUTE_MESSAGE = 'You can only attach a route you drew.'


class MemberSerializer(serializers.ModelSerializer):
    """A user of a clan: just enough to show who they are."""

    class Meta:
        model = User
        fields = ('id', 'username')


class ClanSerializer(serializers.ModelSerializer):
    """A clan as listed and created by the API; the client sends only `name` and `description`."""

    class Meta:
        model = ClanGroup
        fields = ('id', 'name', 'description', 'owner', 'created_at')
        read_only_fields = ('id', 'owner', 'created_at')


class ClanDetailSerializer(ClanSerializer):
    """A clan with its members."""

    members = MemberSerializer(source='users', many=True, read_only=True)

    class Meta(ClanSerializer.Meta):
        fields = (*ClanSerializer.Meta.fields, 'members')


class NoticeRouteSerializer(RouteSerializer):
    """The route attached to a notice: what a list row shows, without its path."""

    class Meta(RouteSerializer.Meta):
        fields = ('id', 'name', 'distance', 'estimated_time')
        read_only_fields = fields


class NoticeSerializer(serializers.ModelSerializer):
    """A clan notice; the client sends `title`, `description` and optionally `route_id`, one of its own routes."""

    clan_name = serializers.CharField(source='clan.name', read_only=True)
    author = MemberSerializer(read_only=True)
    route = NoticeRouteSerializer(read_only=True)
    route_id = serializers.PrimaryKeyRelatedField(
        source='route', queryset=Route.objects.all(), write_only=True, required=False, allow_null=True,
    )

    class Meta:
        model = ClanNotice
        fields = (
            'id', 'clan', 'clan_name', 'author', 'title', 'description', 'route', 'route_id', 'created_at',
        )
        read_only_fields = ('id', 'clan', 'created_at')

    def validate_route_id(self, route: Route | None) -> Route | None:
        if route is not None and route.author_id != self.context['request'].user.pk:
            raise serializers.ValidationError(NOT_YOUR_ROUTE_MESSAGE)
        return route


class InvitationCreateSerializer(serializers.Serializer):
    """Invites the user named by `username` to the clan in the serializer context."""

    id = serializers.IntegerField(read_only=True)
    invitee = MemberSerializer(read_only=True)
    username = serializers.CharField(write_only=True)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        clan = self.context['clan']
        try:
            invitee = User.objects.get(username=attrs['username'])
        except User.DoesNotExist as e:
            raise serializers.ValidationError({'username': UNKNOWN_USER_MESSAGE}) from e
        if clan.users.filter(pk=invitee.pk).exists():
            raise serializers.ValidationError({'username': ALREADY_MEMBER_MESSAGE})
        if clan.invitations.filter(invitee=invitee).exists():
            raise serializers.ValidationError({'username': ALREADY_INVITED_MESSAGE})
        return {'invitee': invitee}

    def create(self, validated_data: dict[str, Any]) -> ClanInvitation:
        return ClanInvitation.objects.create(
            clan=self.context['clan'],
            invited_by=self.context['request'].user,
            invitee=validated_data['invitee'],
        )


class InvitationSerializer(serializers.ModelSerializer):
    """A pending invitation as its invitee sees it."""

    clan_name = serializers.CharField(source='clan.name', read_only=True)
    invited_by = MemberSerializer(read_only=True)

    class Meta:
        model = ClanInvitation
        fields = ('id', 'clan', 'clan_name', 'invited_by', 'created_at')
