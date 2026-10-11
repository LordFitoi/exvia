from rest_framework.generics import CreateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.serializers import SignupSerializer


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
