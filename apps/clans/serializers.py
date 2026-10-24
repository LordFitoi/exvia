from datetime import datetime
from typing import Any

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import serializers

from apps.clans.event_service import create_event, event_state
from apps.clans.models import ClanGroup, ClanInvitation, ClanNotice, ScheduledEvent
from apps.routes import group_meta
from apps.routes.models import Route
from apps.routes.serializers import RouteSerializer

UNKNOWN_USER_MESSAGE = 'No user with this username.'
ALREADY_MEMBER_MESSAGE = 'This user is already a member of the clan.'
ALREADY_INVITED_MESSAGE = 'This user already has a pending invitation to the clan.'
NOT_YOUR_ROUTE_MESSAGE = 'You can only attach a route you drew.'
PAST_TIME_MESSAGE = 'Pick a time in the future.'


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


class RouteAttachmentSerializer(serializers.ModelSerializer):
    """Base of the serializers that carry one of the caller's routes: read as `route`, written as `route_id`."""

    route = NoticeRouteSerializer(read_only=True)
    route_id = serializers.PrimaryKeyRelatedField(
        source='route', queryset=Route.objects.all(), write_only=True, required=False, allow_null=True,
    )

    def validate_route_id(self, route: Route | None) -> Route | None:
        if route is not None and route.author_id != self.context['request'].user.pk:
            raise serializers.ValidationError(NOT_YOUR_ROUTE_MESSAGE)
        return route


class ScheduledEventSerializer(RouteAttachmentSerializer):
    """A scheduled ride. The admin sends `title`, `description`, `scheduled_at` (in the future) and optionally
    `route_id`. `state` is `upcoming`, `live` (its group is open to
    join) or `ended`; `route_group` is the group once it started, and `is_joined` whether the caller rides in it.
    Read it with `clan`, `route` and `route_group` selected."""

    clan_name = serializers.CharField(source='clan.name', read_only=True)
    state = serializers.SerializerMethodField()
    is_joined = serializers.SerializerMethodField()

    class Meta:
        model = ScheduledEvent
        fields = (
            'id', 'clan', 'clan_name', 'title', 'description', 'scheduled_at', 'route', 'route_id',
            'status', 'state', 'route_group', 'is_joined', 'created_at',
        )
        read_only_fields = ('id', 'clan', 'status', 'route_group', 'created_at')

    def get_state(self, event: ScheduledEvent) -> str:
        return event_state(event, timezone.now()).value

    def get_is_joined(self, event: ScheduledEvent) -> bool:
        group = event.route_group
        status = group_meta.get_status(group.meta_json, self.context['request'].user.pk) if group else None
        return status == group_meta.ParticipantStatus.ACCEPTED

    def validate_scheduled_at(self, scheduled_at: datetime) -> datetime:
        if scheduled_at <= timezone.now():
            raise serializers.ValidationError(PAST_TIME_MESSAGE)
        return scheduled_at

    def create(self, validated_data: dict[str, Any]) -> ScheduledEvent:
        return create_event(self.context['clan'], validated_data)


class NoticeSerializer(RouteAttachmentSerializer):
    """A clan notice; the client sends `title`, `description` and optionally `route_id`, one of its own routes.
    `event` is the scheduled ride the notice announces, or null."""

    clan_name = serializers.CharField(source='clan.name', read_only=True)
    author = MemberSerializer(read_only=True)
    event = ScheduledEventSerializer(read_only=True)

    class Meta:
        model = ClanNotice
        fields = (
            'id', 'clan', 'clan_name', 'author', 'title', 'description', 'route', 'route_id', 'event', 'created_at',
        )
        read_only_fields = ('id', 'clan', 'created_at')


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
