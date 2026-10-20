from django.urls import URLPattern

from apps.notifications.routing import websocket_urlpatterns as notification_websocket_urlpatterns
from apps.routes.routing import websocket_urlpatterns as route_websocket_urlpatterns

websocket_urlpatterns: list[URLPattern] = [
    *notification_websocket_urlpatterns,
    *route_websocket_urlpatterns,
]
