from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Prefetch, QuerySet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import RetrieveAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.routes.group_meta import ParticipantStatus
from apps.routes.group_serializers import GroupCreateSerializer, GroupSerializer
from apps.routes.group_service import (
    InvitationAlreadyAnswered,
    NotRidingInGroup,
    answer_invitation,
    create_group,
    find_active_group,
    leave_group,
)
from apps.routes.models import RouteGroup

ALREADY_ANSWERED_MESSAGE = 'You have already answered this invitation.'
NOT_RIDING_MESSAGE = 'You are not riding in this group.'


def group_queryset() -> QuerySet[RouteGroup]:
    """Groups with everything `GroupSerializer` reads, in as few queries as possible."""
    riders = User.objects.select_related('profile').order_by('pk')
    return RouteGroup.objects.select_related('route', 'author__profile').prefetch_related(
        Prefetch('participants', queryset=riders),
    )


class GroupCreateView(APIView):
    """Creates a group led by the caller and notifies the invited riders."""

    def post(self, request: Request) -> Response:
        serializer = GroupCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        group = create_group(request.user, **serializer.validated_data)
        return Response(GroupSerializer(group_queryset().get(pk=group.pk)).data, status=status.HTTP_201_CREATED)


class GroupActiveView(APIView):
    """The newest group the caller can join back: still not ended, with another rider connected.
    `204` when there is none."""

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
