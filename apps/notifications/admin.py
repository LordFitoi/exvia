from django.contrib import admin

from apps.notifications.models import NotificationEvent


@admin.register(NotificationEvent)
class NotificationEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'author', 'route_group', 'created_at')
    list_filter = ('event_type',)
    search_fields = ('author__username', 'destinations__username')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('author', 'destinations', 'route_group')
