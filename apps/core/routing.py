from django.urls import URLPattern

from apps.routes.routing import websocket_urlpatterns as route_websocket_urlpatterns

websocket_urlpatterns: list[URLPattern] = [
    *route_websocket_urlpatterns,
]
