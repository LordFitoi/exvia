from django.urls import path

from apps.routes.views import RouteDetailView, RouteListCreateView

app_name = 'routes'

urlpatterns = [
    path('', RouteListCreateView.as_view(), name='route_list'),
    path('<int:pk>/', RouteDetailView.as_view(), name='route_detail'),
]
