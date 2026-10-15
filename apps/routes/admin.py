from django.contrib import admin

from apps.routes.models import Route, RouteSummary


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ('name', 'author', 'distance', 'estimated_time', 'created_at')
    search_fields = ('name', 'description', 'author__username')
    readonly_fields = ('distance', 'estimated_time', 'created_at', 'updated_at')
    autocomplete_fields = ('author',)


@admin.register(RouteSummary)
class RouteSummaryAdmin(admin.ModelAdmin):
    list_display = ('route', 'author', 'start_at', 'end_at', 'duration')
    search_fields = ('route__name', 'participants__username')
    readonly_fields = ('duration', 'created_at', 'updated_at')
    autocomplete_fields = ('route', 'author', 'participants')
