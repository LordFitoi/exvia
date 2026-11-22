from django.db.models import Exists, OuterRef, QuerySet, Subquery
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView

from apps.notifications.models import EventType, InvitationAnswer, NotificationEvent
from apps.notifications.serializers import NotificationSerializer

LIST_LIMIT = 50
AFTER_PARAM = 'after'


class NotificationListView(ListAPIView):
    """Lists the latest notifications addressed to the caller, newest first. `?after=<id>` keeps only the
    ones created after that event, which is how the native app asks for what it has not shown yet."""

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
        after = self._read_after_id()
        if after is not None:
            events = events.filter(id__gt=after)
        return events.order_by('-created_at', '-id')[:LIST_LIMIT]

    def _read_after_id(self) -> int | None:
        raw_after = self.request.query_params.get(AFTER_PARAM)
        if raw_after is None:
            return None
        try:
            return int(raw_after)
        except ValueError as error:
            raise ValidationError({AFTER_PARAM: 'Must be the id of a notification.'}) from error
