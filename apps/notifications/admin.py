from django.contrib import admin

from apps.notifications.models import InvitationAnswer, NotificationEvent


@admin.register(NotificationEvent)
class NotificationEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'author', 'route_group', 'created_at')
    list_filter = ('event_type',)
    search_fields = ('author__username', 'destinations__username')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('author', 'destinations', 'route_group')


@admin.register(InvitationAnswer)
class InvitationAnswerAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'event', 'created_at')
    list_filter = ('status',)
    search_fields = ('user__username',)
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('event', 'user')
