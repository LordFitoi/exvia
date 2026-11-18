from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import DeviceToken
from apps.notifications.serializers import DeviceTokenSerializer


class DeviceTokenView(APIView):
    """The caller's phones that get pushes. POST registers the token of this install (and moves it to the caller
    if it was another user's); DELETE forgets it, which the app does when the user signs out."""

    def post(self, request: Request) -> Response:
        serializer = DeviceTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        DeviceToken.objects.update_or_create(token=serializer.validated_data['token'], defaults={'user': request.user})
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request: Request) -> Response:
        serializer = DeviceTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        DeviceToken.objects.filter(user=request.user, token=serializer.validated_data['token']).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
