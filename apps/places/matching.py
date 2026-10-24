from django.contrib.auth.models import User

from apps.places.models import PlaceLocation
from apps.routes.geometry import haversine_km

# The distance the street snapping can move a tapped place (50 m), plus a margin for rounding.
MAX_SNAP_DISTANCE_KM = 0.06


def find_place_categories(author: User, points: list[list[float]]) -> list[str | None]:
    """For each [lng, lat] point, the category of the author's saved place closest to it within
    MAX_SNAP_DISTANCE_KM, or None. A place added to a route is moved onto the nearest street, so the
    stored point is near the place and not exactly on it."""
    places = [
        ([float(place.lng), float(place.lat)], place.category)
        for place in PlaceLocation.objects.filter(author=author).only('lat', 'lng', 'category')
    ]
    return [_closest_category(point, places) for point in points]


def _closest_category(point: list[float], places: list[tuple[list[float], str]]) -> str | None:
    nearby = [
        (distance, category)
        for position, category in places
        if (distance := haversine_km(point, position)) <= MAX_SNAP_DISTANCE_KM
    ]
    return min(nearby)[1] if nearby else None
