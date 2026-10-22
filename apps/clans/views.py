from django.db import transaction
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.generics import (
    CreateAPIView,
    DestroyAPIView,
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    UpdateAPIView,
)
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer
from rest_framework.views import APIView

from apps.clans.models import ClanGroup, ClanInvitation, ClanNotice
from apps.clans.serializers import (
    ClanDetailSerializer,
    ClanSerializer,
    InvitationCreateSerializer,
    InvitationSerializer,
    NoticeSerializer,
)

FEED_LIMIT = 50


def own_clans(request: Request) -> QuerySet[ClanGroup]:
    """The clans the caller is a member of."""
    return ClanGroup.objects.filter(users=request.user)


class ClanListCreateView(ListCreateAPIView):
    """Lists the clans the caller belongs to, newest first, or creates one the caller owns and joins."""

    serializer_class = ClanSerializer

    def get_queryset(self) -> QuerySet[ClanGroup]:
        return own_clans(self.request).order_by('-created_at', '-id')

    @transaction.atomic
    def perform_create(self, serializer: BaseSerializer) -> None:
        clan = serializer.save(owner=self.request.user)
        clan.users.add(self.request.user)


class ClanDetailView(RetrieveAPIView):
    """Returns a clan with its members; clans the caller does not belong to are 404."""

    serializer_class = ClanDetailSerializer

    def get_queryset(self) -> QuerySet[ClanGroup]:
        return own_clans(self.request).prefetch_related('users')


class MemberClanMixin:
    """Resolves the clan of the URL among the caller's own; any other clan is 404."""

    def initial(self, request: Request, *args: object, **kwargs: object) -> None:
        super().initial(request, *args, **kwargs)
        self.clan = get_object_or_404(own_clans(request), pk=kwargs['pk'])


class ClanNoticeListCreateView(MemberClanMixin, ListCreateAPIView):
    """Lists the notices of one of the caller's clans, newest first, or posts one authored by the caller."""

    serializer_class = NoticeSerializer

    def get_queryset(self) -> QuerySet[ClanNotice]:
        return self.clan.notices.select_related('clan', 'author', 'route').order_by('-created_at', '-id')

    def perform_create(self, serializer: BaseSerializer) -> None:
        serializer.save(clan=self.clan, author=self.request.user)


class IsNoticeAuthor(permissions.BasePermission):
    """Only the member who posted a notice may change it."""

    def has_object_permission(self, request: Request, view: APIView, obj: ClanNotice) -> bool:
        return obj.author_id == request.user.pk


class ClanNoticeUpdateView(MemberClanMixin, UpdateAPIView):
    """Edits a notice of one of the caller's clans; only its author may, other members get 403."""

    serializer_class = NoticeSerializer
    permission_classes = (permissions.IsAuthenticated, IsNoticeAuthor)
    http_method_names = ('patch', 'options')
    lookup_url_kwarg = 'notice_pk'

    def get_queryset(self) -> QuerySet[ClanNotice]:
        return self.clan.notices.select_related('clan', 'author', 'route')


class FeedNoticeListView(ListAPIView):
    """Lists the latest notices of every clan the caller belongs to, newest first."""

    serializer_class = NoticeSerializer

    def get_queryset(self) -> QuerySet[ClanNotice]:
        notices = ClanNotice.objects.filter(clan__users=self.request.user)
        return notices.select_related('clan', 'author', 'route').order_by('-created_at', '-id')[:FEED_LIMIT]


class ClanInvitationCreateView(MemberClanMixin, CreateAPIView):
    """Invites a user, by username, to a clan the caller belongs to."""

    serializer_class = InvitationCreateSerializer

    def get_serializer_context(self) -> dict[str, object]:
        return {**super().get_serializer_context(), 'clan': self.clan}


class MyInvitationsMixin:
    """Limits every query to the invitations addressed to the caller."""

    def get_queryset(self) -> QuerySet[ClanInvitation]:
        return ClanInvitation.objects.filter(invitee=self.request.user)


class InvitationListView(MyInvitationsMixin, ListAPIView):
    """Lists the caller's pending invitations, newest first."""

    serializer_class = InvitationSerializer

    def get_queryset(self) -> QuerySet[ClanInvitation]:
        return super().get_queryset().select_related('clan', 'invited_by').order_by('-created_at', '-id')


class InvitationDeclineView(MyInvitationsMixin, DestroyAPIView):
    """Declines (deletes) one of the caller's invitations; any other invitation is 404."""


class InvitationAcceptView(MyInvitationsMixin, APIView):
    """Joins the caller to the clan of one of their invitations and returns that clan."""

    @transaction.atomic
    def post(self, request: Request, pk: int) -> Response:
        invitation = get_object_or_404(self.get_queryset().select_related('clan'), pk=pk)
        clan = invitation.clan
        clan.users.add(request.user)
        invitation.delete()
        return Response(ClanSerializer(clan).data, status=status.HTTP_200_OK)
