from django.urls import path

from apps.notifications.push_views import PushKeyView, PushSubscriptionView
from apps.notifications.views import NotificationListView

app_name = 'notifications'

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification_list'),
    path('push/key/', PushKeyView.as_view(), name='push_key'),
    path('push/subscriptions/', PushSubscriptionView.as_view(), name='push_subscription'),
]
