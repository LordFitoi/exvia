from dataclasses import dataclass

from django.db.models import Q
from rest_framework.exceptions import ValidationError

from apps.places.models import MAX_LATITUDE, MAX_LONGITUDE

BBOX_PARAM = 'bbox'
BBOX_VALUE_COUNT = 4
INVALID_BBOX_MESSAGE = 'Send bbox as west,south,east,north in degrees.'


@dataclass(frozen=True)
class Viewport:
    """The part of the map a client is looking at. A `west` greater than `east` crosses the antimeridian."""

    west: float
    south: float
    east: float
    north: float

    def as_filter(self) -> Q:
        latitudes = Q(lat__gte=self.south, lat__lte=self.north)
        if self.west <= self.east:
            return latitudes & Q(lng__gte=self.west, lng__lte=self.east)
        return latitudes & (Q(lng__gte=self.west) | Q(lng__lte=self.east))


def parse_viewport(raw: str | None) -> Viewport:
    """Reads `west,south,east,north`; anything else is a 400."""
    try:
        west, south, east, north = (float(part) for part in (raw or '').split(','))
    except ValueError as error:
        raise ValidationError({BBOX_PARAM: INVALID_BBOX_MESSAGE}) from error
    is_in_range = all(-MAX_LONGITUDE <= value <= MAX_LONGITUDE for value in (west, east)) and all(
        -MAX_LATITUDE <= value <= MAX_LATITUDE for value in (south, north)
    )
    if not is_in_range or south > north:
        raise ValidationError({BBOX_PARAM: INVALID_BBOX_MESSAGE})
    return Viewport(west=west, south=south, east=east, north=north)
