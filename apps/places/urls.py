from django.urls import path

from apps.places.views import PlaceLocationAllView, PlaceLocationListCreateView

app_name = 'places'

urlpatterns = [
    path('', PlaceLocationListCreateView.as_view(), name='place_list'),
    path('all/', PlaceLocationAllView.as_view(), name='place_all'),
]
