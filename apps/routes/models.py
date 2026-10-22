import uuid
from collections.abc import Iterable

from django.contrib.auth.models import User
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MaxLengthValidator, MinValueValidator
from django.db import models

from apps.core.models import TimeStampedModel
from apps.routes.geometry import calculate_distance_km, calculate_estimated_time
from apps.routes.group_meta import validate_group_meta
from apps.routes.validators import MAX_WAYPOINTS, validate_points, validate_waypoints

NAME_MAX_LENGTH = 100
DESCRIPTION_MAX_LENGTH = 255
MAX_GROUP_PARTICIPANTS = 10
DESTINATION_NAME_MAX_LENGTH = 255
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


class RouteType(models.TextChoices):
    RIDE = 'ride', 'Ride'
    DESTINATION = 'destination', 'Destination'


class RouteSummary(TimeStampedModel):
    """One ride: when it started and ended, how long it took, and who rode it. A `ride` follows one of
    the saved routes; a `destination` ride went to a searched place and has no route."""

    route_type = models.CharField(max_length=16, choices=RouteType.choices, default=RouteType.RIDE)
    route = models.ForeignKey(
        Route, on_delete=models.CASCADE, null=True, blank=True, related_name='summaries',
        help_text='Empty for a destination ride.',
    )
    destination_name = models.CharField(
        max_length=DESTINATION_NAME_MAX_LENGTH, blank=True, help_text='The place a destination ride went to.',
    )
    distance = models.FloatField(
        null=True, blank=True, validators=[MinValueValidator(0)],
        help_text='Kilometres covered; set for destination rides, which have no route to take the length from.',
    )
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    duration = models.DurationField(editable=False, help_text='Calculated as end_at - start_at.')
    is_finished = models.BooleanField(default=True, help_text='False when the rider quit before the finish.')
    max_speed = models.FloatField(**SPEED_FIELD, help_text='Fastest GPS reading, km/h.')
    reached_at = ArrayField(
        models.DateTimeField(), size=MAX_WAYPOINTS, default=list, blank=True,
        help_text='When the rider reached the start, then each checkpoint, in route order; shorter if the rider did not get to the last ones.',
    )
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
            models.CheckConstraint(
                condition=(
                    models.Q(route_type=RouteType.RIDE, route__isnull=False)
                    | models.Q(route_type=RouteType.DESTINATION, route__isnull=True, distance__isnull=False)
                ),
                name='route_summary_type_matches_route',
            ),
        ]

    def save(self, *args: object, update_fields: Iterable[str] | None = None, **kwargs: object) -> None:
        self.duration = self.end_at - self.start_at
        if update_fields is not None and {'start_at', 'end_at'} & set(update_fields):
            update_fields = {*update_fields, 'duration'}
        super().save(*args, update_fields=update_fields, **kwargs)

    def __str__(self) -> str:
        return f'{self.route or self.destination_name} ({self.start_at:%Y-%m-%d %H:%M})'


class RouteGroup(TimeStampedModel):
    """Riders rolling together, led by the author; the route is optional (none means free mode)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    route = models.ForeignKey(
        Route, on_delete=models.SET_NULL, null=True, blank=True, related_name='groups',
        help_text='Empty for free mode; the author can change it at any moment.',
    )
    participants = models.ManyToManyField(
        User, related_name='route_groups', blank=True,
        help_text='Capped at MAX_GROUP_PARTICIPANTS riders.',
    )
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='authored_route_groups')
    meta_json = models.JSONField(
        default=dict, blank=True, validators=[validate_group_meta],
        help_text='Per-participant status and latest position; the shape is in group_meta.py.',
    )

    class Meta:
        ordering = ('-created_at',)

    def __str__(self) -> str:
        return f'{self.route or "Free ride"} ({self.author})'
