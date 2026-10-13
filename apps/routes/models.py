from collections.abc import Iterable

from django.contrib.auth.models import User
from django.core.validators import MaxLengthValidator
from django.db import models

from apps.core.models import TimeStampedModel
from apps.routes.geometry import calculate_distance_km, calculate_estimated_time
from apps.routes.validators import validate_points

NAME_MAX_LENGTH = 100
DESCRIPTION_MAX_LENGTH = 255


class Route(TimeStampedModel):
    """Path of [lng, lat] points drawn by a user, with derived length and travel time."""

    name = models.CharField(max_length=NAME_MAX_LENGTH)
    description = models.TextField(validators=[MaxLengthValidator(DESCRIPTION_MAX_LENGTH)])
    points = models.JSONField(validators=[validate_points])
    distance = models.FloatField(editable=False, help_text='Kilometres, calculated from points.')
    estimated_time = models.DurationField(
        editable=False, help_text='Calculated from distance at the average speed.'
    )
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='routes')

    def save(self, *args: object, update_fields: Iterable[str] | None = None, **kwargs: object) -> None:
        self.distance = calculate_distance_km(self.points)
        self.estimated_time = calculate_estimated_time(self.distance)
        if update_fields is not None and 'points' in update_fields:
            update_fields = {*update_fields, 'distance', 'estimated_time'}
        super().save(*args, update_fields=update_fields, **kwargs)

    def __str__(self) -> str:
        return self.name
