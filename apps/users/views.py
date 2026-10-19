from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.serializers import SignupSerializer, UserBriefSerializer


class SignupView(CreateAPIView):
    """Creates a new user account from a unique username, unique email and password."""

    serializer_class = SignupSerializer
    permission_classes = (AllowAny,)
    authentication_classes = ()


class CurrentUserView(APIView):
    """Returns the identity of the authenticated JWT caller."""

    def get(self, request: Request) -> Response:
        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
        })


class UserLookupView(APIView):
    """Finds an active user by exact `username` (query string); an unknown name is 404."""

    def get(self, request: Request) -> Response:
        username = request.query_params.get('username', '').strip()
        user = get_object_or_404(User.objects.select_related('profile'), username=username, is_active=True)
        return Response(UserBriefSerializer(user).data)
