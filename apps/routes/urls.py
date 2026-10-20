from django.urls import path

from apps.routes.group_views import (
    GroupAcceptView,
    GroupActiveView,
    GroupCreateView,
    GroupDetailView,
    GroupInviteView,
    GroupLeaveView,
    GroupRejectView,
    GroupRemoveView,
    GroupRouteView,
)
from apps.routes.views import (
    RideSummaryCreateView,
    RideSummaryDetailView,
    RideSummaryListView,
    RouteDetailView,
    RouteListCreateView,
    SharedRouteView,
)

app_name = 'routes'

urlpatterns = [
    path('', RouteListCreateView.as_view(), name='route_list'),
    path('groups/', GroupCreateView.as_view(), name='group_create'),
    path('groups/active/', GroupActiveView.as_view(), name='group_active'),
    path('groups/<uuid:pk>/', GroupDetailView.as_view(), name='group_detail'),
    path('groups/<uuid:pk>/accept/', GroupAcceptView.as_view(), name='group_accept'),
    path('groups/<uuid:pk>/reject/', GroupRejectView.as_view(), name='group_reject'),
    path('groups/<uuid:pk>/invite/', GroupInviteView.as_view(), name='group_invite'),
    path('groups/<uuid:pk>/remove/', GroupRemoveView.as_view(), name='group_remove'),
    path('groups/<uuid:pk>/route/', GroupRouteView.as_view(), name='group_route'),
    path('groups/<uuid:pk>/leave/', GroupLeaveView.as_view(), name='group_leave'),
    path('summaries/', RideSummaryListView.as_view(), name='ride_summary_list'),
    path('summaries/<int:pk>/', RideSummaryDetailView.as_view(), name='ride_summary_detail'),
    path('<uuid:pk>/', RouteDetailView.as_view(), name='route_detail'),
    path('<uuid:pk>/shared/', SharedRouteView.as_view(), name='route_shared'),
    path('<uuid:pk>/summaries/', RideSummaryCreateView.as_view(), name='ride_summary_create'),
]
