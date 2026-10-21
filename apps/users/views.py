from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.serializers import SignupSerializer, UserBriefSerializer

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
