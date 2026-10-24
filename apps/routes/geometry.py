from datetime import timedelta
from math import asin, cos, radians, sin, sqrt

EARTH_RADIUS_KM = 6371.0088
AVERAGE_SPEED_KPH = 60
DISTANCE_DECIMALS = 3


def calculate_distance_km(points: list[list[float]]) -> float:
    """Sum the great-circle length of each segment of a [lng, lat] path."""
    total = sum(haversine_km(start, end) for start, end in zip(points, points[1:]))
    return round(total, DISTANCE_DECIMALS)


def calculate_estimated_time(distance_km: float) -> timedelta:
    """Travel time over the distance at the average speed."""
    return timedelta(hours=distance_km / AVERAGE_SPEED_KPH)


def haversine_km(start: list[float], end: list[float]) -> float:
    start_lng, start_lat = map(radians, start)
    end_lng, end_lat = map(radians, end)
    delta_lat = end_lat - start_lat
    delta_lng = end_lng - start_lng
    a = sin(delta_lat / 2) ** 2 + cos(start_lat) * cos(end_lat) * sin(delta_lng / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(a))
