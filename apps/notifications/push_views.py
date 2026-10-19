from django.conf import settings
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import PushSubscription
from apps.notifications.push import is_push_configured
from apps.notifications.push_serializers import PushEndpointSerializer, PushSubscriptionSerializer


class PushKeyView(APIView):
    """The public key a browser needs to subscribe, or null when the server does not send push."""

    def get(self, request: Request) -> Response:
        return Response({'public_key': settings.VAPID_PUBLIC_KEY if is_push_configured() else None})


class PushSubscriptionView(APIView):
    """Registers (POST) or removes (DELETE) the caller's browser for push."""

    def post(self, request: Request) -> Response:
        serializer = PushSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        keys = serializer.validated_data['keys']
        PushSubscription.objects.update_or_create(
            endpoint=serializer.validated_data['endpoint'],
            defaults={'user': request.user, 'p256dh': keys['p256dh'], 'auth': keys['auth']},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request: Request) -> Response:
        serializer = PushEndpointSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        PushSubscription.objects.filter(user=request.user, endpoint=serializer.validated_data['endpoint']).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
