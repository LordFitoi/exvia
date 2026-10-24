from django.core.exceptions import ValidationError

from apps.places.models import PlaceCategory

MIN_POINTS = 2
MAX_POINTS = 20_000
MAX_WAYPOINTS = 500
WAYPOINT_TEXT_MAX_LENGTH = 255
WAYPOINT_KEYS = frozenset({'lng', 'lat', 'name', 'address', 'category'})
MAX_LONGITUDE = 180
MAX_LATITUDE = 90


def validate_points(value: object) -> None:
    """Accept only a list of two to MAX_POINTS [lng, lat] coordinate pairs."""
    _validate_coordinate_list(value, minimum=MIN_POINTS, maximum=MAX_POINTS, label='points')


def validate_waypoints(value: object) -> None:
    """Accept only a list of up to MAX_WAYPOINTS waypoints; it may be empty. A waypoint is an object:
    `{"lng": 0.0, "lat": 0.0, "name": "Corner Cafe", "address": "Av. Paulista, 1000", "category": "cafe"}`, where
    `name` is the name of the saved place there or else the address, `address` is the nearest address (empty when
    unknown) and `category` is that saved place's `PlaceCategory`, else null."""
    if not isinstance(value, list):
        raise ValidationError(f'The waypoints must be a list of objects, got {type(value).__name__}.')
    if len(value) > MAX_WAYPOINTS:
        raise ValidationError(f'A route can have at most {MAX_WAYPOINTS} waypoints, got {len(value)}.')
    for waypoint in value:
        _validate_waypoint(waypoint)


def _validate_waypoint(waypoint: object) -> None:
    if not isinstance(waypoint, dict) or waypoint.keys() != WAYPOINT_KEYS:
        raise ValidationError(f'A waypoint must be an object with {sorted(WAYPOINT_KEYS)}, got {waypoint!r}.')
    validate_point([waypoint['lng'], waypoint['lat']])
    for field in ('name', 'address'):
        text = waypoint[field]
        if not isinstance(text, str) or len(text) > WAYPOINT_TEXT_MAX_LENGTH:
            raise ValidationError(f'A waypoint {field} must be text of at most {WAYPOINT_TEXT_MAX_LENGTH} characters.')
    category = waypoint['category']
    if category is not None and category not in PlaceCategory.values:
        raise ValidationError(f'A waypoint category must be null or one of {PlaceCategory.values}, got {category!r}.')


def _validate_coordinate_list(value: object, *, minimum: int, maximum: int, label: str) -> None:
    if not isinstance(value, list):
        raise ValidationError(f'The {label} must be a list of [lng, lat] pairs, got {type(value).__name__}.')
    if len(value) < minimum:
        raise ValidationError(f'A route needs at least {minimum} {label}, got {len(value)}.')
    if len(value) > maximum:
        raise ValidationError(f'A route can have at most {maximum} {label}, got {len(value)}.')
    for point in value:
        validate_point(point)


def validate_point(point: object) -> None:
    """Accept only a [lng, lat] pair of numbers inside the world."""
    if not isinstance(point, list) or len(point) != 2 or not all(_is_number(c) for c in point):
        raise ValidationError(f'Point must be a [lng, lat] pair of numbers, got {point!r}.')
    lng, lat = point
    if abs(lng) > MAX_LONGITUDE:
        raise ValidationError(f'Longitude must be between -{MAX_LONGITUDE} and {MAX_LONGITUDE}, got {lng}.')
    if abs(lat) > MAX_LATITUDE:
        raise ValidationError(f'Latitude must be between -{MAX_LATITUDE} and {MAX_LATITUDE}, got {lat}.')


def _is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)
