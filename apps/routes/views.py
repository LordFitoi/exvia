from django.contrib.auth.models import User
from django.db.models import Q, QuerySet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveDestroyAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.serializers import BaseSerializer

from apps.routes import group_service
from apps.routes.group_meta import ParticipantStatus
from apps.routes.models import Route, RouteSummary, RouteType
from apps.routes.serializers import (
    DestinationSummarySerializer,
    RideSummaryListSerializer,
    RideSummarySerializer,
    RouteSerializer,
    SharedRouteSerializer,
    RouteSummarySerializer,
)


class OwnRoutesMixin:
    """Limits every query to the routes of the authenticated caller."""

    serializer_class = RouteSerializer

    def get_queryset(self) -> QuerySet[Route]:
        return Route.objects.filter(author=self.request.user)


class RouteListCreateView(OwnRoutesMixin, ListCreateAPIView):
    """Lists the caller's routes (without points), newest first, or creates one authored by the caller."""

    def get_serializer_class(self) -> type[BaseSerializer]:
        return RouteSummarySerializer if self.request.method == 'GET' else RouteSerializer

    def perform_create(self, serializer: BaseSerializer) -> None:
        serializer.save(author=self.request.user)


class RouteDetailView(OwnRoutesMixin, RetrieveUpdateDestroyAPIView):
    """Returns, updates or deletes one of the caller's routes; other users' routes are 404."""


class SharedRouteView(RetrieveAPIView):
    """Returns any route to anyone who knows its UUID, signed in or not. The UUID is the secret of the
    link; the credentials are ignored, so a stale token cannot turn a public read into a 401."""

    authentication_classes = ()
    permission_classes = (AllowAny,)
    serializer_class = SharedRouteSerializer
    queryset = Route.objects.select_related('author')


def rideable_routes(user: User) -> QuerySet[Route]:
    """The caller's routes, and the routes of the groups the caller has accepted to ride in."""
    accepted_in_group = Q(**{f'groups__meta_json__participants__{user.pk}__status': ParticipantStatus.ACCEPTED})
    return Route.objects.filter(Q(author=user) | accepted_in_group).distinct()


class RideSummaryCreateView(CreateAPIView):
    """Saves the summary of a ride of a route the caller can ride (see `rideable_routes`); any other
    route is 404. The caller is its author. Its participants are the caller and, when it was ridden in a
    group of that route (`group`), the riders of the group who are connected at that moment."""

    serializer_class = RideSummarySerializer

    def initial(self, request: Request, *args: object, **kwargs: object) -> None:
        super().initial(request, *args, **kwargs)
        self.route = get_object_or_404(rideable_routes(request.user), pk=kwargs['pk'])

    def perform_create(self, serializer: BaseSerializer) -> None:
        group = serializer.validated_data.pop('group', None)
        summary = serializer.save(route=self.route, author=self.request.user)
        summary.participants.add(self.request.user)
        if group is not None and group.route_id == self.route.pk:
            summary.participants.add(*group_service.connected_riders(group, timezone.now()))


class DestinationSummaryCreateView(CreateAPIView):
    """Saves the summary of a ride to a searched place, which has no route. The caller is its author and
    its only participant."""

    serializer_class = DestinationSummarySerializer

    def perform_create(self, serializer: BaseSerializer) -> None:
        summary = serializer.save(route_type=RouteType.DESTINATION, author=self.request.user)
        summary.participants.add(self.request.user)


class MyRideSummariesMixin:
    """Limits every query to the rides the authenticated caller took part in."""

    def get_queryset(self) -> QuerySet[RouteSummary]:
        return RouteSummary.objects.filter(participants=self.request.user).select_related('route')


class RideSummaryListView(MyRideSummariesMixin, ListAPIView):
    """Lists the caller's rides, most recently saved first (no pagination)."""

    serializer_class = RideSummaryListSerializer

    def get_queryset(self) -> QuerySet[RouteSummary]:
        return super().get_queryset().order_by('-created_at')


class RideSummaryDetailView(MyRideSummariesMixin, RetrieveDestroyAPIView):
    """Returns one ride the caller took part in, with its participants, or deletes one the caller wrote
    (it disappears for every participant). Any other ride is 404."""

    serializer_class = RideSummarySerializer

    def get_queryset(self) -> QuerySet[RouteSummary]:
        queryset = super().get_queryset().prefetch_related('participants')
        if self.request.method == 'DELETE':
            return queryset.filter(author=self.request.user)
        return queryset
