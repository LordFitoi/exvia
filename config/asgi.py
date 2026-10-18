"""
ASGI config for config project.

HTTP goes to Django; WebSocket connections go to the consumers declared in
``apps.core.routing``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Must run before importing anything that touches models or settings.
django_asgi_application = get_asgi_application()

from apps.core.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_application,
    'websocket': AllowedHostsOriginValidator(URLRouter(websocket_urlpatterns)),
})
