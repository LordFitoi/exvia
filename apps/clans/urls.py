from django.urls import path

from apps.clans.views import (
    ClanDetailView,
    ClanInvitationCreateView,
    ClanListCreateView,
    ClanNoticeListCreateView,
    ClanNoticeUpdateView,
    FeedNoticeListView,
    InvitationAcceptView,
    InvitationDeclineView,
    InvitationListView,
)

app_name = 'clans'

urlpatterns = [
    path('', ClanListCreateView.as_view(), name='clan_list'),
    path('notices/', FeedNoticeListView.as_view(), name='feed_notice_list'),
    path('invitations/', InvitationListView.as_view(), name='invitation_list'),
    path('invitations/<int:pk>/', InvitationDeclineView.as_view(), name='invitation_decline'),
    path('invitations/<int:pk>/accept/', InvitationAcceptView.as_view(), name='invitation_accept'),
    path('<int:pk>/', ClanDetailView.as_view(), name='clan_detail'),
    path('<int:pk>/notices/', ClanNoticeListCreateView.as_view(), name='clan_notice_list'),
    path('<int:pk>/notices/<int:notice_pk>/', ClanNoticeUpdateView.as_view(), name='clan_notice_update'),
    path('<int:pk>/invitations/', ClanInvitationCreateView.as_view(), name='clan_invitation_create'),
]
