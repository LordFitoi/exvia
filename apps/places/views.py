from django.db.models import QuerySet
from rest_framework.generics import ListAPIView, ListCreateAPIView
from rest_framework.serializers import BaseSerializer

from apps.places.models import PlaceLocation
from apps.places.serializers import PlaceLocationSerializer
from apps.places.viewport import BBOX_PARAM, parse_viewport

MAX_PLACES_PER_VIEWPORT = 200
MAX_PLACES_LISTED = 500


class PlaceLocationListCreateView(ListCreateAPIView):
    """Lists the caller's saved places inside the `bbox` they are looking at, or saves a new one."""

    serializer_class = PlaceLocationSerializer

    def get_queryset(self) -> QuerySet[PlaceLocation]:
        viewport = parse_viewport(self.request.query_params.get(BBOX_PARAM))
        places = PlaceLocation.objects.filter(author=self.request.user).filter(viewport.as_filter())
        return places.order_by('id')[:MAX_PLACES_PER_VIEWPORT]

    def perform_create(self, serializer: BaseSerializer) -> None:
        serializer.save(author=self.request.user)


class PlaceLocationAllView(ListAPIView):
    """Lists the caller's saved places wherever they are, by name, for searching them by text."""

    serializer_class = PlaceLocationSerializer

    def get_queryset(self) -> QuerySet[PlaceLocation]:
        return PlaceLocation.objects.filter(author=self.request.user).order_by('name', 'id')[:MAX_PLACES_LISTED]
