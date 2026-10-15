from django.contrib import admin

from apps.clans.models import ClanGroup, ClanInvitation, ClanNotice, ClanRide


class ClanRideInline(admin.TabularInline):
    model = ClanRide
    extra = 0
    fields = ('title', 'event_type', 'schedule_at', 'meet_at')
    show_change_link = True


@admin.register(ClanGroup)
class ClanGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'created_at', 'updated_at')
    search_fields = ('name', 'description', 'owner__username')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('owner',)
    filter_horizontal = ('users',)
    inlines = (ClanRideInline,)


@admin.register(ClanRide)
class ClanRideAdmin(admin.ModelAdmin):
    list_display = ('title', 'clan', 'event_type', 'schedule_at', 'meet_at')
    list_filter = ('event_type', 'clan')
    search_fields = ('title', 'description', 'meet_at', 'clan__name')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('clan',)
    date_hierarchy = 'schedule_at'


@admin.register(ClanNotice)
class ClanNoticeAdmin(admin.ModelAdmin):
    list_display = ('title', 'clan', 'author', 'ride', 'created_at')
    list_filter = ('clan',)
    search_fields = ('title', 'description', 'author__username', 'clan__name')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('clan', 'author', 'ride')


@admin.register(ClanInvitation)
class ClanInvitationAdmin(admin.ModelAdmin):
    list_display = ('invitee', 'clan', 'invited_by', 'created_at')
    list_filter = ('clan',)
    search_fields = ('invitee__username', 'invited_by__username', 'clan__name')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('clan', 'invited_by', 'invitee')
