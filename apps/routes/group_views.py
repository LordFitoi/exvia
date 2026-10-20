from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Prefetch, QuerySet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import RetrieveAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.routes.group_meta import ParticipantStatus
from apps.routes.group_serializers import (
    NOT_IN_GROUP_MESSAGE,
    GroupCreateSerializer,
    GroupInviteSerializer,
    GroupRemoveSerializer,
    GroupRouteChoiceSerializer,
    GroupSerializer,
)
from apps.routes.group_service import (
    AlreadyInGroup,
    CannotRemoveLeader,
    GroupFull,
    InvitationAlreadyAnswered,
    NotInGroup,
    NotRidingInGroup,
    answer_invitation,
    change_route,
    create_group,
    find_active_group,
    invite_rider,
    leave_group,
    remove_rider,
)
from apps.routes.live import broadcast_route_change
from apps.routes.models import MAX_GROUP_PARTICIPANTS, RouteGroup

ALREADY_ANSWERED_MESSAGE = 'You have already answered this invitation.'
NOT_RIDING_MESSAGE = 'You are not riding in this group.'
NOT_LEADER_MESSAGE = 'Only the rider who leads the group can do this.'
ALREADY_IN_GROUP_MESSAGE = 'This rider is already in the group.'
GROUP_FULL_MESSAGE = f'A group has at most {MAX_GROUP_PARTICIPANTS} riders, you included.'
CANNOT_REMOVE_LEADER_MESSAGE = 'You lead this group, so you cannot remove yourself.'


def group_queryset() -> QuerySet[RouteGroup]:
    """Groups with everything `GroupSerializer` reads, in as few queries as possible."""
    riders = User.objects.select_related('profile').order_by('pk')
    return RouteGroup.objects.select_related('route', 'author__profile').prefetch_related(
        Prefetch('participants', queryset=riders),
    )


def lock_group_led_by(user: User, pk: str) -> RouteGroup:
    """The group `pk`, locked, when `user` is in it and leads it: 404 for any other group, 403 for a
    rider who does not lead it."""
    locked = RouteGroup.objects.select_for_update(of=('self',)).filter(participants=user)
    group = get_object_or_404(locked, pk=pk)
    if group.author_id != user.pk:
        raise PermissionDenied(NOT_LEADER_MESSAGE)
    return group


class GroupCreateView(APIView):
    """Creates a group led by the caller and notifies the invited riders."""

    def post(self, request: Request) -> Response:
        serializer = GroupCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        group = create_group(request.user, **serializer.validated_data)
        return Response(GroupSerializer(group_queryset().get(pk=group.pk)).data, status=status.HTTP_201_CREATED)


class GroupActiveView(APIView):
    """The newest group the caller accepted and has not left, with recent activity. `204` when there is none."""

    def get(self, request: Request) -> Response:
        group = find_active_group(group_queryset(), request.user, timezone.now())
        if group is None:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(GroupSerializer(group).data)


class GroupDetailView(RetrieveAPIView):
    """Returns a group the caller is in or was invited to; any other group is 404."""

    serializer_class = GroupSerializer

    def get_queryset(self) -> QuerySet[RouteGroup]:
        return group_queryset().filter(participants=self.request.user)


class GroupAnswerView(APIView):
    """Accepts or rejects the caller's invitation to a group; `answer` is set by the subclasses."""

    answer: ParticipantStatus

    @transaction.atomic
    def post(self, request: Request, pk: str) -> Response:
        locked = RouteGroup.objects.select_for_update(of=('self',)).filter(participants=request.user)
        group = get_object_or_404(locked, pk=pk)
        try:
            answer_invitation(group, request.user, self.answer)
        except InvitationAlreadyAnswered as error:
            raise ValidationError({'detail': ALREADY_ANSWERED_MESSAGE}) from error
        if self.answer == ParticipantStatus.REJECTED:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(GroupSerializer(group_queryset().get(pk=group.pk)).data)


class GroupAcceptView(GroupAnswerView):
    """Accepts the invitation; the response is the group, ready to ride."""

    answer = ParticipantStatus.ACCEPTED


class GroupRejectView(GroupAnswerView):
    """Rejects the invitation and leaves the group."""

    answer = ParticipantStatus.REJECTED


class GroupLeaveView(APIView):
    """Takes the caller, who accepted the group, out of it, so it is no longer offered to them."""

    @transaction.atomic
    def post(self, request: Request, pk: str) -> Response:
        locked = RouteGroup.objects.select_for_update(of=('self',)).filter(participants=request.user)
        group = get_object_or_404(locked, pk=pk)
        try:
            leave_group(group, request.user)
        except NotRidingInGroup as error:
            raise ValidationError({'detail': NOT_RIDING_MESSAGE}) from error
        return Response(status=status.HTTP_204_NO_CONTENT)


class GroupInviteView(APIView):
    """The leader invites one more rider to a group that is already rolling; answers the group."""

    @transaction.atomic
    def post(self, request: Request, pk: str) -> Response:
        group = lock_group_led_by(request.user, pk)
        serializer = GroupInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            invite_rider(group, serializer.validated_data['username'])
        except AlreadyInGroup as error:
            raise ValidationError({'username': ALREADY_IN_GROUP_MESSAGE}) from error
        except GroupFull as error:
            raise ValidationError({'username': GROUP_FULL_MESSAGE}) from error
        return Response(GroupSerializer(group_queryset().get(pk=group.pk)).data)


class GroupRemoveView(APIView):
    """The leader takes a rider, invited or riding, out of the group; answers the group."""

    @transaction.atomic
    def post(self, request: Request, pk: str) -> Response:
        group = lock_group_led_by(request.user, pk)
        serializer = GroupRemoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            remove_rider(group, serializer.validated_data['user'])
        except CannotRemoveLeader as error:
            raise ValidationError({'user': CANNOT_REMOVE_LEADER_MESSAGE}) from error
        except NotInGroup as error:
            raise ValidationError({'user': NOT_IN_GROUP_MESSAGE}) from error
        return Response(GroupSerializer(group_queryset().get(pk=group.pk)).data)


class GroupRouteView(APIView):
    """The leader changes the route of a group that is rolling, or switches it to free mode; answers the group."""

    @transaction.atomic
    def post(self, request: Request, pk: str) -> Response:
        group = lock_group_led_by(request.user, pk)
        serializer = GroupRouteChoiceSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        change_route(group, serializer.validated_data['route'])
        transaction.on_commit(lambda: broadcast_route_change(group.pk, request.user.pk))
        return Response(GroupSerializer(group_queryset().get(pk=group.pk)).data)
