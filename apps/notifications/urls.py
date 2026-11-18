from django.urls import path

from apps.notifications.device_views import DeviceTokenView
from apps.notifications.views import NotificationListView

app_name = 'notifications'

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification_list'),
    path('devices/', DeviceTokenView.as_view(), name='device_token'),
]
