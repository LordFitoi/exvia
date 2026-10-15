from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
    ListCreateAPIView,
    RetrieveDestroyAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.request import Request
from rest_framework.serializers import BaseSerializer

from apps.routes.models import Route, RouteSummary
from apps.routes.serializers import (
    RideSummaryListSerializer,
    RideSummarySerializer,
    RouteSerializer,
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


class RideSummaryCreateView(CreateAPIView):
    """Saves the summary of a ride of one of the caller's routes; other users' routes are 404.
    The caller is its author and its only participant."""

    serializer_class = RideSummarySerializer

    def initial(self, request: Request, *args: object, **kwargs: object) -> None:
        super().initial(request, *args, **kwargs)
        self.route = get_object_or_404(Route.objects.filter(author=request.user), pk=kwargs['pk'])

    def perform_create(self, serializer: BaseSerializer) -> None:
        summary = serializer.save(route=self.route, author=self.request.user)
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
