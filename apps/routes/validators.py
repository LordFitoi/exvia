from django.core.exceptions import ValidationError

MIN_POINTS = 2
MAX_POINTS = 20_000
MAX_LONGITUDE = 180
MAX_LATITUDE = 90


def validate_points(value: object) -> None:
    """Accept only a list of two to MAX_POINTS [lng, lat] coordinate pairs."""
    if not isinstance(value, list):
        raise ValidationError(f'Points must be a list of [lng, lat] pairs, got {type(value).__name__}.')
    if len(value) < MIN_POINTS:
        raise ValidationError(f'A route needs at least {MIN_POINTS} points, got {len(value)}.')
    if len(value) > MAX_POINTS:
        raise ValidationError(f'A route can have at most {MAX_POINTS} points, got {len(value)}.')
    for point in value:
        _validate_point(point)


def _validate_point(point: object) -> None:
    if not isinstance(point, list) or len(point) != 2 or not all(_is_number(c) for c in point):
        raise ValidationError(f'Point must be a [lng, lat] pair of numbers, got {point!r}.')
    lng, lat = point
    if abs(lng) > MAX_LONGITUDE:
        raise ValidationError(f'Longitude must be between -{MAX_LONGITUDE} and {MAX_LONGITUDE}, got {lng}.')
    if abs(lat) > MAX_LATITUDE:
        raise ValidationError(f'Latitude must be between -{MAX_LATITUDE} and {MAX_LATITUDE}, got {lat}.')


def _is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)
