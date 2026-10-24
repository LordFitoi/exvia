from django.contrib.auth.models import User
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from rest_framework.generics import (
    CreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import Contact, UserProfile, Vehicle
from apps.users.serializers import (
    ContactSerializer,
    ProfileSerializer,
    SharedProfileSerializer,
    SignupSerializer,
    UserBriefSerializer,
    VehicleSerializer,
)

SUGGESTION_LIMIT = 5


class SignupView(CreateAPIView):
    """Registers an inactive user account from a unique username, unique email and password;
    it can log in only once an admin approves it."""

    serializer_class = SignupSerializer
    permission_classes = (AllowAny,)
    authentication_classes = ()


class CurrentUserView(APIView):
    """Returns the identity of the authenticated JWT caller, with whether they can use the admin site."""

    def get(self, request: Request) -> Response:
        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'is_staff': request.user.is_staff,
        })


class UserLookupView(APIView):
    """Finds an active user by exact `username` (query string); an unknown name is 404."""

    def get(self, request: Request) -> Response:
        username = request.query_params.get('username', '').strip()
        user = get_object_or_404(User.objects.select_related('profile'), username=username, is_active=True)
        return Response(UserBriefSerializer(user).data)


class UserSearchView(APIView):
    """Completes a username: up to `SUGGESTION_LIMIT` active users other than the caller whose
    username starts with `q` (query string, case-insensitive), ordered by username.
    A blank `q` suggests nobody."""

    def get(self, request: Request) -> Response:
        prefix = request.query_params.get('q', '').strip()
        if not prefix:
            return Response([])
        users = (
            User.objects.select_related('profile')
            .filter(username__istartswith=prefix, is_active=True)
            .exclude(pk=request.user.pk)
            .order_by('username')[:SUGGESTION_LIMIT]
        )
        return Response(UserBriefSerializer(users, many=True).data)


class ProfileView(RetrieveUpdateAPIView):
    """Returns the caller's profile, or changes its photo, description and blood type
    (JSON, or multipart when a photo is sent)."""

    serializer_class = ProfileSerializer
    parser_classes = (JSONParser, MultiPartParser)

    def get_object(self) -> UserProfile:
        profiles = UserProfile.objects.prefetch_related('emergency_contacts', 'vehicles')
        return get_object_or_404(profiles, user=self.request.user)


class ContactCreateView(CreateAPIView):
    """Adds an emergency contact to the caller's profile."""

    serializer_class = ContactSerializer

    def perform_create(self, serializer: ContactSerializer) -> None:
        serializer.save(profile=self.request.user.profile)


class ContactDetailView(RetrieveUpdateDestroyAPIView):
    """Reads, changes or removes one of the caller's emergency contacts; anyone else's is 404."""

    serializer_class = ContactSerializer

    def get_queryset(self) -> QuerySet[Contact]:
        return Contact.objects.filter(profile__user=self.request.user)


class VehicleCreateView(CreateAPIView):
    """Adds a vehicle to the caller's garage."""

    serializer_class = VehicleSerializer

    def perform_create(self, serializer: VehicleSerializer) -> None:
        serializer.save(profile=self.request.user.profile)


class VehicleDetailView(RetrieveUpdateDestroyAPIView):
    """Reads, changes or removes one of the caller's vehicles; anyone else's is 404."""

    serializer_class = VehicleSerializer

    def get_queryset(self) -> QuerySet[Vehicle]:
        return Vehicle.objects.filter(profile__user=self.request.user)


class SharedProfileView(RetrieveAPIView):
    """The public side of an active user's profile (photo, bio, garage) for any signed-in rider;
    an unknown or inactive username is 404."""

    serializer_class = SharedProfileSerializer

    def get_object(self) -> UserProfile:
        profiles = UserProfile.objects.select_related('user').prefetch_related('vehicles')
        return get_object_or_404(
            profiles, user__username=self.kwargs['username'], user__is_active=True
        )
