from django.contrib.auth.models import User
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import TimeStampedModel

NAME_MAX_LENGTH = 100
CATEGORY_MAX_LENGTH = 32
COORDINATE_MAX_DIGITS = 9
COORDINATE_DECIMAL_PLACES = 6
MAX_LATITUDE = 90
MAX_LONGITUDE = 180


class PlaceCategory(models.TextChoices):
    GAS_STATION = 'gas_station', 'Gas station'
    RESTAURANT = 'restaurant', 'Restaurant'
    CAFE = 'cafe', 'Cafe'
    MECHANIC = 'mechanic', 'Mechanic'
    HOTEL = 'hotel', 'Hotel'
    CAMPING = 'camping', 'Camping'
    VIEWPOINT = 'viewpoint', 'Viewpoint'
    REST_STOP = 'rest_stop', 'Rest stop'
    OTHER = 'other', 'Other'


class PlaceLocation(TimeStampedModel):
    """Favorite place saved by a user, with a category, personal notes and map coordinates."""

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='place_locations')
    name = models.CharField(max_length=NAME_MAX_LENGTH)
    notes = models.TextField(blank=True, help_text='Personal notes, only meaningful to the author.')
    category = models.CharField(
        max_length=CATEGORY_MAX_LENGTH, choices=PlaceCategory.choices, default=PlaceCategory.OTHER,
    )
    lat = models.DecimalField(
        max_digits=COORDINATE_MAX_DIGITS, decimal_places=COORDINATE_DECIMAL_PLACES,
        validators=[MinValueValidator(-MAX_LATITUDE), MaxValueValidator(MAX_LATITUDE)],
    )
    lng = models.DecimalField(
        max_digits=COORDINATE_MAX_DIGITS, decimal_places=COORDINATE_DECIMAL_PLACES,
        validators=[MinValueValidator(-MAX_LONGITUDE), MaxValueValidator(MAX_LONGITUDE)],
    )

    class Meta:
        ordering = ['name']

    def __str__(self) -> str:
        return self.name
