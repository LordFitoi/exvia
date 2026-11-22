"""config URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import re

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.decorators.cache import cache_control
from django.views.static import serve

from apps.users.models import AVATAR_UPLOAD_DIR

# An avatar upload always gets a new file name, so a given avatar URL never changes and browsers may keep it.
AVATAR_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/routes/', include('apps.routes.urls')),
    path('api/clans/', include('apps.clans.urls')),
    path('api/places/', include('apps.places.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
]

if settings.DEBUG:
    avatar_pattern = rf'^{re.escape(settings.MEDIA_URL.lstrip("/"))}(?P<path>{re.escape(AVATAR_UPLOAD_DIR)}.*)$'
    urlpatterns += [
        re_path(
            avatar_pattern,
            cache_control(public=True, max_age=AVATAR_MAX_AGE_SECONDS, immutable=True)(serve),
            {'document_root': settings.MEDIA_ROOT},
        ),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
