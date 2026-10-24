from django.contrib import admin

from apps.clans.models import ClanGroup, ClanInvitation, ClanNotice, ScheduledEvent


class ScheduledEventInline(admin.TabularInline):
    model = ScheduledEvent
    extra = 0
    fields = ('title', 'scheduled_at', 'status')
    readonly_fields = ('status',)
    show_change_link = True


@admin.register(ClanGroup)
class ClanGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'created_at', 'updated_at')
    search_fields = ('name', 'description', 'owner__username')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('owner',)
    filter_horizontal = ('users',)
    inlines = (ScheduledEventInline,)


@admin.register(ScheduledEvent)
class ScheduledEventAdmin(admin.ModelAdmin):
    list_display = ('title', 'clan', 'status', 'scheduled_at')
    list_filter = ('status', 'clan')
    search_fields = ('title', 'description', 'clan__name')
    readonly_fields = ('status', 'started_at', 'route_group', 'created_at', 'updated_at')
    autocomplete_fields = ('clan', 'created_by', 'route')
    date_hierarchy = 'scheduled_at'


@admin.register(ClanNotice)
class ClanNoticeAdmin(admin.ModelAdmin):
    list_display = ('title', 'clan', 'author', 'event', 'created_at')
    list_filter = ('clan',)
    search_fields = ('title', 'description', 'author__username', 'clan__name')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('clan', 'author', 'event', 'route')


@admin.register(ClanInvitation)
class ClanInvitationAdmin(admin.ModelAdmin):
    list_display = ('invitee', 'clan', 'invited_by', 'created_at')
    list_filter = ('clan',)
    search_fields = ('invitee__username', 'invited_by__username', 'clan__name')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('clan', 'invited_by', 'invitee')
