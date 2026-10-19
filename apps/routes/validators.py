from django.core.exceptions import ValidationError

MIN_POINTS = 2
MAX_POINTS = 20_000
MAX_WAYPOINTS = 500
MAX_LONGITUDE = 180
MAX_LATITUDE = 90


def validate_points(value: object) -> None:
    """Accept only a list of two to MAX_POINTS [lng, lat] coordinate pairs."""
    _validate_coordinate_list(value, minimum=MIN_POINTS, maximum=MAX_POINTS, label='points')


def validate_waypoints(value: object) -> None:
    """Accept only a list of up to MAX_WAYPOINTS [lng, lat] pairs; it may be empty."""
    _validate_coordinate_list(value, minimum=0, maximum=MAX_WAYPOINTS, label='waypoints')


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
