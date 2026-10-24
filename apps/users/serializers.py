from typing import Any

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models.fields.files import ImageFieldFile
from rest_framework import serializers

from apps.users.completion import ProfileCompletion, calculate_completion
from apps.users.models import Contact, UserProfile, Vehicle


class SignupSerializer(serializers.ModelSerializer):
    """Validates signup input and creates an inactive user account that an admin must approve."""

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')
        extra_kwargs = {
            'email': {'required': True, 'allow_blank': False},
            'password': {'write_only': True, 'style': {'input_type': 'password'}},
        }

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        candidate = User(username=attrs['username'], email=attrs['email'])
        try:
            validate_password(attrs['password'], user=candidate)
        except DjangoValidationError as e:
            raise serializers.ValidationError({'password': list(e.messages)}) from e
        return attrs

    def create(self, validated_data: dict[str, Any]) -> User:
        return User.objects.create_user(**validated_data, is_active=False)


class UserBriefSerializer(serializers.ModelSerializer):
    """Who a user is, for lists and map bubbles: id, username and the avatar URL (null when none).
    Read `profile` with `select_related` to avoid a query per user."""

    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'avatar')
        read_only_fields = fields

    def get_avatar(self, user: User) -> str | None:
        avatar = user.profile.avatar
        return avatar.url if avatar else None


class RelativeImageField(serializers.ImageField):
    """An image shown as its path under `MEDIA_URL` (null when empty), so it works behind the frontend proxy."""

    def to_representation(self, value: ImageFieldFile) -> str | None:
        return value.url if value else None


class ContactSerializer(serializers.ModelSerializer):
    """An emergency contact of the caller's profile."""

    class Meta:
        model = Contact
        fields = ('id', 'name', 'phone_number', 'relationship')


class VehicleSerializer(serializers.ModelSerializer):
    """A vehicle in the garage of the caller's profile."""

    class Meta:
        model = Vehicle
        fields = ('id', 'brand', 'model', 'year', 'license_plate', 'color')


class ProfileSerializer(serializers.ModelSerializer):
    """The caller's profile with its contacts, vehicles and how complete it is.
    Only `avatar`, `description` and `blood_type` are written here; contacts and vehicles have their own endpoints.
    Read `emergency_contacts` and `vehicles` with `prefetch_related` to avoid a query per list."""

    avatar = RelativeImageField(required=False)
    emergency_contacts = ContactSerializer(many=True, read_only=True)
    vehicles = VehicleSerializer(many=True, read_only=True)
    completion = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ('avatar', 'description', 'blood_type', 'emergency_contacts', 'vehicles', 'completion')

    def get_completion(self, profile: UserProfile) -> ProfileCompletion:
        return calculate_completion(profile)


class SharedVehicleSerializer(serializers.ModelSerializer):
    """A vehicle as other riders see it: no license plate."""

    class Meta:
        model = Vehicle
        fields = ('id', 'brand', 'model', 'year', 'color')
        read_only_fields = fields


class SharedProfileSerializer(serializers.ModelSerializer):
    """A profile as any signed-in rider sees it: who they are, their bio and their garage.
    Blood type, emergency contacts and license plates stay private to the owner.
    Read it with `select_related('user')` and `prefetch_related('vehicles')`."""

    username = serializers.CharField(source='user.username', read_only=True)
    avatar = RelativeImageField(read_only=True)
    vehicles = SharedVehicleSerializer(many=True, read_only=True)

    class Meta:
        model = UserProfile
        fields = ('username', 'avatar', 'description', 'vehicles')
        read_only_fields = fields
