from django.urls import path

from apps.routes.views import (
    RideSummaryCreateView,
    RideSummaryDetailView,
    RideSummaryListView,
    RouteDetailView,
    RouteListCreateView,
)

app_name = 'routes'

urlpatterns = [
    path('', RouteListCreateView.as_view(), name='route_list'),
    path('summaries/', RideSummaryListView.as_view(), name='ride_summary_list'),
    path('summaries/<int:pk>/', RideSummaryDetailView.as_view(), name='ride_summary_detail'),
    path('<int:pk>/', RouteDetailView.as_view(), name='route_detail'),
    path('<int:pk>/summaries/', RideSummaryCreateView.as_view(), name='ride_summary_create'),
]
