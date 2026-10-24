from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from apps.users.views import (
    ContactCreateView,
    ContactDetailView,
    CurrentUserView,
    ProfileView,
    SharedProfileView,
    SignupView,
    UserLookupView,
    UserSearchView,
    VehicleCreateView,
    VehicleDetailView,
)

app_name = 'users'

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('profile/contacts/', ContactCreateView.as_view(), name='contact_create'),
    path('profile/contacts/<int:pk>/', ContactDetailView.as_view(), name='contact_detail'),
    path('profile/vehicles/', VehicleCreateView.as_view(), name='vehicle_create'),
    path('profile/vehicles/<int:pk>/', VehicleDetailView.as_view(), name='vehicle_detail'),
    path('users/<str:username>/profile/', SharedProfileView.as_view(), name='shared_profile'),
    path('users/lookup/', UserLookupView.as_view(), name='user_lookup'),
    path('users/search/', UserSearchView.as_view(), name='user_search'),
]
