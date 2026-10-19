from urllib.parse import urlparse

from rest_framework import serializers

from apps.notifications.models import AUTH_SECRET_MAX_LENGTH, ENDPOINT_MAX_LENGTH, P256DH_MAX_LENGTH

# The push services of the browsers. The server posts to the endpoint a client sends, so only these
# hosts are accepted: anything else would let a client make the server call any address.
PUSH_SERVICE_HOST_SUFFIXES = (
    'googleapis.com', 'mozilla.com', 'windows.com', 'apple.com',
)
UNSUPPORTED_ENDPOINT_MESSAGE = 'This is not the address of a known push service.'


def validate_push_endpoint(endpoint: str) -> str:
    parsed = urlparse(endpoint)
    host = parsed.hostname or ''
    is_known_service = any(host == suffix or host.endswith(f'.{suffix}') for suffix in PUSH_SERVICE_HOST_SUFFIXES)
    if parsed.scheme != 'https' or not is_known_service:
        raise serializers.ValidationError(UNSUPPORTED_ENDPOINT_MESSAGE)
    return endpoint


class PushKeysSerializer(serializers.Serializer):
    p256dh = serializers.CharField(max_length=P256DH_MAX_LENGTH)
    auth = serializers.CharField(max_length=AUTH_SECRET_MAX_LENGTH)


class PushSubscriptionSerializer(serializers.Serializer):
    """A browser's `PushSubscription.toJSON()`."""

    endpoint = serializers.CharField(max_length=ENDPOINT_MAX_LENGTH, validators=[validate_push_endpoint])
    keys = PushKeysSerializer()


class PushEndpointSerializer(serializers.Serializer):
    endpoint = serializers.CharField(max_length=ENDPOINT_MAX_LENGTH)
