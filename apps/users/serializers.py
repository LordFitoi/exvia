from typing import Any

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


class SignupSerializer(serializers.ModelSerializer):
    """Validates signup input and creates a new user account."""

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
        return User.objects.create_user(**validated_data)


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
