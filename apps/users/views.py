from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


class CurrentUserView(APIView):
    """Returns the identity of the authenticated JWT caller."""

    def get(self, request: Request) -> Response:
        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
        })
