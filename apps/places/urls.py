from django.urls import path

from apps.places.views import PlaceLocationAllView, PlaceLocationDetailView, PlaceLocationListCreateView

app_name = 'places'

urlpatterns = [
    path('', PlaceLocationListCreateView.as_view(), name='place_list'),
    path('all/', PlaceLocationAllView.as_view(), name='place_all'),
    path('<int:pk>/', PlaceLocationDetailView.as_view(), name='place_detail'),
]
