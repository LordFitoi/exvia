from django.urls import URLPattern, path

from apps.notifications.consumers import NotificationConsumer

websocket_urlpatterns: list[URLPattern] = [
    path('ws/notifications/', NotificationConsumer.as_asgi()),
]
