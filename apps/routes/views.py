from django.db.models import QuerySet
from rest_framework.generics import ListCreateAPIView, RetrieveDestroyAPIView
from rest_framework.serializers import BaseSerializer

from apps.routes.models import Route
from apps.routes.serializers import RouteSerializer, RouteSummarySerializer


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


class RouteDetailView(OwnRoutesMixin, RetrieveDestroyAPIView):
    """Returns or deletes one of the caller's routes; other users' routes are 404."""
