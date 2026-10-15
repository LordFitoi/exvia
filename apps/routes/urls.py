from django.urls import path

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
    path('summaries/', RideSummaryListView.as_view(), name='ride_summary_list'),
    path('summaries/<int:pk>/', RideSummaryDetailView.as_view(), name='ride_summary_detail'),
    path('<uuid:pk>/', RouteDetailView.as_view(), name='route_detail'),
    path('<uuid:pk>/shared/', SharedRouteView.as_view(), name='route_shared'),
    path('<uuid:pk>/summaries/', RideSummaryCreateView.as_view(), name='ride_summary_create'),
]
