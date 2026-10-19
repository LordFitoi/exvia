from django.db.models import QuerySet
from rest_framework.generics import ListAPIView

from apps.notifications.models import NotificationEvent
from apps.notifications.serializers import NotificationSerializer

LIST_LIMIT = 50


class NotificationListView(ListAPIView):
    """Lists the latest notifications addressed to the caller, newest first."""

    serializer_class = NotificationSerializer

    def get_queryset(self) -> QuerySet[NotificationEvent]:
        events = NotificationEvent.objects.filter(destinations=self.request.user)
        events = events.select_related('author__profile', 'route_group__route')
        return events.order_by('-created_at', '-id')[:LIST_LIMIT]
