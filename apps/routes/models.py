import uuid
from collections.abc import Iterable

from django.contrib.auth.models import User
from django.core.validators import MaxLengthValidator, MinValueValidator
from django.db import models

from apps.core.models import TimeStampedModel
from apps.routes.geometry import calculate_distance_km, calculate_estimated_time
from apps.routes.validators import validate_points, validate_waypoints

NAME_MAX_LENGTH = 100
DESCRIPTION_MAX_LENGTH = 255
SPEED_FIELD = {'null': True, 'blank': True, 'validators': [MinValueValidator(0)]}


class Route(TimeStampedModel):
    """Street path of [lng, lat] points drawn by a user, with derived length and travel time."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=NAME_MAX_LENGTH)
    description = models.TextField(blank=True, validators=[MaxLengthValidator(DESCRIPTION_MAX_LENGTH)])
    points = models.JSONField(validators=[validate_points])
    waypoints = models.JSONField(
        default=list, blank=True, validators=[validate_waypoints],
        help_text='The points the rider chose, in order; `points` is the street path through them.',
    )
    distance = models.FloatField(editable=False, help_text='Kilometres, calculated from points.')
    estimated_time = models.DurationField(
        editable=False, help_text='Calculated from distance at the average speed.'
    )
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='routes')

    class Meta:
        ordering = ('-created_at',)

    def save(self, *args: object, update_fields: Iterable[str] | None = None, **kwargs: object) -> None:
        self.distance = calculate_distance_km(self.points)
        self.estimated_time = calculate_estimated_time(self.distance)
        if update_fields is not None and 'points' in update_fields:
            update_fields = {*update_fields, 'distance', 'estimated_time'}
        super().save(*args, update_fields=update_fields, **kwargs)

    def __str__(self) -> str:
        return self.name


class RouteSummary(TimeStampedModel):
    """One ride of a route: when it started and ended, how long it took, and who rode it."""

    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='summaries')
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    duration = models.DurationField(editable=False, help_text='Calculated as end_at - start_at.')
    is_finished = models.BooleanField(default=True, help_text='False when the rider quit before the finish.')
    max_speed = models.FloatField(**SPEED_FIELD, help_text='Fastest GPS reading, km/h.')
    min_speed = models.FloatField(**SPEED_FIELD, help_text='Slowest GPS reading while moving, km/h.')
    avg_speed = models.FloatField(**SPEED_FIELD, help_text='Mean of the GPS readings while moving, km/h.')
    participants = models.ManyToManyField(User, related_name='route_summaries', blank=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='authored_route_summaries')

    class Meta:
        ordering = ('-start_at',)
        verbose_name_plural = 'route summaries'
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_at__gt=models.F('start_at')),
                name='route_summary_end_after_start',
            ),
        ]

    def save(self, *args: object, update_fields: Iterable[str] | None = None, **kwargs: object) -> None:
        self.duration = self.end_at - self.start_at
        if update_fields is not None and {'start_at', 'end_at'} & set(update_fields):
            update_fields = {*update_fields, 'duration'}
        super().save(*args, update_fields=update_fields, **kwargs)

    def __str__(self) -> str:
        return f'{self.route} ({self.start_at:%Y-%m-%d %H:%M})'
