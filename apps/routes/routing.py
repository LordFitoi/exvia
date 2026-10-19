from django.urls import URLPattern, path

from apps.routes.consumers import RouteGroupConsumer

websocket_urlpatterns: list[URLPattern] = [
    path('ws/routes/groups/<uuid:group_id>/', RouteGroupConsumer.as_asgi()),
]
