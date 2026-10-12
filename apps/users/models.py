from django.contrib.auth.models import User
from django.db import models

from apps.core.models import TimeStampedModel

AVATAR_UPLOAD_DIR = 'avatars/'


class BloodType(models.TextChoices):
    A_POSITIVE = 'A+', 'A+'
    A_NEGATIVE = 'A-', 'A-'
    B_POSITIVE = 'B+', 'B+'
    B_NEGATIVE = 'B-', 'B-'
    AB_POSITIVE = 'AB+', 'AB+'
    AB_NEGATIVE = 'AB-', 'AB-'
    O_POSITIVE = 'O+', 'O+'
    O_NEGATIVE = 'O-', 'O-'


class UserProfile(TimeStampedModel):
    """Personal and medical profile information attached to a user account."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to=AVATAR_UPLOAD_DIR, blank=True)
    description = models.TextField(blank=True)
    blood_type = models.CharField(max_length=3, choices=BloodType.choices, blank=True)

    # Reverse relations, created by the ForeignKeys declared on Contact and Vehicle.
    emergency_contacts: 'models.Manager[Contact]'
    vehicles: 'models.Manager[Vehicle]'

    class Meta:
        verbose_name = 'Profile'
        verbose_name_plural = 'Profiles'

    def __str__(self) -> str:
        return f'Profile of {self.user.username}'


class Contact(TimeStampedModel):
    """Emergency contact of a user profile."""

    profile = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE, related_name='emergency_contacts'
    )
    name = models.CharField(max_length=150)
    phone_number = models.CharField(max_length=32)
    relationship = models.CharField(max_length=64, blank=True)

    def __str__(self) -> str:
        return f'{self.name} ({self.phone_number})'


class Vehicle(TimeStampedModel):
    """Vehicle in a user profile's garage."""

    profile = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE, related_name='vehicles'
    )
    brand = models.CharField(max_length=64)
    model = models.CharField(max_length=64)
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    license_plate = models.CharField(max_length=16, blank=True)
    color = models.CharField(max_length=32, blank=True)

    def __str__(self) -> str:
        return f'{self.brand} {self.model}'
