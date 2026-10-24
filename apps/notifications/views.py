from django.db.models import Exists, OuterRef, QuerySet, Subquery
from rest_framework.generics import ListAPIView

from apps.notifications.models import EventType, InvitationAnswer, NotificationEvent
from apps.notifications.serializers import NotificationSerializer

LIST_LIMIT = 50


class NotificationListView(ListAPIView):
    """Lists the latest notifications addressed to the caller, newest first."""

    serializer_class = NotificationSerializer

    def get_queryset(self) -> QuerySet[NotificationEvent]:
        user = self.request.user
        own_answer = InvitationAnswer.objects.filter(event=OuterRef('pk'), user=user)
        newer_invitation = NotificationEvent.objects.filter(
            event_type=EventType.ROUTE_INVITATION, route_group=OuterRef('route_group'), destinations=user,
            id__gt=OuterRef('id'),
        )
        events = NotificationEvent.objects.filter(destinations=user).annotate(
            answer=Subquery(own_answer.values('status')[:1]),
            is_latest_invitation=~Exists(newer_invitation),
        )
        events = events.select_related('author__profile', 'route_group__route', 'scheduled_event__clan')
        return events.order_by('-created_at', '-id')[:LIST_LIMIT]
